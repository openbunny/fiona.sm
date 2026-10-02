import { createHash } from "node:crypto"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { execa } from "execa"
import { createCleartextMessage, generateKey, sign } from "openpgp"
import { afterEach, describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import { archiveKeyName } from "@/lib/canary/canary-history"
import { buildCanaryPlaintext } from "@/lib/renew/canary-text"
import { formatLongDate, formatLongDateTime } from "@/lib/iso-date"

const root = process.cwd()
const script = join(root, "scripts/verify-asc.ts")
const signedOn = canary.signedOn
const timeout = 120_000
const fixtures: string[] = []

afterEach(() => {
  for (const dir of fixtures.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function fixtureRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "verify-asc-"))
  fixtures.push(dir)

  mkdirSync(join(dir, "public/.well-known"), { recursive: true })
  mkdirSync(join(dir, "public/canary"), { recursive: true })
  for (const name of [
    "public/fiona.asc",
    "public/canary.asc",
    "public/.well-known/security.txt",
  ]) {
    cpSync(join(root, name), join(dir, name))
  }

  return dir
}

function withPublishedHistory(dir: string): string {
  const publishedCanaryDir = join(root, "public/canary")
  if (!existsSync(publishedCanaryDir)) {
    return dir
  }

  for (const name of readdirSync(publishedCanaryDir)) {
    cpSync(join(publishedCanaryDir, name), join(dir, "public/canary", name))
  }

  return dir
}

function archive(dir: string, statement: string, key?: string): void {
  writeFileSync(join(dir, "public/canary", `${signedOn}.asc`), statement)
  if (key !== undefined) {
    writeFileSync(join(dir, "public/canary", archiveKeyName(signedOn)), key)
  }
}

async function runVerify(
  cwd: string
): Promise<{ exitCode: number | undefined; stdout: string; stderr: string }> {
  const result = await execa("bun", ["run", script], { cwd, reject: false })
  return {
    exitCode: result.exitCode,
    stdout: String(result.stdout),
    stderr: String(result.stderr),
  }
}

async function foreignStatement(): Promise<{
  statement: string
  key: string
  fingerprint: string
}> {
  const pair = await generateKey({
    type: "ecc",
    curve: "ed25519Legacy",
    userIDs: [{ name: canary.name, email: canary.email }],
    format: "object",
    date: new Date("1998-01-01T00:00:00Z"),
  })
  const text = [
    `I am ${canary.name} <${canary.email}>.`,
    "",
    "This is a PGP key canary.",
    "",
    `As of ${formatLongDate(signedOn)} 12:00 UTC:`,
    "",
    "1. I have sole control of the private key.",
    "",
  ].join("\n")
  const statement = await sign({
    message: await createCleartextMessage({ text }),
    signingKeys: pair.privateKey,
  })

  return {
    statement,
    key: pair.publicKey.armor(),
    fingerprint: pair.publicKey.getFingerprint().toUpperCase(),
  }
}

const wellKnownHref = "/.well-known/security.txt"

type SignedFields = {
  readonly canonical?: readonly string[]
  readonly encryption?: readonly string[]
}

function signedSecurityTxt(fields: SignedFields): string {
  return [
    `Contact: mailto:${canary.email}`,
    `Expires: ${canary.renewBy}T23:59:59.000Z`,
    ...(fields.encryption ?? [
      `Encryption: ${canary.siteOrigin}${canary.publicKeyHref}`,
    ]),
    `Encryption: openpgp4fpr:${canary.fingerprint.toLowerCase()}`,
    ...(fields.canonical ?? [
      `Canonical: ${canary.siteOrigin}${wellKnownHref}`,
    ]),
  ].join("\n")
}

async function securityTxtDeclaring(
  dir: string,
  fields: SignedFields
): Promise<void> {
  const pair = await generateKey({
    type: "ecc",
    curve: "ed25519Legacy",
    userIDs: [{ name: canary.name, email: canary.email }],
    format: "object",
    date: new Date("2026-01-01T00:00:00Z"),
  })

  writeFileSync(join(dir, "public/fiona.asc"), pair.publicKey.armor())
  writeFileSync(
    join(dir, "public/.well-known/security.txt"),
    await sign({
      message: await createCleartextMessage({
        text: signedSecurityTxt(fields),
      }),
      signingKeys: pair.privateKey,
    })
  )
}

function canonicalFailures(stderr: string): string[] {
  return stderr
    .split("\n")
    .filter((line) => line.includes("public/.well-known/security.txt"))
    .filter(
      (line) => line.includes("Canonical") || line.includes("canonical origin")
    )
}

function publicKeyFailures(stderr: string): string[] {
  return stderr
    .split("\n")
    .filter((line) => line.includes("public/.well-known/security.txt"))
    .filter(
      (line) =>
        line.includes("Encryption") || line.includes("public key location")
    )
}

async function statementWithMismatchedSignatureTime(): Promise<{
  statement: string
  key: string
}> {
  const signedAt = new Date("2024-01-02T03:04:05Z")
  const pair = await generateKey({
    type: "ecc",
    curve: "ed25519Legacy",
    userIDs: [{ name: canary.name, email: canary.email }],
    format: "object",
    date: signedAt,
  })
  const text = [
    `I am ${canary.name} <${canary.email}>.`,
    "",
    `As of ${formatLongDateTime(canary.signedAt)}:`,
    "",
  ].join("\n")
  const statement = await sign({
    message: await createCleartextMessage({ text }),
    signingKeys: pair.privateKey,
    date: signedAt,
  })
  return { statement, key: pair.publicKey.armor() }
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex")
}

function chainFailures(stderr: string): string[] {
  return stderr
    .split("\n")
    .filter(
      (line) =>
        line.includes("chains to sha256:") ||
        line.includes('carries no "previous statement')
    )
}

function archivePath(dir: string, isoDate: string): string {
  return join(dir, "public/canary", `${isoDate}.asc`)
}

type SignedChain = ReadonlyMap<string, string>

async function signedChain(
  dir: string,
  signedOnDates: readonly string[],
  rootHash?: string
): Promise<SignedChain> {
  const pair = await generateKey({
    type: "ecc",
    curve: "ed25519Legacy",
    userIDs: [{ name: canary.name, email: canary.email }],
    format: "object",
    date: new Date("2026-01-01T00:00:00Z"),
  })
  writeFileSync(join(dir, "public/fiona.asc"), pair.publicKey.armor())

  const statements = new Map<string, string>()
  let previousStatementHash = rootHash

  for (const isoDate of [...signedOnDates].sort()) {
    const signedAt = `${isoDate}T12:00:00Z`
    const statement = await sign({
      message: await createCleartextMessage({
        text: buildCanaryPlaintext({
          name: canary.name,
          email: canary.email,
          signedAt,
          renewBy: canary.renewBy,
          moneroBlockHeight: canary.moneroBlockHeight,
          moneroBlockHash: canary.moneroBlockHash,
          ...(previousStatementHash === undefined
            ? {}
            : { previousStatementHash }),
        }),
      }),
      signingKeys: pair.privateKey,
      date: new Date(signedAt),
    })
    writeFileSync(archivePath(dir, isoDate), statement)
    statements.set(isoDate, statement)
    previousStatementHash = sha256Hex(statement)
  }

  const head = await sign({
    message: await createCleartextMessage({
      text: buildCanaryPlaintext({
        name: canary.name,
        email: canary.email,
        signedAt: canary.signedAt,
        renewBy: canary.renewBy,
        moneroBlockHeight: canary.moneroBlockHeight,
        moneroBlockHash: canary.moneroBlockHash,
        ...(previousStatementHash === undefined
          ? {}
          : { previousStatementHash }),
      }),
    }),
    signingKeys: pair.privateKey,
    date: new Date(canary.signedAt),
  })
  writeFileSync(join(dir, "public/canary.asc"), head)

  return statements
}

function statementOf(chain: SignedChain, isoDate: string): string {
  const statement = chain.get(isoDate)
  if (statement === undefined) {
    throw new Error(`fixture has no statement for ${isoDate}`)
  }

  return statement
}

describe("prior fingerprints", () => {
  it("never repeats the current fingerprint", () => {
    expect(canary.priorFingerprints).not.toContain(canary.fingerprint)
  })

  it("lists only uppercase hex fingerprints", () => {
    for (const fingerprint of canary.priorFingerprints) {
      expect(fingerprint).toMatch(/^[0-9A-F]{40}$/)
    }
  })

  it("lists each fingerprint once", () => {
    expect(new Set(canary.priorFingerprints).size).toBe(
      canary.priorFingerprints.length
    )
  })
})

describe("verify-asc", () => {
  it(
    "rejects a statement whose verified signature time differs from signedAt",
    async () => {
      const dir = fixtureRoot()
      const mismatched = await statementWithMismatchedSignatureTime()
      writeFileSync(join(dir, "public/canary.asc"), mismatched.statement)
      writeFileSync(join(dir, "public/fiona.asc"), mismatched.key)

      const result = await runVerify(dir)

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("signature creation time")
      expect(result.stderr).toContain("does not equal canary.signedAt")
    },
    timeout
  )

  it(
    "verifies the published files",
    async () => {
      const result = await runVerify(root)

      expect(result.stderr).toBe("")
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe("")
    },
    timeout
  )

  it(
    "verifies an archive that falls back to the published key",
    async () => {
      const dir = withPublishedHistory(fixtureRoot())
      archive(dir, canary.signedStatement)

      const result = await runVerify(dir)

      expect(result.stderr.trim().split("\n")).toEqual(
        chainFailures(result.stderr)
      )
      expect(chainFailures(result.stderr)).toHaveLength(1)
    },
    timeout
  )

  it(
    "verifies an archive stored beside the current canary key",
    async () => {
      const dir = withPublishedHistory(fixtureRoot())
      archive(dir, canary.signedStatement, canary.publicKey)

      const result = await runVerify(dir)

      expect(result.stderr.trim().split("\n")).toEqual(
        chainFailures(result.stderr)
      )
      expect(chainFailures(result.stderr)).toHaveLength(1)
    },
    timeout
  )

  it(
    "reports the head chaining past an archive that is not its predecessor",
    async () => {
      const dir = withPublishedHistory(fixtureRoot())
      archive(dir, canary.signedStatement)

      const result = await runVerify(dir)

      expect(result.exitCode).not.toBe(0)
      expect(chainFailures(result.stderr)).toEqual([
        `public/canary.asc carries no "previous statement: sha256:<64 hex>" line, but /canary/${signedOn}.asc is published as an earlier statement: the published chain cannot be walked through it`,
      ])
    },
    timeout
  )

  it(
    "rejects an archive that attests to itself under an unanchored key",
    async () => {
      const dir = fixtureRoot()
      const foreign = await foreignStatement()
      archive(dir, foreign.statement, foreign.key)

      const result = await runVerify(dir)

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain(`/canary/${signedOn}.asc`)
      expect(result.stderr).toContain(foreign.fingerprint)
    },
    timeout
  )

  it(
    "reports every later check when the key armor does not parse",
    async () => {
      const dir = fixtureRoot()
      const keyPath = join(dir, "public/fiona.asc")
      writeFileSync(keyPath, `${readFileSync(keyPath, "utf8")}junk\n`)
      archive(dir, canary.signedStatement)

      const result = await runVerify(dir)

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain(
        "public/fiona.asc is not readable as one armored key block"
      )
      expect(result.stderr).toContain("public/canary.asc")
      expect(result.stderr).toContain("public/.well-known/security.txt")
      expect(result.stderr).toContain(`/canary/${signedOn}.asc`)
    },
    timeout
  )

  it(
    "rejects an unanchored archive key before reading the signature",
    async () => {
      const dir = fixtureRoot()
      const foreign = await foreignStatement()
      archive(dir, canary.signedStatement, foreign.key)

      const result = await runVerify(dir)

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain(foreign.fingerprint)
      expect(result.stderr).not.toContain("Could not find signing key")
    },
    timeout
  )
})

describe("verify-asc canonical origin", () => {
  type CanonicalCase = readonly [
    name: string,
    fields: SignedFields,
    expected: readonly string[],
  ]

  const elsewhereCanonical = `https://elsewhere.example${wellKnownHref}`
  const startsWithCanonical = `${canary.siteOrigin}.elsewhere.example${wellKnownHref}`
  const blobCanonical = `blob:${canary.siteOrigin}${wellKnownHref}`
  const httpCanonical = `http://fiona.sm${wellKnownHref}`
  const matchingCanonical = `${canary.siteOrigin}${wellKnownHref}`

  const cases: readonly CanonicalCase[] = [
    [
      "rejects a signed Canonical whose origin is not canary.siteOrigin",
      { canonical: [`Canonical: ${elsewhereCanonical}`] },
      [
        `public/.well-known/security.txt signs "Canonical: ${elsewhereCanonical}", whose origin is "https://elsewhere.example", but lib/canary/canary.ts declares siteOrigin "${canary.siteOrigin}": the signed statement and the constant disagree about this site's canonical origin, and one of them is wrong`,
      ],
    ],
    [
      "rejects a host that merely starts with canary.siteOrigin",
      { canonical: [`Canonical: ${startsWithCanonical}`] },
      [
        `public/.well-known/security.txt signs "Canonical: ${startsWithCanonical}", whose origin is "${canary.siteOrigin}.elsewhere.example", but lib/canary/canary.ts declares siteOrigin "${canary.siteOrigin}": the signed statement and the constant disagree about this site's canonical origin, and one of them is wrong`,
      ],
    ],
    [
      "rejects a signed Canonical whose https origin sits behind another scheme",
      { canonical: [`Canonical: ${blobCanonical}`] },
      [
        `public/.well-known/security.txt signs "Canonical: ${blobCanonical}", which is not an https URL with an origin this can read, so nothing confirms canary.siteOrigin`,
      ],
    ],
    [
      "rejects a signed Canonical served over plain http",
      { canonical: [`Canonical: ${httpCanonical}`] },
      [
        `public/.well-known/security.txt signs "Canonical: ${httpCanonical}", which is not an https URL with an origin this can read, so nothing confirms canary.siteOrigin`,
      ],
    ],
    [
      "rejects a security.txt that signs no Canonical line at all",
      { canonical: [] },
      [
        `public/.well-known/security.txt carries 0 "Canonical: <url>" lines, expected exactly one: the signed canonical origin cannot be read, so nothing confirms canary.siteOrigin`,
      ],
    ],
    [
      "refuses to pick between two signed Canonical lines",
      {
        canonical: [
          `Canonical: ${matchingCanonical}`,
          `Canonical: ${elsewhereCanonical}`,
        ],
      },
      [
        `public/.well-known/security.txt carries 2 "Canonical: <url>" lines, expected exactly one: the signed canonical origin cannot be read, so nothing confirms canary.siteOrigin`,
      ],
    ],
    [
      "accepts a signed Canonical whose origin is canary.siteOrigin",
      { canonical: [`Canonical: ${matchingCanonical}`] },
      [],
    ],
  ]

  it.each(cases)(
    "%s",
    async (_name, fields, expected) => {
      const dir = fixtureRoot()
      await securityTxtDeclaring(dir, fields)

      const result = await runVerify(dir)

      if (expected.length > 0) {
        expect(result.exitCode).not.toBe(0)
      }
      expect(canonicalFailures(result.stderr)).toEqual(expected)
    },
    timeout
  )
})

describe("verify-asc public key location", () => {
  type PublicKeyCase = readonly [
    name: string,
    fields: SignedFields,
    expected: readonly string[],
  ]

  const otherPathEncryption = `${canary.siteOrigin}/keys/elsewhere.asc`
  const queryEncryption = `${canary.siteOrigin}${canary.publicKeyHref}?key=other`
  const fragmentEncryption = `${canary.siteOrigin}${canary.publicKeyHref}#other`
  const otherOriginEncryption = `https://elsewhere.example${canary.publicKeyHref}`
  const startsWithHost = `${canary.siteOrigin}.elsewhere.example`
  const startsWithEncryption = `${startsWithHost}${canary.publicKeyHref}`
  const bothWrongEncryption = "https://elsewhere.example/keys/elsewhere.asc"
  const blobEncryption = `blob:${canary.siteOrigin}${canary.publicKeyHref}`
  const httpEncryption = `http://fiona.sm${canary.publicKeyHref}`
  const unreadableEncryption = "https://fiona.sm:notaport/fiona.asc"
  const matchingEncryption = `${canary.siteOrigin}${canary.publicKeyHref}`
  const unreadableLinesMessage = `public/.well-known/security.txt carries 0 "Encryption: https://<url>" lines, expected exactly one: the signed public key location cannot be read, so nothing confirms canary.publicKeyHref`

  const cases: readonly PublicKeyCase[] = [
    [
      "rejects a signed key path that is not canary.publicKeyHref",
      { encryption: [`Encryption: ${otherPathEncryption}`] },
      [
        `public/.well-known/security.txt signs "Encryption: ${otherPathEncryption}", whose path is "/keys/elsewhere.asc", but lib/canary/canary.ts declares publicKeyHref "${canary.publicKeyHref}": the signed statement and the constant disagree about where this site's public key is served, and one of them is wrong`,
      ],
    ],
    [
      "rejects a signed key path carrying a query the constant does not",
      { encryption: [`Encryption: ${queryEncryption}`] },
      [
        `public/.well-known/security.txt signs "Encryption: ${queryEncryption}", whose path is "${canary.publicKeyHref}?key=other", but lib/canary/canary.ts declares publicKeyHref "${canary.publicKeyHref}": the signed statement and the constant disagree about where this site's public key is served, and one of them is wrong`,
      ],
    ],
    [
      "rejects a signed key path carrying a fragment the constant does not",
      { encryption: [`Encryption: ${fragmentEncryption}`] },
      [
        `public/.well-known/security.txt signs "Encryption: ${fragmentEncryption}", whose path is "${canary.publicKeyHref}#other", but lib/canary/canary.ts declares publicKeyHref "${canary.publicKeyHref}": the signed statement and the constant disagree about where this site's public key is served, and one of them is wrong`,
      ],
    ],
    [
      "rejects a signed key served from another origin",
      { encryption: [`Encryption: ${otherOriginEncryption}`] },
      [
        `public/.well-known/security.txt signs "Encryption: ${otherOriginEncryption}", whose origin is "https://elsewhere.example", but lib/canary/canary.ts declares siteOrigin "${canary.siteOrigin}": the signed statement and the constant disagree about the site serving this key, and one of them is wrong`,
      ],
    ],
    [
      "rejects a key host that merely starts with canary.siteOrigin",
      { encryption: [`Encryption: ${startsWithEncryption}`] },
      [
        `public/.well-known/security.txt signs "Encryption: ${startsWithEncryption}", whose origin is "${startsWithHost}", but lib/canary/canary.ts declares siteOrigin "${canary.siteOrigin}": the signed statement and the constant disagree about the site serving this key, and one of them is wrong`,
      ],
    ],
    [
      "reports both halves when origin and path are wrong together",
      { encryption: [`Encryption: ${bothWrongEncryption}`] },
      [
        `public/.well-known/security.txt signs "Encryption: ${bothWrongEncryption}", whose origin is "https://elsewhere.example", but lib/canary/canary.ts declares siteOrigin "${canary.siteOrigin}": the signed statement and the constant disagree about the site serving this key, and one of them is wrong`,
        `public/.well-known/security.txt signs "Encryption: ${bothWrongEncryption}", whose path is "/keys/elsewhere.asc", but lib/canary/canary.ts declares publicKeyHref "${canary.publicKeyHref}": the signed statement and the constant disagree about where this site's public key is served, and one of them is wrong`,
      ],
    ],
    [
      "rejects a key location whose https origin sits behind another scheme",
      { encryption: [`Encryption: ${blobEncryption}`] },
      [unreadableLinesMessage],
    ],
    [
      "rejects a key location served over plain http",
      { encryption: [`Encryption: ${httpEncryption}`] },
      [unreadableLinesMessage],
    ],
    [
      "rejects an https key location that is not a URL this can read",
      { encryption: [`Encryption: ${unreadableEncryption}`] },
      [
        `public/.well-known/security.txt signs "Encryption: ${unreadableEncryption}", which is not an https URL this can read, so nothing confirms canary.publicKeyHref`,
      ],
    ],
    [
      "rejects a security.txt that signs no https Encryption line at all",
      { encryption: [] },
      [unreadableLinesMessage],
    ],
    [
      "refuses to pick between two signed https Encryption lines",
      {
        encryption: [
          `Encryption: ${matchingEncryption}`,
          `Encryption: ${otherOriginEncryption}`,
        ],
      },
      [
        `public/.well-known/security.txt carries 2 "Encryption: https://<url>" lines, expected exactly one: the signed public key location cannot be read, so nothing confirms canary.publicKeyHref`,
      ],
    ],
    ["accepts the key location the published file signs", {}, []],
  ]

  it.each(cases)(
    "%s",
    async (_name, fields, expected) => {
      const dir = fixtureRoot()
      await securityTxtDeclaring(dir, fields)

      const result = await runVerify(dir)

      if (expected.length > 0) {
        expect(result.exitCode).not.toBe(0)
      }
      expect(publicKeyFailures(result.stderr)).toEqual(expected)
    },
    timeout
  )
})

describe("verify-asc chain", () => {
  const newest = "2026-07-26"
  const middle = "2026-06-26"
  const oldest = "2026-05-27"
  const dates = [oldest, middle, newest]

  it(
    "accepts an unbroken chain from the head down to a first statement with no previous line",
    async () => {
      const dir = fixtureRoot()
      await signedChain(dir, dates)

      const result = await runVerify(dir)

      expect(chainFailures(result.stderr)).toEqual([])
    },
    timeout
  )

  it(
    "rejects a head that declares a previous statement when none is published",
    async () => {
      const dir = fixtureRoot()
      const unpublished = sha256Hex("a statement that was never published")
      await signedChain(dir, [], unpublished)

      const result = await runVerify(dir)

      expect(result.exitCode).not.toBe(0)
      expect(chainFailures(result.stderr)).toEqual([
        `public/canary.asc chains to sha256:${unpublished}, but it is the oldest published statement and no earlier statement is published: an older statement has been removed`,
      ])
    },
    timeout
  )

  it(
    "rejects a chain with a deleted middle archive",
    async () => {
      const dir = fixtureRoot()
      const chain = await signedChain(dir, dates)
      unlinkSync(archivePath(dir, middle))

      const result = await runVerify(dir)

      expect(result.exitCode).not.toBe(0)
      expect(chainFailures(result.stderr)).toEqual([
        `/canary/${newest}.asc chains to sha256:${sha256Hex(statementOf(chain, middle))}, but /canary/${oldest}.asc hashes to sha256:${sha256Hex(statementOf(chain, oldest))}: published history is missing, altered, or out of order`,
      ])
    },
    timeout
  )

  it(
    "rejects a chain with a deleted oldest archive",
    async () => {
      const dir = fixtureRoot()
      const chain = await signedChain(dir, dates)
      unlinkSync(archivePath(dir, oldest))

      const result = await runVerify(dir)

      expect(result.exitCode).not.toBe(0)
      expect(chainFailures(result.stderr)).toEqual([
        `/canary/${middle}.asc chains to sha256:${sha256Hex(statementOf(chain, oldest))}, but it is the oldest published statement and no earlier statement is published: an older statement has been removed`,
      ])
    },
    timeout
  )

  it(
    "rejects a chain whose archives have been reordered",
    async () => {
      const dir = fixtureRoot()
      const chain = await signedChain(dir, dates)
      writeFileSync(archivePath(dir, middle), statementOf(chain, oldest))
      writeFileSync(archivePath(dir, oldest), statementOf(chain, middle))

      const result = await runVerify(dir)

      expect(result.exitCode).not.toBe(0)
      expect(chainFailures(result.stderr)).toEqual([
        `/canary/${newest}.asc chains to sha256:${sha256Hex(statementOf(chain, middle))}, but /canary/${middle}.asc hashes to sha256:${sha256Hex(statementOf(chain, oldest))}: published history is missing, altered, or out of order`,
        `/canary/${middle}.asc carries no "previous statement: sha256:<64 hex>" line, but /canary/${oldest}.asc is published as an earlier statement: the published chain cannot be walked through it`,
        `/canary/${oldest}.asc chains to sha256:${sha256Hex(statementOf(chain, oldest))}, but it is the oldest published statement and no earlier statement is published: an older statement has been removed`,
      ])
    },
    timeout
  )

  it(
    "rejects a chain whose archived statement body was altered",
    async () => {
      const dir = fixtureRoot()
      const chain = await signedChain(dir, dates)
      const tampered = statementOf(chain, oldest).replace(
        "i am not under duress.",
        "i am under duress."
      )
      expect(tampered).not.toBe(statementOf(chain, oldest))
      writeFileSync(archivePath(dir, oldest), tampered)

      const result = await runVerify(dir)

      expect(result.exitCode).not.toBe(0)
      expect(chainFailures(result.stderr)).toEqual([
        `/canary/${middle}.asc chains to sha256:${sha256Hex(statementOf(chain, oldest))}, but /canary/${oldest}.asc hashes to sha256:${sha256Hex(tampered)}: published history is missing, altered, or out of order`,
      ])
    },
    timeout
  )
})
