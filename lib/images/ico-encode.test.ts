import { describe, expect, it } from "vitest"

import { pngsToIco } from "@/lib/images/ico-encode"

function fakePng(size: number): Uint8Array {
  const bytes = new Uint8Array(24)
  bytes[0] = size
  return bytes
}

describe("pngsToIco", () => {
  it("refuses an empty list rather than writing a header for no images", () => {
    expect(() => pngsToIco([])).toThrow("ICO requires at least one PNG")
  })

  it("writes an ico header for 16, 32, and 48 pixel pngs", () => {
    const ico = pngsToIco([
      { size: 16, png: fakePng(16) },
      { size: 32, png: fakePng(32) },
      { size: 48, png: fakePng(48) },
    ])
    const view = new DataView(ico.buffer)
    expect(view.getUint16(0, true)).toBe(0)
    expect(view.getUint16(2, true)).toBe(1)
    expect(view.getUint16(4, true)).toBe(3)
    expect(ico[6]).toBe(16)
    expect(ico[22]).toBe(32)
    expect(ico[38]).toBe(48)
  })
})
