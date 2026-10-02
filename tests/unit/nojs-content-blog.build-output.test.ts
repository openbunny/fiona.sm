import { existsSync, readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import { posts } from "@/lib/blog/posts"

const BLOG_INDEX_HTML = ".next/server/app/blog.html"
const BLOG_POST_HTML = ".next/server/app/blog/tickerbox-cli.html"

function requireBuildOutput(path: string, exists: boolean): void {
  if (!exists) {
    throw new Error(
      `${path} does not exist. This test asserts the no-JS content of a prerendered blog page, so it has nothing to check without a production build: run \`bun run build\` first. In \`bun run check\` and in CI a build always precedes it, so a missing file is a real failure rather than a reason to skip.`
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

const post = posts.find((candidate) => candidate.slug === "tickerbox-cli")
if (post === undefined) {
  throw new Error("expected a tickerbox-cli post fixture in lib/blog/posts")
}

describe("no-JS content of /blog", () => {
  it("carries the post title, its date, and a link to the post", () => {
    requireBuildOutput(BLOG_INDEX_HTML, existsSync(BLOG_INDEX_HTML))
    const html = stripForNoScript(readFileSync(BLOG_INDEX_HTML, "utf8"))

    for (const text of [
      canary.displayName,
      post.title,
      `href="${post.href}"`,
    ]) {
      expect(html, `missing without JS: ${text}`).toContain(text)
    }
  })

  it("never hides critical content with a literal HTML attribute or inline style", () => {
    requireBuildOutput(BLOG_INDEX_HTML, existsSync(BLOG_INDEX_HTML))
    const html = withoutClassValues(
      stripForNoScript(readFileSync(BLOG_INDEX_HTML, "utf8"))
    ).replaceAll(/<div hidden="">(?:<!--\$-->|<!--\/\$-->)*<\/div>/g, "")

    expect(html).not.toMatch(HIDDEN_ATTRIBUTE)
    expect(html).not.toMatch(INLINE_DISPLAY_NONE)
  })
})

describe("no-JS content of /blog/tickerbox-cli", () => {
  it("carries the post title and a link back to the footer", () => {
    requireBuildOutput(BLOG_POST_HTML, existsSync(BLOG_POST_HTML))
    const html = stripForNoScript(readFileSync(BLOG_POST_HTML, "utf8"))

    for (const text of [post.title, 'href="/privacy"', 'href="/blog"']) {
      expect(html, `missing without JS: ${text}`).toContain(text)
    }
  })

  it("never hides critical content with a literal HTML attribute or inline style", () => {
    requireBuildOutput(BLOG_POST_HTML, existsSync(BLOG_POST_HTML))
    const html = withoutClassValues(
      stripForNoScript(readFileSync(BLOG_POST_HTML, "utf8"))
    ).replaceAll(/<div hidden="">(?:<!--\$-->|<!--\/\$-->)*<\/div>/g, "")

    expect(html).not.toMatch(HIDDEN_ATTRIBUTE)
    expect(html).not.toMatch(INLINE_DISPLAY_NONE)
  })

  it("gates every copy control behind js-only", () => {
    requireBuildOutput(BLOG_POST_HTML, existsSync(BLOG_POST_HTML))
    const html = readFileSync(BLOG_POST_HTML, "utf8")

    const copyControls = html.match(/aria-label="copy command/g)?.length ?? 0
    const gated = html.match(/\bjs-only\b/g)?.length ?? 0

    expect(
      copyControls,
      "the post rendered no copy control, so this test proves nothing"
    ).toBeGreaterThan(0)
    expect(
      gated,
      `${copyControls} copy controls but ${gated} js-only gates: a reader without javascript would see a control that cannot work`
    ).toBeGreaterThanOrEqual(copyControls)
  })
})
