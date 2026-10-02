import sharp from "sharp"
import { describe, expect, it } from "vitest"

import { svgToPng } from "@/lib/images/svg-png"

const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#ffffff"/>
  <rect x="8" y="8" width="16" height="16" fill="#000000"/>
</svg>
`

describe("svgToPng", () => {
  it("rasterizes an svg to a square png", async () => {
    const png = await svgToPng(squareSvg, 180)
    const meta = await sharp(png).metadata()
    expect(meta.format).toBe("png")
    expect(meta.width).toBe(180)
    expect(meta.height).toBe(180)
  })
})
