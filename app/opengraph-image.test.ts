import { describe, expect, it } from "vitest"

import { alt, contentType, size } from "@/app/opengraph-image"
import { site } from "@/lib/site/site"

describe("home opengraph image metadata", () => {
  it("exports size and contentType", () => {
    expect(size).toEqual({ width: 1200, height: 630 })
    expect(contentType).toBe("image/png")
  })

  it("names in alt the words the card draws", () => {
    expect(alt).toContain(site.homeTitle)
  })

  it("describes the picture rather than restating the page description", () => {
    expect(alt).not.toContain(site.description)
    expect(alt).toMatch(/rabbit/)
  })

  it("keeps visitor-facing text lowercase", () => {
    expect(alt).toBe(alt.toLowerCase())
  })
})
