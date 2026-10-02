import { existsSync, lstatSync } from "node:fs"
import { createHash } from "node:crypto"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { basename, dirname, join } from "node:path"

import { canary } from "@/lib/canary/canary"
import { archiveKeyName, listCanaryArchives } from "@/lib/canary/canary-history"
import {
  assertValidPriorFingerprints,
  patchCanarySource,
  priorFingerprintsFromCanarySource,
} from "@/lib/renew/canary-module"
import { buildCanaryPlaintext } from "@/lib/renew/canary-text"
import {
  cardSigningKey,
  clearsignWithCard,
  exportPublicKey,
  type Logger,
} from "@/lib/renew/gpg-card"
import {
  addIsoDays,
  formatLongDateTime,
  MS_PER_DAY,
  nowIsoUtc,
} from "@/lib/iso-date"
import {
  buildEmailSignatureHtml,
  buildEmailSignatureText,
  emailSignatureHtmlPath,
  emailSignatureTextPath,
} from "@/lib/publish/email-signature"
import { buildLlmsTxt } from "@/lib/publish/llms-txt"
import {
  buildSecurityPolicy,
  securityPolicyHref,
} from "@/lib/publish/security-policy"
import { buildSecurityTxt } from "@/lib/publish/security-txt"
import { fetchLatestBlock } from "@/lib/renew/monero"
import {
  algorithmFromPublicKey,
  binaryFromPublicKey,
  fingerprintFromPublicKey,
  primaryUserIdFromPublicKey,
  verifiedClearsigned,
} from "@/lib/openpgp-armor"
import { buildRenewByBadge, patchReadmeBadge } from "@/lib/publish/readme-badge"
import {
  buildReadmeProofDate,
  patchReadmeProofDate,
} from "@/lib/publish/readme-proof-date"
import { buildWkdPolicy, wkdKeyHref, wkdPolicyHref } from "@/lib/publish/wkd"
import { maxRenewDays } from "@/lib/renew/renew-days"

export type RenewOptions = {
  readonly days: number
  readonly dryRun: boolean
  readonly rotate: boolean
  readonly logger?: Logger
}

export type RenewDeps = {
  readonly root: string
  readonly logger?: Logger
  readonly sleep: (milliseconds: number) => Promise<void>
  readonly fetchLatestBlock: typeof fetchLatestBlock
  readonly cardSigningKey: typeof cardSigningKey
  readonly exportPublicKey: typeof exportPublicKey
  readonly clearsignWithCard: typeof clearsignWithCard
  readonly verifyClearsigned: typeof verifiedClearsigned
  readonly fingerprintFromPublicKey: typeof fingerprintFromPublicKey
  readonly algorithmFromPublicKey: typeof algorithmFromPublicKey
  readonly binaryFromPublicKey: typeof binaryFromPublicKey
  readonly primaryUserIdFromPublicKey: typeof primaryUserIdFromPublicKey
}

type PendingWrite = {
  readonly path: string
  readonly data: string | Uint8Array
}

type OutputPaths = {
  readonly archiveStatement: string
  readonly archiveKey: string
  readonly publicKey: string
  readonly statement: string
  readonly securityTxt: string
  readonly securityPolicy: string
  readonly wkdKey: string
  readonly wkdPolicy: string
  readonly llmsTxt: string
  readonly signatureText: string
  readonly signatureHtml: string
  readonly readme: string
  readonly canaryModule: string
}

const signingLatencyBudgetSeconds = 20
const stagedSuffix = ".tmp"
const backupSuffix = ".prev"

function outputPaths(root: string): OutputPaths {
  const archiveDir = join(root, "public/canary")

  return {
    archiveStatement: join(archiveDir, `${canary.signedOn}.asc`),
    archiveKey: join(archiveDir, archiveKeyName(canary.signedOn)),
    publicKey: join(root, "public/fiona.asc"),
    statement: join(root, "public/canary.asc"),
    securityTxt: join(root, "public/.well-known/security.txt"),
    securityPolicy: join(root, `public${securityPolicyHref}`),
    wkdKey: join(root, `public${wkdKeyHref(canary.email)}`),
    wkdPolicy: join(root, `public${wkdPolicyHref}`),
    llmsTxt: join(root, "public/llms.txt"),
    signatureText: join(root, emailSignatureTextPath),
    signatureHtml: join(root, emailSignatureHtmlPath),
    readme: join(root, "README.md"),
    canaryModule: join(root, "lib/canary/canary.ts"),
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return typeof error === "string" ? error : "unknown error"
}

async function sleepMilliseconds(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

async function waitOutLateMinute(deps: RenewDeps): Promise<void> {
  const now = Date.now()
  const remainingMilliseconds = 60_000 - (now % 60_000)
  if (remainingMilliseconds > signingLatencyBudgetSeconds * 1000) {
    return
  }

  deps.logger?.info(
    `Pausing ${Math.round(remainingMilliseconds / 1000)}s for the next UTC minute\u2026`
  )
  deps.logger?.info(
    "  gpg stamps the signature a few seconds after the statement is built,"
  )
  deps.logger?.info(
    "  and a stamp in the next minute would abort the renewal after your touch."
  )
  deps.logger?.info(
    "  The card has not been asked for anything yet; the PIN prompt comes after this."
  )
  await deps.sleep(remainingMilliseconds)
}

const productionDeps: RenewDeps = {
  root: process.cwd(),
  sleep: sleepMilliseconds,
  fetchLatestBlock,
  cardSigningKey,
  exportPublicKey,
  clearsignWithCard,
  verifyClearsigned: verifiedClearsigned,
  fingerprintFromPublicKey,
  algorithmFromPublicKey,
  binaryFromPublicKey,
  primaryUserIdFromPublicKey,
}

export async function renewCanary(
  options: RenewOptions,
  deps: RenewDeps = productionDeps
): Promise<string> {
  const log = options.logger

  if (
    !Number.isSafeInteger(options.days) ||
    options.days < 1 ||
    options.days > maxRenewDays
  ) {
    throw new Error(
      `Days must be a whole number from 1 to ${String(maxRenewDays)}, not ${String(options.days)}. Nothing has been signed.`
    )
  }

  const paths = outputPaths(deps.root)
  const checkedAt = nowIsoUtc()
  const outgoingStatement = existsSync(paths.statement)
    ? await readFile(paths.statement, "utf8")
    : undefined
  const previousStatementHash =
    outgoingStatement === undefined
      ? undefined
      : createHash("sha256").update(outgoingStatement, "utf8").digest("hex")

  log?.info("Fetching the latest Monero block\u2026")
  const block = await deps.fetchLatestBlock(checkedAt)
  assertMoneroAdvance(block.height, checkedAt)

  if (options.dryRun) {
    return buildStatement(checkedAt, options.days, block, previousStatementHash)
      .plaintext
  }

  log?.info("Checking canary archives\u2026")
  const archiveDir = join(deps.root, "public/canary")
  assertArchivesReadable(archiveDir)
  assertNoStrandedBackups(paths)
  const archive = await planArchive(paths)
  await assertArchivable(archive)

  const canaryModuleSource = await readFile(paths.canaryModule, "utf8")
  const existingPriorFingerprints = priorFingerprintsFromCanarySource(
    canaryModuleSource,
    canary.fingerprint
  )

  await waitOutLateMinute(deps)

  log?.info("Reading the signing key from the YubiKey\u2026")
  const key = await deps.cardSigningKey(log)
  log?.info("Exporting the public key\u2026")
  const publicKey = await deps.exportPublicKey(key)
  const fingerprint = await deps.fingerprintFromPublicKey(publicKey)
  assertKeyContinuity(fingerprint, options.rotate)
  await assertKeyIdentity(publicKey, deps)
  const priorFingerprints =
    fingerprint === canary.fingerprint
      ? existingPriorFingerprints
      : [...existingPriorFingerprints, canary.fingerprint]
  assertValidPriorFingerprints(priorFingerprints, fingerprint)

  log?.info("Rehearsing outputs against provisional values\u2026")
  const rehearsed = await rehearseOutputs(
    {
      paths,
      publicKey,
      fingerprint,
      priorFingerprints,
      canaryModuleSource,
      days: options.days,
      moneroBlockHeight: block.height,
      moneroBlockHash: block.hash.toLowerCase(),
      ...(previousStatementHash === undefined ? {} : { previousStatementHash }),
    },
    deps
  )

  log?.info("Building the canary statement\u2026")
  const statement = buildStatement(
    nowIsoUtc(),
    options.days,
    block,
    previousStatementHash
  )

  log?.info("Clearsigning the canary statement\u2026")
  const signedStatement = await deps.clearsignWithCard(
    statement.plaintext,
    key,
    "public/canary.asc",
    log
  )
  const statementVerification = await deps.verifyClearsigned(
    signedStatement,
    publicKey
  )
  const recordedSignedAt = statementVerification.signatureCreatedAt
  if (
    formatLongDateTime(recordedSignedAt) !==
    formatLongDateTime(statement.signedAt)
  ) {
    throw new Error(
      [
        `public/canary.asc signature creation time ${recordedSignedAt} is outside the signed minute ${statement.signedAt}.`,
        "  Nothing was written and the security.txt touch was not requested.",
        "  Re-run the renewal.",
      ].join("\n")
    )
  }

  const recordedSignedOn = recordedSignedAt.slice(0, 10)

  log?.info("Clearsigning security.txt\u2026")
  const securityTxt = await deps.clearsignWithCard(
    buildSecurityTxt({
      email: canary.email,
      fingerprint,
      siteOrigin: canary.siteOrigin,
      publicKeyHref: canary.publicKeyHref,
      expires: statement.renewBy,
      policyUrl: `${canary.siteOrigin}${securityPolicyHref}`,
    }),
    key,
    "public/.well-known/security.txt",
    log
  )
  await deps.verifyClearsigned(securityTxt, publicKey)

  log?.info("Writing all output files\u2026")
  await writeCanaryFiles({
    paths,
    rehearsed,
    publicKey,
    signedStatement,
    securityTxt,
    fingerprint,
    priorFingerprints,
    signedOn: recordedSignedOn,
    signedAt: recordedSignedAt,
    renewBy: statement.renewBy,
    moneroBlockHeight: block.height,
    moneroBlockHash: block.hash.toLowerCase(),
    ...(previousStatementHash === undefined ? {} : { previousStatementHash }),
    archive,
  })

  const archiveLine =
    archive.length === 0
      ? "nothing archived; this is the first statement of a fresh chain"
      : `Archived public/canary/${canary.signedOn}.asc and ${archiveKeyName(canary.signedOn)}`

  return [
    "Wrote public/fiona.asc",
    "Wrote public/canary.asc",
    "Wrote public/.well-known/security.txt (clearsigned)",
    `Wrote public${securityPolicyHref}`,
    `Wrote public${wkdKeyHref(canary.email)} (binary, WKD)`,
    `Wrote public${wkdPolicyHref}`,
    "Wrote public/llms.txt",
    `Wrote ${emailSignatureTextPath}`,
    `Wrote ${emailSignatureHtmlPath}`,
    archiveLine,
    "Updated lib/canary/canary.ts",
    "Updated README.md (renew-by badge and proof-of-date example)",
    `Fingerprint ${fingerprint}`,
    fingerprint === canary.fingerprint
      ? "Key unchanged"
      : `Key rotated from ${canary.fingerprint}`,
    `signedAt ${recordedSignedAt} renewBy ${statement.renewBy}`,
    `Monero ${block.height} ${block.hash.toLowerCase()}`,
    "Run: bun run lint && bun run typecheck && bun run test && bun run test:e2e",
    "",
  ].join("\n")
}

type PendingStatement = {
  readonly signedAt: string
  readonly renewBy: string
  readonly plaintext: string
}

function buildStatement(
  signedAt: string,
  days: number,
  block: { readonly height: number; readonly hash: string },
  previousStatementHash: string | undefined
): PendingStatement {
  const renewBy = addIsoDays(signedAt.slice(0, 10), days)

  return {
    signedAt,
    renewBy,
    plaintext: buildCanaryPlaintext({
      name: canary.name,
      email: canary.email,
      signedAt,
      renewBy,
      moneroBlockHeight: block.height,
      moneroBlockHash: block.hash.toLowerCase(),
      ...(previousStatementHash === undefined ? {} : { previousStatementHash }),
    }),
  }
}

type RehearsedOutputs = {
  readonly algorithm: string
  readonly wkdKey: Uint8Array
  readonly readmeSource: string
}

async function rehearseOutputs(
  input: {
    readonly paths: OutputPaths
    readonly publicKey: string
    readonly fingerprint: string
    readonly priorFingerprints: readonly string[]
    readonly canaryModuleSource: string
    readonly days: number
    readonly moneroBlockHeight: number
    readonly moneroBlockHash: string
    readonly previousStatementHash?: string
  },
  deps: RenewDeps
): Promise<RehearsedOutputs> {
  try {
    const algorithm = await deps.algorithmFromPublicKey(input.publicKey)
    const wkdKey = await deps.binaryFromPublicKey(input.publicKey)
    const readmeSource = await readFile(input.paths.readme, {
      encoding: "utf8",
    })

    const signedAt = nowIsoUtc()
    const signedOn = signedAt.slice(0, 10)
    const renewBy = addIsoDays(signedOn, input.days)

    patchReadmeBadge(
      readmeSource,
      buildRenewByBadge({
        renewBy,
        siteOrigin: canary.siteOrigin,
        statementHref: canary.statementHref,
      })
    )
    patchReadmeProofDate(
      readmeSource,
      buildReadmeProofDate({
        moneroBlockHeight: input.moneroBlockHeight,
        moneroBlockHash: input.moneroBlockHash,
      })
    )
    patchCanarySource(input.canaryModuleSource, {
      fingerprint: input.fingerprint,
      priorFingerprints: input.priorFingerprints,
      algorithm,
      signedOn,
      signedAt,
      renewBy,
      moneroBlockHeight: input.moneroBlockHeight,
      moneroBlockHash: input.moneroBlockHash,
      previousStatementHash: input.previousStatementHash ?? null,
    })

    return { algorithm, wkdKey, readmeSource }
  } catch (error) {
    throw new Error(
      [
        `Renewal aborted before the first touch: ${errorMessage(error)}`,
        "  Every output file was rehearsed against provisional values first, so this",
        "  would have failed after both touches; the card was not asked to sign anything.",
        "  Fix the file above and re-run renew.",
      ].join("\n"),
      { cause: error }
    )
  }
}

function assertMoneroAdvance(height: number, checkedAt: string): void {
  if (height <= canary.moneroBlockHeight) {
    throw new Error(
      `Monero block height ${height} does not advance published height ${canary.moneroBlockHeight}`
    )
  }

  const elapsedDays = Math.max(
    1,
    (Date.parse(checkedAt) - Date.parse(canary.signedAt)) / MS_PER_DAY
  )
  const maximumAdvance = Math.ceil(elapsedDays * 900 + 120)
  if (height - canary.moneroBlockHeight > maximumAdvance) {
    throw new Error(
      `Monero block advance ${height - canary.moneroBlockHeight} is implausible for ${elapsedDays.toFixed(1)} days`
    )
  }
}

function assertKeyContinuity(fingerprint: string, rotate: boolean): void {
  if (fingerprint === canary.fingerprint || rotate) {
    return
  }

  throw new Error(
    [
      "The signing key does not match the published canary.",
      `  Published ${canary.fingerprint}`,
      `  Signing   ${fingerprint}`,
      "If this rotation is deliberate, re-run with --rotate.",
    ].join("\n")
  )
}

async function assertKeyIdentity(
  publicKey: string,
  deps: RenewDeps
): Promise<void> {
  const expected = `${canary.name} <${canary.email}>`
  const primaryUserId = await deps.primaryUserIdFromPublicKey(publicKey)
  if (primaryUserId === expected) {
    return
  }

  throw new Error(
    [
      "The signing key does not certify the canary identity.",
      `  Expected ${expected}`,
      `  Card key ${primaryUserId}`,
      "  Only the canary key may sign canary content, and this is not it.",
      "  Insert the canary card and re-run renew; the card was not asked to sign anything.",
    ].join("\n")
  )
}

function assertArchivesReadable(archiveDir: string): void {
  listCanaryArchives(archiveDir)
}

function assertNoStrandedBackups(paths: OutputPaths): void {
  const stranded = Object.values(paths)
    .map((path) => `${path}${backupSuffix}`)
    .filter((path) => existsSync(path))

  if (stranded.length === 0) {
    return
  }

  throw new Error(
    [
      "A previous renewal left the original of a file it was replacing beside it:",
      ...stranded.map((path) => `  ${path}`),
      "  It either could not put the original back or could not clean up after itself.",
      `  Compare each file with its ${backupSuffix} copy, keep the one you want, delete the`,
      `  ${backupSuffix} copy, then re-run renew.`,
      `  Renewal will not start while a ${backupSuffix} copy is present, because replacing`,
      "  the file again would overwrite the only remaining copy of the original.",
      "  The card was not asked for anything.",
    ].join("\n")
  )
}

async function planArchive(
  paths: OutputPaths
): Promise<readonly PendingWrite[]> {
  const statement = await readOptionalFile(paths.statement)
  if (statement === undefined) {
    return []
  }

  const publicKey = await readFile(paths.publicKey, "utf8")

  return [
    { path: paths.archiveStatement, data: statement },
    { path: paths.archiveKey, data: publicKey },
  ]
}

async function readOptionalFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    if (isEnoent(error)) {
      return undefined
    }

    throw error
  }
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  )
}

async function assertArchivable(
  archive: readonly PendingWrite[]
): Promise<void> {
  for (const write of archive) {
    if (!existsSync(write.path)) {
      continue
    }

    const existing = await readFile(write.path, "utf8")
    if (existing !== write.data) {
      const name = basename(write.path)
      throw new Error(
        [
          `public/canary/${name} already holds different content; refusing to overwrite archived history.`,
          `  It differs from the file this run would archive there, and lib/canary/canary.ts still`,
          `  names ${canary.signedOn} as the published statement.`,
          "  Either the archived file was edited, or a renewal replaced public/canary.asc",
          "  without lib/canary/canary.ts following it.",
          `  Compare the two, put the ${canary.signedOn} pair back under public/canary/,`,
          "  then re-run renew.",
        ].join("\n")
      )
    }
  }
}

async function discardStaged(paths: readonly string[]): Promise<void> {
  for (const path of paths) {
    await rm(path, { force: true })
  }
}

async function discardBackups(paths: readonly string[]): Promise<void> {
  for (const path of paths) {
    await rm(path, { force: true })
  }
}

type Displaced = {
  readonly path: string
  readonly backupPath: string | undefined
}

async function rollbackDisplaced(
  displaced: readonly Displaced[]
): Promise<readonly Displaced[]> {
  const stranded: Displaced[] = []

  for (const entry of [...displaced].reverse()) {
    try {
      if (entry.backupPath === undefined) {
        await rm(entry.path, { force: true })
      } else {
        await rename(entry.backupPath, entry.path)
      }
    } catch {
      stranded.push(entry)
    }
  }

  return stranded
}

function failedCommitError(
  failedPath: string,
  displaced: readonly Displaced[],
  stranded: readonly Displaced[],
  cause: unknown
): Error {
  const restored = displaced
    .filter((entry) => !stranded.includes(entry))
    .map((entry) => entry.path)

  if (stranded.length === 0) {
    return new Error(
      [
        `Renewal failed while replacing ${failedPath}.`,
        restored.length === 0
          ? "  No file had been replaced yet."
          : `  Rolled back to what it held before the run: ${restored.join(", ")}`,
        "  Nothing is half-published and the staged files were discarded.",
        `  Fix ${failedPath} and re-run renew; the touches this run spent are gone.`,
      ].join("\n"),
      { cause }
    )
  }

  return new Error(
    [
      `Renewal failed while replacing ${failedPath}, and the rollback could not finish.`,
      "  These files still hold what this run wrote:",
      ...stranded.map((entry) =>
        entry.backupPath === undefined
          ? `    ${entry.path} (nothing was there before the run)`
          : `    ${entry.path} (its original is at ${entry.backupPath})`
      ),
      restored.length === 0
        ? "  No other file was replaced."
        : `  Every other replaced file was put back: ${restored.join(", ")}`,
      `  Restore each file above from its ${backupSuffix} copy, or delete that copy if the`,
      "  new file is the one you want, then re-run renew.",
      `  Renewal refuses to start while a ${backupSuffix} copy remains.`,
    ].join("\n"),
    { cause }
  )
}

async function abortCommit(
  failedPath: string,
  displaced: readonly Displaced[],
  staged: readonly string[],
  cause: unknown
): Promise<Error> {
  const stranded = await rollbackDisplaced(displaced)
  await discardStaged(staged)
  return failedCommitError(failedPath, displaced, stranded, cause)
}

async function commitWrites(writes: readonly PendingWrite[]): Promise<void> {
  const staged: string[] = []

  try {
    for (const write of writes) {
      await mkdir(dirname(write.path), { recursive: true })
      const stagedPath = `${write.path}${stagedSuffix}`
      await writeFile(stagedPath, write.data)
      staged.push(stagedPath)
    }
  } catch (error) {
    await discardStaged(staged)
    throw error
  }

  const displaced: Displaced[] = []

  for (const write of writes) {
    const existing = lstatSync(write.path, { throwIfNoEntry: false })
    const backupPath =
      existing !== undefined && !existing.isDirectory()
        ? `${write.path}${backupSuffix}`
        : undefined

    if (backupPath !== undefined) {
      try {
        await rename(write.path, backupPath)
      } catch (error) {
        throw await abortCommit(write.path, displaced, staged, error)
      }
      displaced.push({ path: write.path, backupPath })
    }

    try {
      await rename(`${write.path}${stagedSuffix}`, write.path)
    } catch (error) {
      throw await abortCommit(write.path, displaced, staged, error)
    }

    if (backupPath === undefined) {
      displaced.push({ path: write.path, backupPath: undefined })
    }
  }

  await discardBackups(
    displaced
      .map((entry) => entry.backupPath)
      .filter((path) => path !== undefined)
  )
}

function archiveHrefs(
  archiveDir: string,
  archive: readonly PendingWrite[]
): string[] {
  const hrefs = listCanaryArchives(archiveDir).map((entry) => entry.href)
  const pending = archive[0]?.path

  if (
    pending !== undefined &&
    !hrefs.includes(`/canary/${basename(pending)}`)
  ) {
    hrefs.push(`/canary/${basename(pending)}`)
  }

  return hrefs.sort((left, right) => right.localeCompare(left))
}

async function writeCanaryFiles(fields: {
  readonly paths: OutputPaths
  readonly rehearsed: RehearsedOutputs
  readonly publicKey: string
  readonly signedStatement: string
  readonly securityTxt: string
  readonly fingerprint: string
  readonly priorFingerprints: readonly string[]
  readonly signedOn: string
  readonly signedAt: string
  readonly renewBy: string
  readonly moneroBlockHeight: number
  readonly moneroBlockHash: string
  readonly previousStatementHash?: string
  readonly archive: readonly PendingWrite[]
}): Promise<void> {
  const paths = fields.paths
  const archiveDir = dirname(paths.archiveStatement)
  const algorithm = fields.rehearsed.algorithm

  await assertArchivable(fields.archive)

  const readme = patchReadmeProofDate(
    patchReadmeBadge(
      fields.rehearsed.readmeSource,
      buildRenewByBadge({
        renewBy: fields.renewBy,
        siteOrigin: canary.siteOrigin,
        statementHref: canary.statementHref,
      })
    ),
    buildReadmeProofDate({
      moneroBlockHeight: fields.moneroBlockHeight,
      moneroBlockHash: fields.moneroBlockHash,
    })
  )

  const source = patchCanarySource(
    await readFile(paths.canaryModule, { encoding: "utf8" }),
    {
      fingerprint: fields.fingerprint,
      priorFingerprints: fields.priorFingerprints,
      algorithm,
      signedOn: fields.signedOn,
      signedAt: fields.signedAt,
      renewBy: fields.renewBy,
      moneroBlockHeight: fields.moneroBlockHeight,
      moneroBlockHash: fields.moneroBlockHash,
      previousStatementHash: fields.previousStatementHash ?? null,
    }
  )

  await commitWrites([
    ...fields.archive,
    { path: paths.publicKey, data: fields.publicKey },
    { path: paths.statement, data: fields.signedStatement },
    { path: paths.securityTxt, data: fields.securityTxt },
    {
      path: paths.securityPolicy,
      data: buildSecurityPolicy({
        name: canary.name,
        email: canary.email,
        fingerprint: fields.fingerprint,
        siteOrigin: canary.siteOrigin,
        publicKeyHref: canary.publicKeyHref,
        statementHref: canary.statementHref,
      }),
    },
    { path: paths.wkdKey, data: fields.rehearsed.wkdKey },
    { path: paths.wkdPolicy, data: buildWkdPolicy(canary.email) },
    {
      path: paths.llmsTxt,
      data: buildLlmsTxt({
        name: canary.displayName,
        email: canary.email,
        fingerprint: fields.fingerprint,
        algorithm,
        siteOrigin: canary.siteOrigin,
        publicKeyHref: canary.publicKeyHref,
        statementHref: canary.statementHref,
        archiveHrefs: archiveHrefs(archiveDir, fields.archive),
      }),
    },
    {
      path: paths.signatureText,
      data: buildEmailSignatureText({
        fingerprint: fields.fingerprint,
        siteOrigin: canary.siteOrigin,
      }),
    },
    {
      path: paths.signatureHtml,
      data: buildEmailSignatureHtml({
        fingerprint: fields.fingerprint,
        siteOrigin: canary.siteOrigin,
      }),
    },
    { path: paths.readme, data: readme },
    { path: paths.canaryModule, data: source },
  ])
}
