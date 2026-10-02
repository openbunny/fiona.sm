import { existsSync } from "node:fs"

import { ImageResponse } from "next/og"
import { describe, expect, it } from "vitest"

import OpengraphImage, {
  alt,
  contentType,
  size,
} from "@/app/blog/openbunny-bulk-release/opengraph-image"
import { ogArtFiles } from "@/lib/images/og-art"

describe("openbunny-bulk-release opengraph image metadata", () => {
  it("exports size and contentType", () => {
    expect(size).toEqual({ width: 1200, height: 630 })
    expect(contentType).toBe("image/png")
  })

  it("builds a card, so the route fails here rather than serving a blank one", async () => {
    await expect(OpengraphImage()).resolves.toBeInstanceOf(ImageResponse)
  })

  it("draws artwork this post publishes", () => {
    expect(existsSync(ogArtFiles.openbunnyBulkRelease)).toBe(true)
  })

  it("names in alt the caption the card draws, beside the picture", () => {
    expect(alt).toContain(
      '"safari extensions, component libraries and this site\'s source"'
    )
    expect(alt).toMatch(/puppy swimming happily/)
  })

  it("keeps visitor-facing text lowercase", () => {
    expect(alt).toBe(alt.toLowerCase())
  })
})
