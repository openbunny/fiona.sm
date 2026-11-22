import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const redirects = readFileSync("public/_redirects", "utf8").trim().split("\n")

describe("cv publication", () => {
  it("routes canonical PDF and aliases without exposing private source", () => {
    expect(redirects).toContain("/cv /cv.pdf 200")
    expect(redirects).toContain("/resume /cv 308")
    expect(redirects).toContain("/CV /cv 308")
  })

  it("publishes no resume source and no other person's PDF", () => {
    function paths(dir: string): string[] {
      return readdirSync(dir).flatMap((name) => {
        const file = join(dir, name)
        return statSync(file).isDirectory() ? paths(file) : [file]
      })
    }

    const files = paths("public")
    expect(files.filter((file) => /\.typ$/u.test(file))).toEqual([])
    expect(files.filter((file) => /\.pdf$/u.test(file))).toEqual(
      existsSync("public/cv.pdf") ? ["public/cv.pdf"] : []
    )
  })

  it.skipIf(!existsSync("public/cv.pdf"))("validates the published PDF", () => {
    const pdf = readFileSync("public/cv.pdf")
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
    expect(pdf.length).toBeGreaterThan(1024)
  })
})
