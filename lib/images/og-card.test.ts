import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { ogContentType, ogSize } from "@/lib/images/og-card"

const source = readFileSync(
  join(process.cwd(), "lib/images/og-card.tsx"),
  "utf8"
)

describe("the shared og card", () => {
  it("renders at the size every unfurl expects", () => {
    expect(ogSize).toEqual({ width: 1200, height: 630 })
    expect(ogContentType).toBe("image/png")
  })

  it("does not fall back to times, georgia, or courier", () => {
    expect(source).not.toMatch(/Times New Roman|Georgia|Courier/)
  })

  it("takes its faces from the shared loader", () => {
    expect(source).toContain("ogFontFamily")
    expect(source).toContain("loadOgFonts")
  })

  it("does not set italic type", () => {
    expect(source).not.toMatch(/italic/)
  })

  it("fetches nothing off-origin at generation time", () => {
    expect(source).not.toMatch(/fetch\(/)
    expect(source).not.toMatch(/https?:\/\//)
  })

  it("never scales artwork past its own resolution", () => {
    expect(source).toContain("Math.min")
    expect(source).toMatch(/artBox\.width \/ art\.width,\s*1\s*\)/)
  })
})

describe("rendering a card", () => {
  it("returns a png response at the declared size", async () => {
    const { ogCard } = await import("@/lib/images/og-card")
    const { ogArtFiles } = await import("@/lib/images/og-art")

    const response = await ogCard({
      artwork: ogArtFiles.home,
      title: "fiona's website",
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("image/png")
  })

  it("renders a card carrying a note as well as one without", async () => {
    const { ogCard } = await import("@/lib/images/og-card")
    const { ogArtFiles } = await import("@/lib/images/og-art")

    const noted = await ogCard({
      artwork: ogArtFiles.canary,
      title: "key canary",
      note: "signed 30 september 2026",
    })

    expect(noted.status).toBe(200)
  })

  it("refuses artwork that is not a png, rather than rendering a broken card", async () => {
    const { ogCard } = await import("@/lib/images/og-card")

    await expect(
      ogCard({ artwork: "package.json", title: "whatever" })
    ).rejects.toThrow(/is not a png/)
  })
})
