import { existsSync, readFileSync } from "node:fs"

import sharp from "sharp"
import { describe, expect, it } from "vitest"

import { iconPaths, ink, paper } from "@/lib/images/icon-files"

async function firstPixel(
  bytes: Uint8Array
): Promise<Readonly<{ r: number; g: number; b: number; a: number }>> {
  const { data } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const r = data[0]
  const g = data[1]
  const b = data[2]
  const a = data[3]
  if (
    r === undefined ||
    g === undefined ||
    b === undefined ||
    a === undefined
  ) {
    throw new Error("PNG is missing RGBA")
  }

  return { r, g, b, a }
}

async function pixelAt(
  bytes: Uint8Array,
  x: number,
  y: number
): Promise<Readonly<{ r: number; g: number; b: number; a: number }>> {
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const cx = Math.floor(info.width / 2)
  const cy = Math.floor(info.height / 2)
  const px = cx + x
  const py = cy + y
  const offset = (py * info.width + px) * 4
  const [r, g, b, a] = data.slice(offset, offset + 4)
  if (
    r === undefined ||
    g === undefined ||
    b === undefined ||
    a === undefined
  ) {
    throw new Error("PNG is missing RGBA")
  }

  return { r, g, b, a }
}

const paperRgb = {
  r: Number.parseInt(paper.slice(1, 3), 16),
  g: Number.parseInt(paper.slice(3, 5), 16),
  b: Number.parseInt(paper.slice(5, 7), 16),
  a: 255,
}

describe("committed icons", () => {
  it("keeps svg, ico, apple, manifest, maskable, and safari files", () => {
    for (const path of Object.values(iconPaths)) {
      expect({ path, exists: existsSync(path) }).toEqual({
        path,
        exists: true,
      })
    }
  })

  it("stores the bunny ears, not a live font, in the svg favicon", () => {
    const svg = readFileSync(iconPaths.svg, "utf8")
    expect(svg).toContain("<path ")
    expect(svg).not.toContain("font-family")
    expect(svg).not.toContain("<text")
    expect(svg).toContain("<rect")
    expect(svg).toContain(`fill="${paper}"`)
    expect(svg).toContain("#d299ab")
    expect(svg).toContain("#f9b7cf")
    expect(svg).toContain("#fbf1f5")
  })

  it("stores apple and manifest pngs at the required sizes", async () => {
    const apple = await sharp(readFileSync(iconPaths.apple)).metadata()
    const png192 = await sharp(readFileSync(iconPaths.png192)).metadata()
    const png512 = await sharp(readFileSync(iconPaths.png512)).metadata()
    expect(apple.width).toBe(180)
    expect(png192.width).toBe(192)
    expect(png512.width).toBe(512)
  })

  it("keeps rounded-corner pngs transparent at the corner and opaque paper in the field", async () => {
    for (const path of [iconPaths.apple, iconPaths.png192, iconPaths.png512]) {
      const bytes = readFileSync(path)
      expect(await firstPixel(bytes)).toEqual({ r: 0, g: 0, b: 0, a: 0 })
      expect(await pixelAt(bytes, 0, 0)).toEqual(paperRgb)
    }
  })

  it("keeps maskable pngs full-bleed opaque paper", async () => {
    for (const path of [iconPaths.maskable192, iconPaths.maskable512]) {
      const bytes = readFileSync(path)
      expect(await firstPixel(bytes)).toEqual(paperRgb)
      expect(await pixelAt(bytes, 0, 0)).toEqual(paperRgb)
    }
  })

  it("keeps the safari mask icon a silhouette without a paper card", () => {
    const safari = readFileSync(iconPaths.safari, "utf8")
    expect(safari).toContain("<path ")
    expect(safari).not.toContain("<rect")
    expect(safari).toContain(ink)
  })
})
