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

    expect(html).toContain(
      'src="/img/b41057b9974f3f139a7d8ef9c9aef7624e7229f2f34e00d1eaba271bcee8cba63fd1452a8e23de4f5003753995e4c35cfd47d46e32f2c0a2ee57f863ca222544.webp"'
    )
    expect(html).toContain(
      'srcSet="/img/785a5fdc6bacc68a60c56f5a348c897d59a8527fa4b13f0bad9403b93cb2f217a9cf191f960e9159df62cec39ff50d501e5958360989b19231f19625e054fd68.png"'
    )
    expect(html).not.toContain(
      'src="/img/bd0a1c582aa64034a09953f1571e2782fdae0b481ffc42371b836b1fc92611e7f02ec73b31412729aae840b832052051b5db404ecf532a3a38219451eb273c34.webp"'
    )
  })
})
