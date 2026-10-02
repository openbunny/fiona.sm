import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { execa } from "execa"

import {
  cardSerialForKey,
  signingFingerprintFromCard,
} from "@/lib/renew/gpg-colon"

export type Logger = {
  readonly info: (message: string) => void
  readonly warn: (message: string) => void
  readonly error: (message: string) => void
}

const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
}

export async function exportPublicKey(key: string): Promise<string> {
  const result = await execa("gpg", ["--armor", "--export", key])
  if (result.stdout.trim() === "") {
    throw new Error(`gpg exported an empty public key for ${key}`)
  }

  return `${result.stdout.trimEnd()}\n`
}

export async function cardSigningKey(
  logger: Logger = silentLogger
): Promise<string> {
  logger.info("Reading the signing key from the OpenPGP card\u2026")
  return signingFingerprintFromCard(await cardStatus())
}

async function cardStatus(): Promise<string> {
  try {
    const result = await execa("gpg", ["--with-colons", "--card-status"])
    return result.stdout
  } catch (error) {
    throw new Error(
      "gpg found no OpenPGP card; insert the canary YubiKey and try again",
      { cause: error }
    )
  }
}

async function secretKeyListing(key: string): Promise<string> {
  try {
    const result = await execa("gpg", [
      "--with-colons",
      "--list-secret-keys",
      key,
    ])
    return result.stdout
  } catch {
    return ""
  }
}

export async function clearsignWithCard(
  plaintext: string,
  key: string,
  label: string,
  logger: Logger = silentLogger
): Promise<string> {
  const serial = cardSerialForKey(await secretKeyListing(key), key)
  const dir = await mkdtemp(join(tmpdir(), "fiona-canary-"))
  const unsignedPath = join(dir, "statement.txt")
  const signedPath = join(dir, "statement.asc")

  try {
    await writeFile(unsignedPath, plaintext, { encoding: "utf8" })
    logger.info(`Signing ${label} with card ${serial}`)
    logger.info("Enter your OpenPGP user PIN when pinentry appears\u2026")
    logger.info("Touch the YubiKey when it blinks (signature UIF is on)\u2026")
    await execa(
      "gpg",
      [
        "--clearsign",
        "--armor",
        "--local-user",
        `${key}!`,
        "--output",
        signedPath,
        unsignedPath,
      ],
      { stdio: "inherit" }
    )
    return await readFile(signedPath, { encoding: "utf8" })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
