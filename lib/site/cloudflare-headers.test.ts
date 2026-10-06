import { describe, expect, it } from "vitest"

import { cloudflareHeaders } from "@/lib/site/cloudflare-headers"

describe("cloudflareHeaders", () => {
  it("fails when the export contains no files", () => {
    expect(() => cloudflareHeaders([])).toThrow(/contains no assets/)
  })

  it("keeps missing signed archives revalidating while preserving published route headers", () => {
    const headers = cloudflareHeaders([
      "/index.html",
      "/posts/example/deadbeef.txt",
      "/.well-known/openpgpkey/policy",
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
      "/opengraph-image\n  ! Content-Type\n  Content-Type: image/png"
    )
    expect(headers).not.toContain("/posts/example/missing.txt")
  })
})
