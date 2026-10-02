import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { canary } from "@/lib/canary/canary"
import { listCanaryArchives } from "@/lib/canary/canary-history"
import { formatLongDate, formatLongDateTime } from "@/lib/iso-date"
import {
  algorithmFromPublicKey,
  fingerprintFromPublicKey,
  primaryUserIdFromPublicKey,
  verifiedPublicKeyArmor,
  verifiedClearsigned,
  verifyClearsigned,
} from "@/lib/openpgp-armor"

const failures: string[] = []
const unreadableKey = "public/fiona.asc did not parse as one armored key block"

const previousStatementPattern = /^previous statement: sha256:([0-9a-f]{64})$/gm
const canonicalPattern = /^Canonical: *(\S+)$/gm
const encryptionUrlPattern = /^Encryption: *(https:\/\/\S+)$/gm
const utf8 = new TextDecoder("utf8")

type ChainLink = {
  readonly source: string
  readonly hash: string | undefined
  readonly declaredPrevious: string | undefined
}

function fail(message: string): void {
  failures.push(message)
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function assertAsserts(
  cleartext: string,
  phrase: string,
  source: string
): void {
  if (!cleartext.includes(phrase)) {
    fail(`${source} does not assert: ${phrase}`)
  }
}

function httpsUrlOf(url: string): URL | undefined {
  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return undefined
  }

  if (parsed.protocol !== "https:") {
    return undefined
  }

  return parsed
}

function originOf(url: string): string | undefined {
  return httpsUrlOf(url)?.origin
}

function assertCanonicalOrigin(cleartext: string, source: string): void {
  const matches = [...cleartext.matchAll(canonicalPattern)]
  const declared = matches.length === 1 ? matches[0]?.[1] : undefined

  if (declared === undefined) {
    fail(
      `${source} carries ${matches.length} "Canonical: <url>" lines, expected exactly one: the signed canonical origin cannot be read, so nothing confirms canary.siteOrigin`
    )
    return
  }

  const signedOrigin = originOf(declared)

  if (signedOrigin === undefined) {
    fail(
      `${source} signs "Canonical: ${declared}", which is not an https URL with an origin this can read, so nothing confirms canary.siteOrigin`
    )
    return
  }

  if (signedOrigin !== canary.siteOrigin) {
    fail(
      `${source} signs "Canonical: ${declared}", whose origin is "${signedOrigin}", but lib/canary/canary.ts declares siteOrigin "${canary.siteOrigin}": the signed statement and the constant disagree about this site's canonical origin, and one of them is wrong`
    )
  }
}

function assertPublicKeyLocation(cleartext: string, source: string): void {
  const matches = [...cleartext.matchAll(encryptionUrlPattern)]
  const declared = matches.length === 1 ? matches[0]?.[1] : undefined

  if (declared === undefined) {
    fail(
      `${source} carries ${matches.length} "Encryption: https://<url>" lines, expected exactly one: the signed public key location cannot be read, so nothing confirms canary.publicKeyHref`
    )
    return
  }

  const signed = httpsUrlOf(declared)

  if (signed === undefined) {
    fail(
      `${source} signs "Encryption: ${declared}", which is not an https URL this can read, so nothing confirms canary.publicKeyHref`
    )
    return
  }

  if (signed.origin !== canary.siteOrigin) {
    fail(
      `${source} signs "Encryption: ${declared}", whose origin is "${signed.origin}", but lib/canary/canary.ts declares siteOrigin "${canary.siteOrigin}": the signed statement and the constant disagree about the site serving this key, and one of them is wrong`
    )
  }

  const signedHref = `${signed.pathname}${signed.search}${signed.hash}`

  if (signedHref !== canary.publicKeyHref) {
    fail(
      `${source} signs "Encryption: ${declared}", whose path is "${signedHref}", but lib/canary/canary.ts declares publicKeyHref "${canary.publicKeyHref}": the signed statement and the constant disagree about where this site's public key is served, and one of them is wrong`
    )
  }
}

async function attempt<Value>(
  label: string,
  run: () => Promise<Value>
): Promise<Value | undefined> {
  try {
    return await run()
  } catch (cause) {
    fail(`${label}: ${messageOf(cause)}`)
    return undefined
  }
}

async function readText(
  filePath: string,
  source: string
): Promise<string | undefined> {
  return attempt(`${source} is not readable`, () => readFile(filePath, "utf8"))
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

function declaredPreviousHash(
  statementText: string,
  source: string
): string | undefined {
  const matches = [...statementText.matchAll(previousStatementPattern)]

  if (matches.length > 1) {
    fail(
      `${source} carries ${matches.length} "previous statement: sha256:<64 hex>" lines, expected at most one: the published chain cannot be walked through it`
    )
    return undefined
  }

  return matches[0]?.[1]
}

function walkChain(links: readonly ChainLink[]): void {
  for (const [index, link] of links.entries()) {
    const declared = link.declaredPrevious
    const older = links[index + 1]

    if (older === undefined) {
      if (declared !== undefined) {
        fail(
          `${link.source} chains to sha256:${declared}, but it is the oldest published statement and no earlier statement is published: an older statement has been removed`
        )
      }
      continue
    }

    if (declared === undefined) {
      fail(
        `${link.source} carries no "previous statement: sha256:<64 hex>" line, but ${older.source} is published as an earlier statement: the published chain cannot be walked through it`
      )
      continue
    }

    if (older.hash !== undefined && declared !== older.hash) {
      fail(
        `${link.source} chains to sha256:${declared}, but ${older.source} hashes to sha256:${older.hash}: published history is missing, altered, or out of order`
      )
    }
  }
}

const root = process.cwd()
const publicKey = await readText(
  join(root, "public/fiona.asc"),
  "public/fiona.asc"
)
const statement = await readText(
  join(root, "public/canary.asc"),
  "public/canary.asc"
)
const securityTxt = await readText(
  join(root, "public/.well-known/security.txt"),
  "public/.well-known/security.txt"
)

const keyArmor =
  publicKey === undefined
    ? undefined
    : await attempt(
        "public/fiona.asc is not readable as one armored key block",
        () => verifiedPublicKeyArmor(publicKey)
      )

if (keyArmor !== undefined && keyArmor !== publicKey) {
  fail("public/fiona.asc is not exactly one armored key block")
}

const verifyingKey = keyArmor === undefined ? undefined : publicKey

async function checkKeyProperty(
  property: string,
  read: (armoredKey: string) => Promise<string>,
  compare: (value: string) => void
): Promise<void> {
  if (verifyingKey === undefined) {
    fail(`public/fiona.asc ${property} not checked: ${unreadableKey}`)
    return
  }

  const value = await attempt(
    `public/fiona.asc ${property} is not readable`,
    () => read(verifyingKey)
  )
  if (value !== undefined) {
    compare(value)
  }
}

await checkKeyProperty(
  "fingerprint",
  fingerprintFromPublicKey,
  (fingerprint) => {
    if (fingerprint !== canary.fingerprint) {
      fail(
        `public/fiona.asc is ${fingerprint}, canary.fingerprint is ${canary.fingerprint}`
      )
    }
  }
)

await checkKeyProperty("algorithm", algorithmFromPublicKey, (algorithm) => {
  if (algorithm !== canary.algorithm) {
    fail(
      `public/fiona.asc is ${algorithm}, canary.algorithm is ${canary.algorithm}`
    )
  }
})

const userId = `${canary.name} <${canary.email}>`
await checkKeyProperty(
  "primary user id",
  primaryUserIdFromPublicKey,
  (primaryUserId) => {
    if (primaryUserId !== userId) {
      fail(
        `public/fiona.asc certifies "${primaryUserId}", expected "${userId}"`
      )
    }
  }
)

if (statement !== undefined && verifyingKey === undefined) {
  fail(`public/canary.asc not verified: ${unreadableKey}`)
}

if (statement !== undefined && verifyingKey !== undefined) {
  const statementVerification = await attempt(
    "public/canary.asc does not verify",
    () => verifiedClearsigned(statement, verifyingKey)
  )
  if (statementVerification !== undefined) {
    const cleartext = statementVerification.cleartext
    if (statementVerification.signatureCreatedAt !== canary.signedAt) {
      fail(
        `public/canary.asc signature creation time ${statementVerification.signatureCreatedAt} does not equal canary.signedAt ${canary.signedAt}`
      )
    }
    assertAsserts(
      cleartext,
      `i am ${canary.name} <${canary.email}>.`,
      "public/canary.asc"
    )
    assertAsserts(
      cleartext,
      `as of ${formatLongDateTime(canary.signedAt)}:`,
      "public/canary.asc"
    )
    assertAsserts(
      cleartext,
      `by ${formatLongDate(canary.renewBy)},`,
      "public/canary.asc"
    )
    assertAsserts(
      cleartext,
      [
        `proof of date: monero block ${canary.moneroBlockHeight}`,
        canary.moneroBlockHash,
        ...(canary.previousStatementHash === undefined
          ? []
          : [`previous statement: sha256:${canary.previousStatementHash}`]),
      ].join("\n"),
      "public/canary.asc"
    )
  }
}

if (securityTxt !== undefined && verifyingKey === undefined) {
  fail(`public/.well-known/security.txt not verified: ${unreadableKey}`)
}

if (securityTxt !== undefined && verifyingKey !== undefined) {
  const securityFields = await attempt(
    "public/.well-known/security.txt does not verify",
    () => verifyClearsigned(securityTxt, verifyingKey)
  )
  if (securityFields !== undefined) {
    assertAsserts(
      securityFields,
      `Encryption: openpgp4fpr:${canary.fingerprint.toLowerCase()}`,
      "public/.well-known/security.txt"
    )
    assertAsserts(
      securityFields,
      `Contact: mailto:${canary.email}`,
      "public/.well-known/security.txt"
    )
    assertAsserts(
      securityFields,
      `Expires: ${canary.renewBy}T23:59:59.000Z`,
      "public/.well-known/security.txt"
    )
    assertCanonicalOrigin(securityFields, "public/.well-known/security.txt")
    assertPublicKeyLocation(securityFields, "public/.well-known/security.txt")
  }
}

const archives = (() => {
  try {
    return listCanaryArchives()
  } catch (cause) {
    fail(`public/canary could not be read: ${messageOf(cause)}`)
    return []
  }
})()

const chain: ChainLink[] = [
  {
    source: "public/canary.asc",
    hash: undefined,
    declaredPrevious:
      statement === undefined
        ? undefined
        : declaredPreviousHash(statement, "public/canary.asc"),
  },
]

for (const archive of archives) {
  const bytes = await attempt(`${archive.href} is not readable`, () =>
    readFile(archive.filePath)
  )
  const armored = bytes === undefined ? undefined : utf8.decode(bytes)
  chain.push({
    source: archive.href,
    hash: bytes === undefined ? undefined : sha256Hex(bytes),
    declaredPrevious:
      armored === undefined
        ? undefined
        : declaredPreviousHash(armored, archive.href),
  })

  const archiveKey =
    archive.keyPath === undefined
      ? verifyingKey
      : await readText(archive.keyPath, `${archive.href} key`)

  if (armored === undefined) {
    continue
  }

  if (archiveKey === undefined) {
    if (archive.keyPath === undefined) {
      fail(`${archive.href} not verified: ${unreadableKey}`)
    }
    continue
  }

  const archiveFingerprint = await attempt(
    `${archive.href} key is not readable as one armored key block`,
    () => fingerprintFromPublicKey(archiveKey)
  )
  if (archiveFingerprint === undefined) {
    continue
  }

  if (
    archiveFingerprint !== canary.fingerprint &&
    !canary.priorFingerprints.includes(archiveFingerprint)
  ) {
    fail(
      `${archive.href} is keyed by ${archiveFingerprint}, which is neither canary.fingerprint nor a listed prior fingerprint`
    )
    continue
  }

  const archived = await attempt(`${archive.href} does not verify`, () =>
    verifyClearsigned(armored, archiveKey)
  )
  if (archived !== undefined) {
    assertAsserts(
      archived,
      `as of ${formatLongDate(archive.signedOn)}`,
      archive.href
    )
  }
}

walkChain(chain)

if (failures.length > 0) {
  for (const failure of failures) {
    process.stderr.write(`${failure}\n`)
  }
  process.exit(1)
}
