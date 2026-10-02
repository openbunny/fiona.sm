import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { JSDOM } from "jsdom"
import { describe, expect, it } from "vitest"

import { posts, postsByNewest } from "@/lib/blog/posts"

const BUILT_FEED = join(process.cwd(), ".next/server/app/feed.xml.body")

function readBuiltFeed(): string {
  if (!existsSync(BUILT_FEED)) {
    throw new Error(
      `${BUILT_FEED} does not exist. This test asserts against a production build's prerendered output, so it has nothing to check without one: run \`bun run build\` first.`
    )
  }
  return readFileSync(BUILT_FEED, "utf8")
}

function parse(xml: string): Document {
  return new JSDOM(xml, { contentType: "application/xml" }).window.document
}

describe("the built /feed.xml artifact", () => {
  it("is well-formed xml", () => {
    expect(() => parse(readBuiltFeed())).not.toThrow()
  })

  it("carries exactly one entry per registered post, newest first", () => {
    const doc = parse(readBuiltFeed())
    const entryIds = Array.from(doc.getElementsByTagName("entry")).map(
      (entry) => entry.getElementsByTagName("id")[0]?.textContent
    )

    const expectedIds = postsByNewest(posts).map(
      (post) => `https://fiona.sm${post.href}`
    )

    expect(entryIds).toEqual(expectedIds)
  })

  it("carries a feed-level id, title, updated, author, and a self link", () => {
    const doc = parse(readBuiltFeed())

    expect(doc.getElementsByTagName("feed").length).toBe(1)
    expect(doc.getElementsByTagName("id")[0]?.textContent).toBe(
      "https://fiona.sm/"
    )
    expect(doc.getElementsByTagName("author").length).toBe(1)
    expect(
      doc.getElementsByTagName("author")[0]?.getElementsByTagName("email")[0]
        ?.textContent
    ).toBe("mail@fiona.sm")

    const selfLink = Array.from(doc.getElementsByTagName("link")).find(
      (link) => link.getAttribute("rel") === "self"
    )
    expect(selfLink?.getAttribute("href")).toBe("https://fiona.sm/feed.xml")
  })
})
