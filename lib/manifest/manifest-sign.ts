import { readFile, rename, writeFile } from "node:fs/promises"

import { canary } from "@/lib/canary/canary"
import { generateManifestText } from "@/lib/manifest/manifest-generate"
import {
  fingerprintFromPublicKey,
  verifyClearsigned,
} from "@/lib/openpgp-armor"
import {
  cardSigningKey,
  clearsignWithCard,
  exportPublicKey,
  type Logger,
} from "@/lib/renew/gpg-card"

export type SignManifestOptions = {
  readonly manifestPath: string
  readonly buildOutputDir: string
  readonly publicKeyPath: string
  readonly dryRun: boolean
  readonly logger?: Logger
}

export type SignManifestDeps = {
  readonly generateManifestText: typeof generateManifestText
  readonly cardSigningKey: typeof cardSigningKey
  readonly exportPublicKey: typeof exportPublicKey
  readonly clearsignWithCard: typeof clearsignWithCard
  readonly fingerprintFromPublicKey: typeof fingerprintFromPublicKey
  readonly verifyClearsigned: typeof verifyClearsigned
}

const manifestLabel = "public/posts.asc"
const stagedSuffix = ".tmp"

const productionDeps: SignManifestDeps = {
  generateManifestText,
  cardSigningKey,
  exportPublicKey,
  clearsignWithCard,
  fingerprintFromPublicKey,
  verifyClearsigned,
}

async function readPublishedPublicKey(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    throw new Error(
      [
        `Cannot read the published public key at ${path}.`,
        "  The manifest must clearsign-verify against this file before it is written,",
        "  and the card has not been asked to sign anything.",
        "  Run `bun run canary renew` first if this is a fresh checkout, or pass",
        "  --public-key to point at the file.",
      ].join("\n"),
      { cause: error }
    )
  }
}

export function asClearsignedBody(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "")
}

function assertSigningKeyMatchesCanary(fingerprint: string): void {
  if (fingerprint === canary.fingerprint) {
    return
  }

  throw new Error(
    [
      "The card's signing key does not match the fingerprint lib/canary/canary.ts names.",
      `  Expected ${canary.fingerprint}`,
      `  Card     ${fingerprint}`,
      "  The manifest carries no key identity of its own: it always signs with",
      "  whatever key the canary currently names. Insert the canary's card, or,",
      "  if this key is a deliberate replacement, rotate the canary first with",
      "  `bun run canary renew --rotate` and re-run manifest sign afterward.",
      "  Nothing has been signed.",
    ].join("\n")
  )
}

async function writeManifestAtomically(
  path: string,
  data: string
): Promise<void> {
  const stagedPath = `${path}${stagedSuffix}`
  await writeFile(stagedPath, data, "utf8")
  await rename(stagedPath, path)
}

export async function signManifest(
  options: SignManifestOptions,
  deps: SignManifestDeps = productionDeps
): Promise<string> {
  const log = options.logger

  log?.info("Hashing built post content…")
  const plaintext = deps.generateManifestText({
    fingerprint: canary.fingerprint,
    buildOutputDir: options.buildOutputDir,
  })

  if (options.dryRun) {
    return plaintext
  }

  const publishedPublicKey = await readPublishedPublicKey(options.publicKeyPath)

  log?.info("Reading the signing key from the OpenPGP card…")
  const key = await deps.cardSigningKey(log)
  log?.info("Exporting the public key…")
  const cardPublicKey = await deps.exportPublicKey(key)
  const fingerprint = await deps.fingerprintFromPublicKey(cardPublicKey)
  assertSigningKeyMatchesCanary(fingerprint)

  log?.info("Clearsigning the manifest…")
  const signed = await deps.clearsignWithCard(
    plaintext,
    key,
    manifestLabel,
    log
  )

  log?.info(`Verifying the signature against ${options.publicKeyPath}…`)
  let cleartext: string
  try {
    cleartext = await deps.verifyClearsigned(signed, publishedPublicKey)
  } catch (error) {
    throw new Error(
      [
        `The new signature does not clearsign-verify against ${options.publicKeyPath}.`,
        `  Nothing was written to ${options.manifestPath}.`,
        "  Re-run manifest sign.",
      ].join("\n"),
      { cause: error }
    )
  }

  if (asClearsignedBody(cleartext) !== asClearsignedBody(plaintext)) {
    throw new Error(
      [
        "The signed manifest's body is not the manifest that was generated.",
        `  Nothing was written to ${options.manifestPath}.`,
        "  Re-run manifest sign.",
      ].join("\n")
    )
  }

  await writeManifestAtomically(options.manifestPath, signed)

  return [
    `Wrote ${options.manifestPath}`,
    `Fingerprint ${fingerprint}`,
    "Run: bun run manifest verify",
    "",
  ].join("\n")
}
