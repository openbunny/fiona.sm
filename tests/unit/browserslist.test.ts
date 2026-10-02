import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

function packageBrowserslist(): unknown {
  const raw: unknown = JSON.parse(readFileSync("package.json", "utf8"))
  if (typeof raw !== "object" || raw === null || !("browserslist" in raw)) {
    throw new Error("missing browserslist")
  }

  return raw["browserslist"]
}

describe("browserslist", () => {
  it("matches next.js 16 supported browsers", () => {
    expect(packageBrowserslist()).toEqual([
      "chrome 111",
      "edge 111",
      "firefox 111",
      "safari 16.4",
    ])
  })
})
