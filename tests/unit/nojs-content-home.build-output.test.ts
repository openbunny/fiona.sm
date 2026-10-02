import { existsSync, readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"

const INDEX_HTML = ".next/server/app/index.html"

function requireBuildOutput(exists: boolean): void {
  if (!exists) {
    throw new Error(
      `${INDEX_HTML} does not exist. This test asserts the no-JS content of the prerendered "/" page, so it has nothing to check without a production build: run \`bun run build\` first. In \`bun run check\` and in CI a build always precedes it, so a missing file is a real failure rather than a reason to skip.`
    )
  }
}

function stripForNoScript(html: string): string {
  return html
    .replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replaceAll(/<\/?noscript\b[^>]*>/gi, "")
}

const HIDDEN_ATTRIBUTE = /(?<!aria-)\bhidden[=\s>]/
const INLINE_DISPLAY_NONE = /display:\s*none/

function withoutClassValues(html: string): string {
  return html.replaceAll(/\sclass="[^"]*"/g, "")
}

describe("no-JS content of / (personal home)", () => {
  it("carries the display name, the link to /canary, and the footer's two links", () => {
    requireBuildOutput(existsSync(INDEX_HTML))
    const html = stripForNoScript(readFileSync(INDEX_HTML, "utf8"))

    for (const text of [
      canary.displayName,
      'href="/canary"',
      'href="/privacy"',
      `href="mailto:${canary.email}"`,
    ]) {
      expect(html, `missing without JS: ${text}`).toContain(text)
    }
  })

  it("never hides critical content with a literal HTML attribute or inline style", () => {
    requireBuildOutput(existsSync(INDEX_HTML))
    const html = withoutClassValues(
      stripForNoScript(readFileSync(INDEX_HTML, "utf8"))
    ).replaceAll(/<div hidden="">(?:<!--\$-->|<!--\/\$-->)*<\/div>/g, "")

    expect(html).not.toMatch(HIDDEN_ATTRIBUTE)
    expect(html).not.toMatch(INLINE_DISPLAY_NONE)
  })
})
