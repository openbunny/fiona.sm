import { describe, expect, it } from "vitest"

import { loadOgArt, ogArtFiles } from "@/lib/images/og-art"

const entries = Object.entries(ogArtFiles)

describe("og art", () => {
  it("names one file per card, so no card falls back to another's artwork", () => {
    expect(
      entries.length,
      "no artwork was declared, so the checks below would pass having read nothing"
    ).toBeGreaterThanOrEqual(4)
    expect(new Set(Object.values(ogArtFiles)).size).toBe(entries.length)
  })

  it.each(entries)(
    "loads %s as a self-contained data uri with the file's own dimensions",
    async (_name, file) => {
      const art = await loadOgArt(file)

      expect(art.src.startsWith("data:image/png;base64,")).toBe(true)
      expect(art.src).not.toMatch(/https?:\/\//)
      expect(art.width).toBeGreaterThan(0)
      expect(art.height).toBeGreaterThan(0)
    }
  )

  it("refuses a file that is not a png, rather than embedding undecodable bytes", async () => {
    await expect(loadOgArt("package.json")).rejects.toThrow(/is not a png/)
  })
})
