/** @vitest-environment jsdom */

import { renderToReadableStream } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import GlobalError from "@/app/global-error"

function testError(): Error & { digest?: string } {
  return Object.assign(new Error("boom"), { digest: "abc123" })
}

async function renderRawHtml(): Promise<string> {
  vi.spyOn(console, "error").mockImplementation(() => undefined)
  const stream = await renderToReadableStream(
    <GlobalError error={testError()} reset={() => undefined} />
  )
  await stream.allReady
  const html = await new Response(stream).text()
  vi.restoreAllMocks()
  return html
}

describe("GlobalError", () => {
  it("renders its own html and body, since the root layout is what failed", async () => {
    const html = await renderRawHtml()

    expect(html).toContain("<html")
    expect(html).toContain("<body")
  })

  it("says this is not a signature failure or an expired canary", async () => {
    const html = await renderRawHtml()

    expect(html).toContain(
      "this is not a signature failure or an expired canary"
    )
  })

  it("points to the canary page and key file, which do not depend on this page", async () => {
    const html = await renderRawHtml()

    expect(html).toContain("/canary")
    expect(html).toContain("/fiona.asc")
    expect(html).not.toContain("/canary.asc")
  })

  it("offers a home link that names itself without visible text", async () => {
    const html = await renderRawHtml()

    expect(html).toMatch(/<a[^>]*href="\/"[^>]*aria-label="return home"/)
  })

  it("renders the global-error plate with no root layout to provide it", async () => {
    const html = await renderRawHtml()

    expect(html).toContain('src="/globalerror.gif"')
    expect(html).toContain('src="/globalerror-static.png"')
  })
})
