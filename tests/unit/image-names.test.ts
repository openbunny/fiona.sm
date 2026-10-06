import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename, extname } from "node:path"

import { describe, expect, it } from "vitest"

import { contentName, imageExtensions } from "@/lib/images/content-name"
import { icoPath } from "@/lib/images/icon-files"

const fixedNames: readonly string[] = [icoPath]

const imageFiles = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" }
)
  .split("\0")
  .filter((path) =>
    imageExtensions.some((extension) =>
      path.toLowerCase().endsWith(`.${extension}`)
    )
  )
  .filter((path) => existsSync(path))

describe("image file names", () => {
  it("finds images to check, so an empty listing cannot pass", () => {
    expect(imageFiles.length).toBeGreaterThan(fixedNames.length)
  })

  it("keeps each fixed-name exception in the listing", () => {
    for (const path of fixedNames) {
      expect(imageFiles).toContain(path)
    }
  })

  it.each(imageFiles.filter((path) => !fixedNames.includes(path)))(
    "names %s by the sha-512 of its content",
    (path) => {
      const extension = extname(path).slice(1)
      expect(basename(path)).toBe(
        contentName(readFileSync(path), extension.toLowerCase())
      )
    }
  )
})
