import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROUTE_FILE = "app/canary/page.tsx"

function source(file: string): string {
  return readFileSync(join(process.cwd(), file), "utf8")
}

describe("app/canary/page.tsx thinly wraps the shared canary composition", () => {
  it("renders app/canary/page.tsx as a thin wrapper around the shared CanaryPage", () => {
    const code = source(ROUTE_FILE)

    expect(code).toMatch(/<CanaryPage\b/)
    expect(
      code,
      `${ROUTE_FILE} builds a section directly instead of reusing CanaryPage`
    ).not.toMatch(/PageSection|SectionHeading/)
  })

  it("keeps js-only and no-JS fallback markup inside components, not the route file", () => {
    const code = source(ROUTE_FILE)

    expect(
      code,
      `${ROUTE_FILE} should not define its own js-only or noscript markup`
    ).not.toMatch(/js-only|noscript/)
  })

  it("defines each section title exactly once, in canary-page.tsx", () => {
    const canaryPageSource = source("components/canary/canary-page.tsx")
    const routeSource = source(ROUTE_FILE)

    for (const title of [
      "statement",
      "public key",
      "verify",
      "proof of date",
    ]) {
      const literal = `"${title}"`
      const escapedLiteral = literal.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&")
      const definitions = (
        canaryPageSource.match(new RegExp(` = ${escapedLiteral}`, "g")) ?? []
      ).length

      expect(
        definitions,
        `expected exactly one const definition of ${literal} in canary-page.tsx`
      ).toBe(1)

      expect(
        routeSource.includes(literal),
        `${ROUTE_FILE} should not redefine the ${title} title itself`
      ).toBe(false)
    }
  })
})
