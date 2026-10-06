import { createHash } from "node:crypto"

import { describe, expect, it } from "vitest"

import { contentHash, contentName, contentUrl } from "@/lib/images/content-name"

const bytes = new TextEncoder().encode("plate")
const digest = createHash("sha512").update(bytes).digest("hex")

describe("content names", () => {
  it("hashes bytes to 128 lowercase hex characters", () => {
    expect(contentHash(bytes)).toBe(digest)
    expect(digest).toMatch(/^[0-9a-f]{128}$/u)
  })

  it("names a file by its digest and extension", () => {
    expect(contentName(bytes, "webp")).toBe(`${digest}.webp`)
  })

  it("serves a content name from /img", () => {
    expect(contentUrl(bytes, "png")).toBe(`/img/${digest}.png`)
  })
})
