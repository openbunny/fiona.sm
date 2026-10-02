import { describe, expect, it } from "vitest"

import { alt, contentType, size } from "@/app/blog/opengraph-image"

describe("blog opengraph image metadata", () => {
  it("exports size and contentType", () => {
    expect(size).toEqual({ width: 1200, height: 630 })
    expect(contentType).toBe("image/png")
  })

  it("names in alt the caption the card draws, beside the picture", () => {
    expect(alt).toContain('"blog"')
    expect(alt).toMatch(/cat/)
  })

  it("keeps visitor-facing text lowercase", () => {
    expect(alt).toBe(alt.toLowerCase())
  })
})
