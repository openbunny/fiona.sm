import { JSDOM } from "jsdom"
import { describe, expect, it } from "vitest"

import { buildAtomFeed } from "@/lib/feed/atom"

const baseInput = {
  id: "https://fiona.sm/",
  title: "fiona",
  href: "https://fiona.sm/",
  selfHref: "https://fiona.sm/feed.xml",
  updated: "2026-09-30T00:00:00Z",
  authorName: "fiona",
  authorEmail: "mail@fiona.sm",
}

function parse(xml: string): Document {
  return new JSDOM(xml, { contentType: "application/xml" }).window.document
}

describe("buildAtomFeed", () => {
  it("produces well-formed xml with zero entries", () => {
    const xml = buildAtomFeed({ ...baseInput, entries: [] })

    expect(() => parse(xml)).not.toThrow()
    const doc = parse(xml)
    expect(doc.getElementsByTagName("id")[0]?.textContent).toBe(
      "https://fiona.sm/"
    )
    expect(doc.getElementsByTagName("title")[0]?.textContent).toBe("fiona")
    expect(doc.getElementsByTagName("updated")[0]?.textContent).toBe(
      "2026-09-30T00:00:00Z"
    )
    expect(doc.getElementsByTagName("author").length).toBe(1)
    expect(doc.getElementsByTagName("entry").length).toBe(0)
  })

  it("carries exactly one well-formed entry per input post, newest first order preserved", () => {
    const entries = [
      {
        id: "https://fiona.sm/blog/newer",
        title: "the newer post",
        href: "https://fiona.sm/blog/newer",
        updated: "2026-09-30T00:00:00Z",
      },
      {
        id: "https://fiona.sm/blog/older",
        title: "the older post",
        href: "https://fiona.sm/blog/older",
        updated: "2026-08-01T00:00:00Z",
      },
    ]
    const xml = buildAtomFeed({ ...baseInput, entries })

    expect(() => parse(xml)).not.toThrow()
    const doc = parse(xml)
    const entryElements = Array.from(doc.getElementsByTagName("entry"))
    expect(entryElements).toHaveLength(2)

    const first = entryElements[0]
    if (first === undefined) {
      throw new Error("expected a first entry")
    }
    expect(first.getElementsByTagName("id")[0]?.textContent).toBe(
      "https://fiona.sm/blog/newer"
    )
    expect(first.getElementsByTagName("title")[0]?.textContent).toBe(
      "the newer post"
    )
    expect(first.getElementsByTagName("link")[0]?.getAttribute("href")).toBe(
      "https://fiona.sm/blog/newer"
    )
    expect(first.getElementsByTagName("updated")[0]?.textContent).toBe(
      "2026-09-30T00:00:00Z"
    )
  })

  it("round-trips a title containing every special xml character through a real parser", () => {
    const original = `a & b <c> "d" 'e' bayes' rule pkg@v1.2.3`
    const xml = buildAtomFeed({
      ...baseInput,
      entries: [
        {
          id: "https://fiona.sm/blog/escaping",
          title: original,
          href: "https://fiona.sm/blog/escaping",
          updated: "2026-09-30T00:00:00Z",
        },
      ],
    })

    expect(() => parse(xml)).not.toThrow()
    const doc = parse(xml)
    const entryTitle = doc
      .getElementsByTagName("entry")[0]
      ?.getElementsByTagName("title")[0]?.textContent
    expect(entryTitle).toBe(original)
  })

  it("escapes a double quote in a link href attribute", () => {
    const xml = buildAtomFeed({
      ...baseInput,
      entries: [
        {
          id: "https://fiona.sm/blog/quoted",
          title: "quoted",
          href: 'https://fiona.sm/blog/quoted?q="x"',
          updated: "2026-09-30T00:00:00Z",
        },
      ],
    })

    expect(() => parse(xml)).not.toThrow()
    const doc = parse(xml)
    const href = doc
      .getElementsByTagName("entry")[0]
      ?.getElementsByTagName("link")[0]
      ?.getAttribute("href")
    expect(href).toBe('https://fiona.sm/blog/quoted?q="x"')
  })

  it("throws on malformed xml, proving the parse check is live", () => {
    expect(() => parse("<feed><unclosed></feed>")).toThrow()
  })

  it("ends with a single trailing newline", () => {
    const xml = buildAtomFeed({ ...baseInput, entries: [] })

    expect(xml.endsWith("\n")).toBe(true)
    expect(xml.endsWith("\n\n")).toBe(false)
  })
})
