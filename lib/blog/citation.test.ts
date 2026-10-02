import { describe, expect, it } from "vitest"

import {
  bibtexCitation,
  citationKey,
  citationUrl,
  citationYear,
  plainCitation,
} from "@/lib/blog/citation"
import type { BlogPost } from "@/lib/blog/posts"
import { site } from "@/lib/site/site"

const post: BlogPost = {
  slug: "tickerbox-cli",
  title: "tickerbox-cli",
  date: "2026-10-01",
  href: "/blog/tickerbox-cli",
}

const sha256 =
  "29efa55531a77a83159976258a3c03e19dabf6996ae35e2f2c58b6eb3ffaed72"
const manifestSignedOn = "2026-10-01"

describe("citation parts", () => {
  it("cites the canonical absolute url, not a relative path", () => {
    expect(citationUrl(post)).toBe(`${site.url}/blog/tickerbox-cli`)
  })

  it("takes the year from the published date", () => {
    expect(citationYear(post)).toBe("2026")
  })

  it("builds a bibtex key with no character bibtex treats as syntax", () => {
    expect(citationKey(post)).toBe("fiona2026tickerboxcli")
    expect(citationKey(post)).toMatch(/^[a-z0-9]+$/)
  })
})

describe("plain citation", () => {
  it("names the author, date, title and url", () => {
    const text = plainCitation({ post })

    expect(text).toContain(site.name)
    expect(text).toContain("2026-10-01")
    expect(text).toContain("tickerbox-cli")
    expect(text).toContain(citationUrl(post))
  })

  it("carries the digest and the date the manifest was signed", () => {
    const text = plainCitation({ post, sha256, manifestSignedOn })

    expect(text).toContain(sha256)
    expect(text).toContain(manifestSignedOn)
    expect(text).toContain("/posts.asc")
  })

  it("states no digest when the manifest holds none for the post", () => {
    const text = plainCitation({ post })

    expect(text).not.toContain("sha-256")
    expect(text).not.toContain("undefined")
  })

  it("states no digest when the manifest is unsigned, since the date would be absent", () => {
    const text = plainCitation({ post, sha256 })

    expect(text).not.toContain(sha256)
    expect(text).not.toContain("undefined")
  })
})

describe("bibtex citation", () => {
  it("opens an entry keyed for the post and closes it", () => {
    const text = bibtexCitation({ post, sha256, manifestSignedOn })

    expect(text.startsWith(`@misc{${citationKey(post)},`)).toBe(true)
    expect(text.trimEnd().endsWith("}")).toBe(true)
  })

  it("balances every brace, so a reader can paste it into a bibliography", () => {
    const text = bibtexCitation({ post, sha256, manifestSignedOn })
    const opens = [...text].filter((character) => character === "{").length
    const closes = [...text].filter((character) => character === "}").length

    expect(opens).toBe(closes)
  })

  it("omits the note field entirely when there is no digest to state", () => {
    const text = bibtexCitation({ post })

    expect(text).not.toContain("note")
    expect(text).not.toContain("undefined")
  })
})
