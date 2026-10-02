import { readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const publicDir = join(process.cwd(), "public")
const statementPath = join(publicDir, "canary.asc")
const publicKeyPath = join(publicDir, "fiona.asc")

const priorFingerprints: readonly string[] = []

function readRequiredFile(path: string, purpose: string): string {
  if (statSync(path, { throwIfNoEntry: false }) === undefined) {
    throw new Error(`${path} is missing. ${purpose}`)
  }

  return readFileSync(path, "utf8")
}

function lazyRequiredFile(path: string, purpose: string): () => string {
  let cached: string | undefined
  return (): string => {
    if (cached === undefined) {
      cached = readRequiredFile(path, purpose)
    }
    return cached
  }
}

const readSignedStatement = lazyRequiredFile(
  statementPath,
  "This site publishes a key canary and does not build without a signed statement: clearsign a statement and write it to public/canary.asc."
)

const readPublicKey = lazyRequiredFile(
  publicKeyPath,
  "This site publishes a key canary and does not build without the public key it is signed with: export it to public/fiona.asc."
)

export const canary = {
  name: "fiona",
  displayName: "fiona",
  email: "mail@fiona.sm",
  fingerprint: "4820FA938BA2573DE08E4FAD45B4B5460D72A034",
  priorFingerprints,
  algorithm: "Ed25519",
  signedOn: "2026-09-30",
  signedAt: "2026-09-30T17:48:09Z",
  renewBy: "2026-12-29",
  previousStatementHash: undefined as string | undefined,
  moneroBlockHeight: 3773944,
  moneroBlockHash:
    "c09507ace9368fe976addaedcd30680b736f66d6e70fbe9c652d789d06c45a96",
  siteOrigin: "https://fiona.sm",
  publicKeyHref: "/fiona.asc",
  statementHref: "/canary.asc",
  get publicKey(): string {
    return readPublicKey()
  },
  get signedStatement(): string {
    return readSignedStatement()
  },
} as const
