import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { verifyClearsigned } from "@/lib/openpgp-armor"
import { buildCanaryPlaintext } from "@/lib/renew/canary-text"

const sampleHash =
  "cd26a0d4b4bb3eebe5f6d947bd7d0ee5c56ef6274e91b830b980e647c35e1b3c"
const previousStatementHash =
  "8d9d6e8cd893814f843b0c4f8c9492da39a3fd81196f6f78a62e09186f719d45"

const clauses = [
  "1. i have sole control of the private key matching the fingerprint published on this page.",
  "2. i have not disclosed that private key to any third party.",
  "3. i have not been compelled to produce cryptographic keys or plaintext.",
  "4. i have not been served with a secret warrant, gag order, or national security letter.",
  "5. i am not under duress.",
]

function numberedClauses(text: string): string[] {
  return text.split("\n").filter((line) => /^\d+\. /.test(line))
}

describe("the five clauses", () => {
  it("emits exactly the five clauses, in order, and no others", () => {
    const text = buildCanaryPlaintext({
      name: "fiona",
      email: "mail@fiona.sm",
      signedAt: "2026-08-25T17:05:22Z",
      renewBy: "2026-11-25",
      moneroBlockHeight: 3747941,
      moneroBlockHash: sampleHash,
      previousStatementHash,
    })

    expect(numberedClauses(text)).toEqual(clauses)
  })

  it("pins the clauses the card signed, not another copy of them", async () => {
    const root = process.cwd()
    const cleartext = await verifyClearsigned(
      readFileSync(join(root, "public/canary.asc"), "utf8"),
      readFileSync(join(root, "public/fiona.asc"), "utf8")
    )

    expect(numberedClauses(cleartext)).toEqual(clauses)
  })
})

describe("buildCanaryPlaintext", () => {
  it("includes identity, dates, and a monero block hash as proof of date", () => {
    const text = buildCanaryPlaintext({
      name: "fiona",
      email: "mail@fiona.sm",
      signedAt: "2026-08-25T17:05:22Z",
      renewBy: "2026-11-25",
      moneroBlockHeight: 3747941,
      moneroBlockHash: sampleHash,
      previousStatementHash,
    })

    expect(text).toContain("i am fiona <mail@fiona.sm>.")
    expect(text).toContain("as of 25 august 2026 17:05 utc:")
    expect(text).toContain(
      "if the signature fails to verify against the published key, what you are reading is not what i signed: treat it as tampered with."
    )
    expect(text).toContain(
      "if this page is not renewed with a freshly signed statement by 25 november 2026, this statement no longer speaks for today. a missed renewal alone is not proof that the key is compromised."
    )
    expect(text).not.toContain("assume the opposite")
    expect(text).toContain(
      `previous statement: sha256:${previousStatementHash}`
    )
    expect(text).toContain("proof of date: monero block 3747941")
    expect(text).toContain(sampleHash)
    expect(text).not.toContain("headline")
    expect(text.endsWith("\n")).toBe(true)
  })

  it("is lowercase apart from the email address and the hex hashes", () => {
    const text = buildCanaryPlaintext({
      name: "fiona",
      email: "mail@fiona.sm",
      signedAt: "2026-08-25T17:05:22Z",
      renewBy: "2026-11-25",
      moneroBlockHeight: 3747941,
      moneroBlockHash: sampleHash,
      previousStatementHash,
    })

    const withoutIdentifiers = text
      .replaceAll("mail@fiona.sm", "")
      .split(sampleHash)
      .join("")
      .split(previousStatementHash)
      .join("")

    expect(withoutIdentifiers).toBe(withoutIdentifiers.toLowerCase())
  })

  it("omits the previous statement line for a first-of-chain statement", () => {
    const text = buildCanaryPlaintext({
      name: "fiona",
      email: "mail@fiona.sm",
      signedAt: "2026-08-25T17:05:22Z",
      renewBy: "2026-11-25",
      moneroBlockHeight: 3747941,
      moneroBlockHash: sampleHash,
    })

    expect(text).not.toMatch(/previous statement/i)
    const lines = text.split("\n")
    expect(lines.at(-2)).toBe(sampleHash)
    expect(lines.at(-1)).toBe("")
  })

  it("rejects a block hash that is not 64 hex characters", () => {
    expect(() =>
      buildCanaryPlaintext({
        name: "fiona",
        email: "mail@fiona.sm",
        signedAt: "2026-08-25T17:05:22Z",
        renewBy: "2026-11-25",
        moneroBlockHeight: 1,
        moneroBlockHash: "deadbeef",
        previousStatementHash,
      })
    ).toThrow(/64 hex/)
  })

  it("rejects a signing instant that is only a date", () => {
    expect(() =>
      buildCanaryPlaintext({
        name: "fiona",
        email: "mail@fiona.sm",
        signedAt: "2026-08-25",
        renewBy: "2026-11-25",
        moneroBlockHeight: 1,
        moneroBlockHash: sampleHash,
        previousStatementHash,
      })
    ).toThrow(/Invalid ISO instant/)
  })

  it("rejects an invalid previous statement hash when one is supplied", () => {
    expect(() =>
      buildCanaryPlaintext({
        name: "fiona",
        email: "mail@fiona.sm",
        signedAt: "2026-08-25T17:05:22Z",
        renewBy: "2026-11-25",
        moneroBlockHeight: 1,
        moneroBlockHash: sampleHash,
        previousStatementHash: "deadbeef",
      })
    ).toThrow(/Previous statement hash/)
  })
})
