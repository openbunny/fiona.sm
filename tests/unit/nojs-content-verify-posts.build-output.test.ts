import { existsSync, readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { postsByNewest } from "@/lib/blog/posts"
import { canary } from "@/lib/canary/canary"
import { readManifestLookup } from "@/lib/manifest/manifest-lookup"
import { manifestStatusText } from "@/lib/manifest/manifest-status-text"
import {
  articleTextVerifySteps,
  manifestVerifyCommands,
} from "@/lib/manifest/verify-commands"

const VERIFY_HTML = ".next/server/app/blog/verify-posts.html"

function requireBuildOutput(exists: boolean): void {
  if (!exists) {
    throw new Error(
      `${VERIFY_HTML} does not exist. This test asserts the no-JS content of the prerendered "/blog/verify-posts" page, so it has nothing to check without a production build: run \`bun run build\` first. In \`bun run check\` and in CI a build always precedes it, so a missing file is a real failure rather than a reason to skip.`
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

function unescapeHtml(html: string): string {
  return html
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#x2F;", "/")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&")
}

describe("no-JS content of /blog/verify-posts", () => {
  it("carries every critical string once scripts and noscript wrappers are stripped", () => {
    requireBuildOutput(existsSync(VERIFY_HTML))
    const html = unescapeHtml(
      stripForNoScript(readFileSync(VERIFY_HTML, "utf8"))
    )

    const examplePost = postsByNewest()[0]
    if (examplePost === undefined) {
      throw new Error("expected at least one published post for this test")
    }

    const critical = [
      manifestStatusText(readManifestLookup()),
      ...manifestVerifyCommands(canary.siteOrigin, canary.fingerprint),
      ...articleTextVerifySteps(
        canary.siteOrigin,
        canary.fingerprint,
        examplePost.slug
      ).map((step) => step.command),
    ]

    for (const text of critical) {
      expect(html, `missing without JS: ${text.slice(0, 48)}`).toContain(text)
    }

    expect(html).not.toContain("docs/post-manifest.md")
    expect(html).not.toContain("lib/manifest/article-text.ts")
  })

  it("never hides critical content with a literal HTML attribute or inline style", () => {
    requireBuildOutput(existsSync(VERIFY_HTML))
    const html = withoutClassValues(
      stripForNoScript(readFileSync(VERIFY_HTML, "utf8"))
    ).replaceAll(/<div hidden="">(?:<!--\$-->|<!--\/\$-->)*<\/div>/g, "")

    expect(html).not.toMatch(HIDDEN_ATTRIBUTE)
    expect(html).not.toMatch(INLINE_DISPLAY_NONE)
  })
})
