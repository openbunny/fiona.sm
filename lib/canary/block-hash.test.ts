import { describe, expect, it } from "vitest"

import { blockHashPrefix } from "@/lib/canary/block-hash"

const sampleHash =
  "c09507ace9368fe976addaedcd30680b736f66d6e70fbe9c652d789d06c45a96"

describe("blockHashPrefix", () => {
  it("returns the first eight characters of the hash, marked as truncated", () => {
    expect(blockHashPrefix(sampleHash)).toBe("c09507ac…")
  })

  it("accepts uppercase hex", () => {
    expect(blockHashPrefix(sampleHash.toUpperCase())).toBe("c09507ac…")
  })

  it("rejects a hash that is one character short", () => {
    expect(() => blockHashPrefix(sampleHash.slice(0, 63))).toThrow(
      /64 hex characters/
    )
  })

  it("rejects a hash that is one character long", () => {
    expect(() => blockHashPrefix(`${sampleHash}0`)).toThrow(/64 hex characters/)
  })

  it("rejects non-hex characters even at length 64", () => {
    expect(() => blockHashPrefix("g".repeat(64))).toThrow(/64 hex characters/)
  })
})
