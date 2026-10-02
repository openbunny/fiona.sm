import { existsSync, readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fontFiles } from "@/lib/images/font-files"
import { loadOgFonts, ogFontFamily } from "@/lib/images/og-fonts"

afterEach(() => {
  vi.doUnmock("node:fs/promises")
  vi.resetModules()
})

describe("fontFiles", () => {
  it("resolves theme package fonts for image rendering", () => {
    expect(fontFiles.courierPrime).toContain("@openbunny/theme/fonts")
    expect(fontFiles.jetbrainsMono).toContain("@openbunny/theme/fonts")
    expect(fontFiles.courierPrime.endsWith(".woff")).toBe(true)
    expect(fontFiles.jetbrainsMono.endsWith(".woff")).toBe(true)
    expect(existsSync(fontFiles.courierPrime)).toBe(true)
    expect(existsSync(fontFiles.jetbrainsMono)).toBe(true)
  })

  it("keeps app fonts self-hosted through the theme package", () => {
    const source = readFileSync("app/fonts.ts", "utf8")
    expect(source).toContain("@openbunny/theme/css/fonts.css")
    expect(source).not.toContain("next/font/google")
  })
})

describe("loadOgFonts", () => {
  it("refuses font bytes that do not view an ArrayBuffer", async () => {
    vi.resetModules()
    vi.doMock("node:fs/promises", () => {
      const readFile = (): Promise<Uint8Array> =>
        Promise.resolve(new Uint8Array(new SharedArrayBuffer(8)))
      return { readFile, default: { readFile } }
    })

    const { loadOgFonts: loadShared } = await import("@/lib/images/og-fonts")

    await expect(loadShared()).rejects.toThrow(
      "Font bytes must view an ArrayBuffer"
    )
  })

  it("loads courier prime 400 and jetbrains mono 400 from packages", async () => {
    const fonts = await loadOgFonts()
    expect(fonts).toEqual([
      {
        name: ogFontFamily.display,
        data: fonts[0]?.data,
        weight: 400,
        style: "normal",
      },
      {
        name: ogFontFamily.mono,
        data: fonts[1]?.data,
        weight: 400,
        style: "normal",
      },
    ])
    expect(fonts[0]?.data.byteLength).toBeGreaterThan(1000)
    expect(fonts[1]?.data.byteLength).toBeGreaterThan(1000)
  })
})
