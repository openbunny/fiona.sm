/** @vitest-environment jsdom */

import { renderToReadableStream } from "react-dom/server"
import { describe, expect, it } from "vitest"

import Page from "@/app/page"
import { canary } from "@/lib/canary/canary"

function stripForNoScript(html: string): string {
  return html
    .replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replaceAll(/<\/?noscript\b[^>]*>/gi, "")
}

async function renderRawHtml(): Promise<string> {
  const stream = await renderToReadableStream(<Page />)
  await stream.allReady
  return new Response(stream).text()
}

describe("Page (personal home) without JavaScript", () => {
  it("carries the display name, the link to /canary, and the footer with no script running", async () => {
    const html = stripForNoScript(await renderRawHtml())

    for (const text of [
      canary.displayName,
      'href="/canary"',
      'href="/privacy"',
      `href="mailto:${canary.email}"`,
    ]) {
      expect(html, `missing without JS: ${text}`).toContain(text)
    }
  })

  it("gates nothing behind js-only", async () => {
    const html = await renderRawHtml()

    expect(html).not.toMatch(/\bjs-only\b/)
  })
})
