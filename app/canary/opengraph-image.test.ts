import { describe, expect, it } from "vitest"

import { alt, contentType, size } from "@/app/canary/opengraph-image"
import { canary } from "@/lib/canary/canary"
import { formatLongDate } from "@/lib/iso-date"

describe("canary opengraph image metadata", () => {
  it("exports size and contentType", () => {
    expect(size).toEqual({ width: 1200, height: 630 })
    expect(contentType).toBe("image/png")
  })

  it("names in alt the caption the card draws, beside the picture", () => {
    expect(alt).toContain('"key canary"')
    expect(alt).toMatch(/cat/)
  })

  it("states in alt both dates the card draws, so a stale unfurl is visible", () => {
    expect(alt).toContain(formatLongDate(canary.signedOn))
    expect(alt).toContain(formatLongDate(canary.renewBy))
  })

  it("states nothing in alt that the card does not draw", () => {
    expect(alt).not.toContain(canary.fingerprint)
  })

  it("keeps visitor-facing text lowercase", () => {
    expect(alt).toBe(alt.toLowerCase())
  })
})
