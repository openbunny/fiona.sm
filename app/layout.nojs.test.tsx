/** @vitest-environment jsdom */

import { renderToReadableStream } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import RootLayout from "@/app/layout"

afterEach(() => {
  vi.unstubAllEnvs()
})

async function renderRawHtml(): Promise<string> {
  const stream = await renderToReadableStream(
    <RootLayout>
      <p>content</p>
    </RootLayout>
  )
  await stream.allReady
  return new Response(stream).text()
}

describe("RootLayout without JavaScript", () => {
  it("carries no application analytics beacon reference, even in production", async () => {
    vi.stubEnv("NODE_ENV", "production")

    const html = await renderRawHtml()

    expect(html).not.toContain("/_vercel/insights")
    expect(html).not.toContain("/_vercel/speed-insights")
    expect(html).not.toMatch(/<script[^>]* src=/i)
  })
})
