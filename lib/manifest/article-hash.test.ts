import { createHash } from "node:crypto"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  builtPagePath,
  hashArticleText,
  hashBuiltPost,
} from "@/lib/manifest/article-hash"

function page(articleInner: string): string {
  return `<!DOCTYPE html><html><body><article>${articleInner}</article></body></html>`
}

describe("hashArticleText", () => {
  it("returns the lowercase hex sha256 of the utf8-encoded text", () => {
    const text = "hello"
    expect(hashArticleText(text)).toBe(
      createHash("sha256").update(text, "utf8").digest("hex")
    )
    expect(hashArticleText(text)).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe("builtPagePath", () => {
  it("joins the build output directory and slug into an .html path", () => {
    expect(builtPagePath("/out", "my-post")).toBe("/out/my-post.html")
  })
})

describe("hashBuiltPost", () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fiona-manifest-test-"))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("extracts and hashes the built page's article text", async () => {
    await writeFile(join(dir, "my-post.html"), page("<p>hello world.</p>"), {
      encoding: "utf8",
    })

    expect(hashBuiltPost(dir, "my-post")).toBe(hashArticleText("hello world."))
  })

  it("throws naming the missing path when the build output is absent", () => {
    expect(() => hashBuiltPost(dir, "missing-post")).toThrow(
      new RegExp(
        `${join(dir, "missing-post.html").replaceAll(/[/.]/g, "\\$&")} is missing`
      )
    )
  })
})
