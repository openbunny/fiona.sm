/** @vitest-environment jsdom */

import { renderToReadableStream } from "react-dom/server"
import { describe, expect, it } from "vitest"

import NotFound from "@/app/not-found"

async function renderRawHtml(): Promise<string> {
  const stream = await renderToReadableStream(<NotFound />)
  await stream.allReady
  return new Response(stream).text()
}

describe("NotFound structured data", () => {
  it("emits no JSON-LD structured data", async () => {
    const html = await renderRawHtml()

    expect(html).not.toContain("application/ld+json")
    expect(html).not.toContain("WebPage")
    expect(html).not.toContain("Person")
    expect(html).not.toContain("WebSite")
  })
})

describe("NotFound artwork", () => {
  it("renders the 404 plate, swapping to its still frame under reduced motion", async () => {
    const html = await renderRawHtml()

    expect(html).toContain('src="/404.gif"')
    expect(html).toContain('src="/404-static.png"')
    expect(html).not.toContain('src="/home.gif"')
  })
})
