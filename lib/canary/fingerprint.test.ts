import { describe, expect, it } from "vitest"

import { fingerprintLine, fingerprintRows } from "@/lib/canary/fingerprint"

const sampleFingerprint = "AE1B22CE50A9BF418806DB1D72068EC01B6A2CF8"

describe("fingerprintRows", () => {
  it("groups a v4 fingerprint into two rows of five", () => {
    expect(fingerprintRows(sampleFingerprint)).toEqual({
      top: "AE1B 22CE 50A9 BF41 8806",
      bottom: "DB1D 7206 8EC0 1B6A 2CF8",
    })
  })

  it("accepts lowercase hex and internal whitespace", () => {
    expect(
      fingerprintRows("ae1b 22ce 50a9 bf41 8806 db1d 7206 8ec0 1b6a 2cf8")
    ).toEqual(fingerprintRows(sampleFingerprint))
  })

  it("rejects a fingerprint that is one character short", () => {
    expect(() => fingerprintRows(sampleFingerprint.slice(0, 39))).toThrow(
      /40 hex characters/
    )
  })

  it("rejects a fingerprint that is one character long", () => {
    expect(() => fingerprintRows(`${sampleFingerprint}A`)).toThrow(
      /40 hex characters/
    )
  })

  it("rejects non-hex characters even at length 40", () => {
    expect(() => fingerprintRows("G".repeat(40))).toThrow(/40 hex characters/)
  })
})

describe("fingerprintLine", () => {
  it("joins a v4 fingerprint into one line of ten groups", () => {
    expect(fingerprintLine(sampleFingerprint)).toBe(
      "AE1B 22CE 50A9 BF41 8806 DB1D 7206 8EC0 1B6A 2CF8"
    )
  })

  it("accepts lowercase hex and internal whitespace", () => {
    expect(
      fingerprintLine("ae1b 22ce 50a9 bf41 8806 db1d 7206 8ec0 1b6a 2cf8")
    ).toBe(fingerprintLine(sampleFingerprint))
  })

  it("rejects a fingerprint that is one character short", () => {
    expect(() => fingerprintLine(sampleFingerprint.slice(0, 39))).toThrow(
      /40 hex characters/
    )
  })

  it("rejects non-hex characters even at length 40", () => {
    expect(() => fingerprintLine("G".repeat(40))).toThrow(/40 hex characters/)
  })
})
