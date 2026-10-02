import { describe, expect, it } from "vitest"

import { patchCanarySource } from "@/lib/renew/canary-module"

const priorFingerprint = "1111111111111111111111111111111111111111"

const sample = `const priorFingerprints: readonly string[] = [
  "${priorFingerprint}",
]

export const canary = {
  name: "Fiona P",
  fingerprint: "AE1B22CE50A9BF418806DB1D72068EC01B6A2CF8",
  algorithm: "Ed25519",
  signedOn: "2026-08-25",
  signedAt: "2026-08-25T17:05:22Z",
  renewBy: "2026-11-25",
  moneroBlockHeight: 3748120,
  moneroBlockHash: "2852fc32d11b2811025102bb435a0f655fa92769f103d8c40ca5bd214f48b893",
  previousStatementHash: "138f57d7487d5f54e7f1b92733ead3a330b89721fa99925cb05840cf6642eb8e",
} as const
`

const freshChainSample = sample.replace(
  '  previousStatementHash: "138f57d7487d5f54e7f1b92733ead3a330b89721fa99925cb05840cf6642eb8e",\n',
  "  previousStatementHash: undefined as string | undefined,\n"
)

const fields = {
  fingerprint: "F39854405552A54D3503D0F65E86E684E851380C",
  priorFingerprints: [
    priorFingerprint,
    "AE1B22CE50A9BF418806DB1D72068EC01B6A2CF8",
  ],
  algorithm: "Ed25519",
  signedOn: "2026-08-26",
  signedAt: "2026-08-26T09:14:07Z",
  renewBy: "2026-11-24",
  moneroBlockHeight: 3748842,
  moneroBlockHash:
    "55e6d6a1c45bdcd1926b3253150b236d11e25bab4bc67b9fac18bc9ca04db2a8",
  previousStatementHash:
    "8d9d6e8cd893814f843b0c4f8c9492da39a3fd81196f6f78a62e09186f719d45",
}

describe("patchCanarySource", () => {
  it("replaces identity fields the canary owns", () => {
    const next = patchCanarySource(sample, fields)

    expect(next).toContain(
      'fingerprint: "F39854405552A54D3503D0F65E86E684E851380C"'
    )
    expect(next).toContain('signedOn: "2026-08-26"')
    expect(next).toContain('signedAt: "2026-08-26T09:14:07Z"')
    expect(next).toContain('renewBy: "2026-11-24"')
    expect(next).toContain('algorithm: "Ed25519"')
    expect(next).toContain("moneroBlockHeight: 3748842")
    expect(next).toContain(`moneroBlockHash: "${fields.moneroBlockHash}"`)
    expect(next).toContain(
      `previousStatementHash: "${fields.previousStatementHash}"`
    )
    expect(next).not.toContain(
      'fingerprint: "AE1B22CE50A9BF418806DB1D72068EC01B6A2CF8"'
    )
    expect(next).not.toContain("2026-08-25")
    expect(next).toContain('  "1111111111111111111111111111111111111111",')
    expect(next).toContain('  "AE1B22CE50A9BF418806DB1D72068EC01B6A2CF8",')
  })

  it("refuses a source that has no signedAt field", () => {
    expect(() =>
      patchCanarySource(sample.replace(/ {2}signedAt: "[^"]*",\n/, ""), fields)
    ).toThrow(/Missing signedAt/)
  })

  it("patches the constant and not a commented-out field above it", () => {
    const commented = `// signedOn: "1999-01-01"\n${sample}`
    const next = patchCanarySource(commented, fields)

    expect(next).toContain('// signedOn: "1999-01-01"')
    expect(next).toContain('  signedOn: "2026-08-26",')
  })

  it("refuses a source where a field appears twice", () => {
    const duplicated = sample.replace(
      '  signedOn: "2026-08-25",\n',
      '  signedOn: "2026-08-25",\n  signedOn: "2026-08-25",\n'
    )

    expect(() => patchCanarySource(duplicated, fields)).toThrow(
      /signedOn appears 2 times/
    )
  })

  it("refuses a value containing a quote", () => {
    expect(() =>
      patchCanarySource(sample, { ...fields, signedOn: 'X" , evil: "1' })
    ).toThrow(/Refusing to patch signedOn/)
  })

  it("leaves the source untouched when a later value is rejected", () => {
    expect(() =>
      patchCanarySource(sample, { ...fields, renewBy: "2026-11-24; rm -rf /" })
    ).toThrow(/Refusing to patch renewBy/)
  })

  it("refuses an empty value", () => {
    expect(() =>
      patchCanarySource(sample, { ...fields, algorithm: "" })
    ).toThrow(/Refusing to patch algorithm/)
  })

  it("refuses duplicate prior fingerprints", () => {
    expect(() =>
      patchCanarySource(sample, {
        ...fields,
        priorFingerprints: [priorFingerprint, priorFingerprint],
      })
    ).toThrow(/Duplicate prior fingerprint/)
  })

  it("refuses the current fingerprint in prior fingerprints", () => {
    expect(() =>
      patchCanarySource(sample, {
        ...fields,
        priorFingerprints: [...fields.priorFingerprints, fields.fingerprint],
      })
    ).toThrow(/Rotation is one-way.*retired fingerprint.*current/i)
  })

  it("refuses a malformed fingerprint", () => {
    expect(() =>
      patchCanarySource(sample, { ...fields, fingerprint: "not-a-fingerprint" })
    ).toThrow(/Refusing to patch fingerprint/)
  })

  it("refuses a moneroBlockHash that is not 64 lower hex", () => {
    expect(() =>
      patchCanarySource(sample, { ...fields, moneroBlockHash: "deadbeef" })
    ).toThrow(/Refusing to patch moneroBlockHash/)
  })

  it("refuses an uppercased moneroBlockHash", () => {
    expect(() =>
      patchCanarySource(sample, {
        ...fields,
        moneroBlockHash: fields.moneroBlockHash.toUpperCase(),
      })
    ).toThrow(/Refusing to patch moneroBlockHash/)
  })

  it("refuses a malformed previousStatementHash", () => {
    expect(() =>
      patchCanarySource(sample, {
        ...fields,
        previousStatementHash: "NOT-A-HASH",
      })
    ).toThrow(/Refusing to patch previousStatementHash/)
  })

  it("leaves the existing previousStatementHash untouched when the field is omitted", () => {
    const { previousStatementHash: _omitted, ...withoutHash } = fields
    const next = patchCanarySource(sample, withoutHash)

    expect(next).toContain(
      'previousStatementHash: "138f57d7487d5f54e7f1b92733ead3a330b89721fa99925cb05840cf6642eb8e"'
    )
  })

  it("patches a hash over the absent previousStatementHash a fresh chain leaves behind", () => {
    const next = patchCanarySource(freshChainSample, fields)

    expect(next).toContain(
      `previousStatementHash: "${fields.previousStatementHash}"`
    )
    expect(next).not.toContain("undefined as string | undefined")
  })

  it("patches a new hash over an existing quoted previousStatementHash", () => {
    const next = patchCanarySource(sample, fields)

    expect(next).toContain(
      `previousStatementHash: "${fields.previousStatementHash}"`
    )
    expect(next).not.toContain(
      "138f57d7487d5f54e7f1b92733ead3a330b89721fa99925cb05840cf6642eb8e"
    )
  })

  it("clears an existing quoted previousStatementHash back to the absent form", () => {
    const next = patchCanarySource(sample, {
      ...fields,
      previousStatementHash: null,
    })

    expect(next).toContain(
      "previousStatementHash: undefined as string | undefined,"
    )
    expect(next).not.toContain(
      "138f57d7487d5f54e7f1b92733ead3a330b89721fa99925cb05840cf6642eb8e"
    )
  })

  it("leaves an absent previousStatementHash absent when clearing it again", () => {
    const next = patchCanarySource(freshChainSample, {
      ...fields,
      previousStatementHash: null,
    })

    expect(next).toContain(
      "previousStatementHash: undefined as string | undefined,"
    )
  })

  it("refuses malformed prior fingerprints", () => {
    expect(() =>
      patchCanarySource(sample, {
        ...fields,
        priorFingerprints: ["not-a-fingerprint"],
      })
    ).toThrow(/Invalid prior fingerprint/)
  })
})
