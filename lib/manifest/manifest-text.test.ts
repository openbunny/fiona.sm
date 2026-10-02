import { describe, expect, it } from "vitest"

import {
  buildManifestText,
  parseManifestEntries,
  parseManifestFingerprint,
} from "@/lib/manifest/manifest-text"

const fingerprint = "4820FA938BA2573DE08E4FAD45B4B5460D72A034"
const hashA = "a".repeat(64)
const hashB = "b".repeat(64)

describe("buildManifestText", () => {
  it("names the fingerprint and lists sorted entries as hash-slug pairs", () => {
    const text = buildManifestText({
      fingerprint,
      entries: [
        { slug: "alpha", sha256: hashA },
        { slug: "beta", sha256: hashB },
      ],
    })

    expect(text).toContain(
      "key fingerprint: 4820 fa93 8ba2 573d e08e 4fad 45b4 b546 0d72 a034"
    )
    expect(text).toContain(`${hashA}  alpha`)
    expect(text).toContain(`${hashB}  beta`)
    expect(text.endsWith("\n")).toBe(true)
  })

  it("round-trips through parseManifestFingerprint and parseManifestEntries", () => {
    const entries = [
      { slug: "alpha", sha256: hashA },
      { slug: "beta", sha256: hashB },
    ]
    const text = buildManifestText({ fingerprint, entries })

    expect(parseManifestFingerprint(text)).toBe(fingerprint)
    expect(parseManifestEntries(text)).toEqual(entries)
  })

  it("rejects entries not sorted by slug", () => {
    expect(() =>
      buildManifestText({
        fingerprint,
        entries: [
          { slug: "beta", sha256: hashB },
          { slug: "alpha", sha256: hashA },
        ],
      })
    ).toThrow(/not sorted by slug/)
  })

  it("rejects a duplicate slug", () => {
    expect(() =>
      buildManifestText({
        fingerprint,
        entries: [
          { slug: "alpha", sha256: hashA },
          { slug: "alpha", sha256: hashB },
        ],
      })
    ).toThrow(/not sorted by slug/)
  })

  it("rejects a sha256 that is not 64 lowercase hex characters", () => {
    expect(() =>
      buildManifestText({
        fingerprint,
        entries: [{ slug: "alpha", sha256: "not-a-hash" }],
      })
    ).toThrow(/expected 64 lowercase hex characters/)
  })

  it("rejects a slug that is not lowercase kebab-case", () => {
    expect(() =>
      buildManifestText({
        fingerprint,
        entries: [{ slug: "Alpha_Post", sha256: hashA }],
      })
    ).toThrow(/not lowercase kebab-case/)
  })

  it("rejects an invalid fingerprint", () => {
    expect(() =>
      buildManifestText({ fingerprint: "not-a-fingerprint", entries: [] })
    ).toThrow()
  })
})

describe("parseManifestFingerprint", () => {
  it("throws when no fingerprint line is present", () => {
    expect(() => parseManifestFingerprint("no fingerprint here\n")).toThrow(
      /carries no "key fingerprint/
    )
  })
})

describe("parseManifestEntries", () => {
  it("returns an empty list when there are no entry lines", () => {
    expect(parseManifestEntries("ordinary prose\n")).toEqual([])
  })

  it("ignores a line with a single space instead of two", () => {
    expect(parseManifestEntries(`${hashA} alpha\n`)).toEqual([])
  })

  it("throws on a manifest carrying two entries for the same slug", () => {
    expect(() =>
      parseManifestEntries(`${hashA}  alpha\n${hashB}  alpha\n`)
    ).toThrow(/more than one entry for "alpha"/)
  })
})
