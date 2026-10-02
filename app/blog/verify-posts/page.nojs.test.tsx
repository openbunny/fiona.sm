/** @vitest-environment jsdom */

import { renderToReadableStream } from "react-dom/server"
import { describe, expect, it } from "vitest"

import Page from "@/app/blog/verify-posts/page"
import { postsByNewest } from "@/lib/blog/posts"
import { canary } from "@/lib/canary/canary"
import { formatLongDate } from "@/lib/iso-date"
import { readManifestLookup } from "@/lib/manifest/manifest-lookup"
import { manifestSignedAt } from "@/lib/manifest/manifest-signed-at"
import { manifestStatusText } from "@/lib/manifest/manifest-status-text"
import {
  articleTextVerifySteps,
  manifestVerifyCommands,
} from "@/lib/manifest/verify-commands"
import { siteLastChangedAt } from "@/lib/site/commit-date"

function stripForNoScript(html: string): string {
  return html
    .replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replaceAll(/<\/?noscript\b[^>]*>/gi, "")
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

async function renderRawHtml(): Promise<string> {
  const stream = await renderToReadableStream(<Page />)
  await stream.allReady
  return new Response(stream).text()
}

describe("VerifyPage without JavaScript", () => {
  it("carries every critical string once scripts and noscript wrappers are stripped", async () => {
    const html = unescapeHtml(stripForNoScript(await renderRawHtml()))
    const signedAt = await manifestSignedAt()
    const lastChangedAt = siteLastChangedAt()
    const examplePost = postsByNewest()[0]
    if (examplePost === undefined) {
      throw new Error("expected at least one published post for this test")
    }

    const critical = [
      `site last changed ${formatLongDate(lastChangedAt.slice(0, 10))}`,
      "manifest signed",
      formatLongDate(signedAt.slice(0, 10)),
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

  it("gates every copy button behind js-only", async () => {
    const html = await renderRawHtml()

    expect(html.match(/\bjs-only\b/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })
})
