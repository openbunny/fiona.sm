import { describe, expect, it } from "vitest"

import { cloudflareHeaders } from "@/lib/site/cloudflare-headers"

describe("cloudflareHeaders", () => {
  it("fails when the export contains no files", () => {
    expect(() => cloudflareHeaders([])).toThrow(/contains no assets/)
  })

  it("sends inline PDF headers on /cv and /cv.pdf for the rewritten asset", () => {
    const headers = cloudflareHeaders(["/cv.pdf"])
    for (const path of ["/cv", "/cv.pdf"]) {
      expect(headers).toContain(
        `${path}\n  ! Content-Type\n  Content-Type: application/pdf`
      )
      expect(headers).toContain(
        'Content-Disposition: inline; filename="fiona-cv.pdf"'
      )
    }
  })

  it("keeps missing signed archives revalidating while preserving published route headers", () => {
    const headers = cloudflareHeaders([
      "/index.html",
      "/posts/example/deadbeef.txt",
      "/.well-known/openpgpkey/policy",
      "/opengraph-image/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "/opengraph-image",
    ])

    expect(headers).toContain("/*\n")
    expect(headers).toContain(
      "Cache-Control: public, max-age=0, must-revalidate"
    )
    expect(headers).toContain("/posts/example/deadbeef.txt\n  ! Content-Type")
    expect(headers).toContain("/posts/example/deadbeef.txt\n")
    expect(headers).toContain(
      "Cache-Control: public, max-age=31536000, immutable"
    )
    expect(headers).toContain("Cross-Origin-Resource-Policy: cross-origin")
    expect(headers).toContain(
      "/opengraph-image/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n  ! Content-Type\n  Content-Type: image/png\n  ! Cache-Control\n  Cache-Control: public, max-age=31536000, immutable"
    )
    expect(headers).not.toContain("/opengraph-image\n")
    expect(headers).not.toContain("/posts/example/missing.txt")
  })
})
