import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

describe("tailwind @source paths in globals.css", () => {
  it("every @source directive resolves to a non-empty directory", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8")
    const paths = css
      .split("\n")
      .filter((line) => line.startsWith('@source "'))
      .map((line) => line.slice(line.indexOf('"') + 1, line.lastIndexOf('"')))
      .map((relative) => resolve(process.cwd(), "app", relative))
    expect(paths.length).toBeGreaterThan(0)

    const broken = paths.filter(
      (path) => !existsSync(path) || readdirSync(path).length === 0
    )
    expect(broken).toEqual([])
  })
})
