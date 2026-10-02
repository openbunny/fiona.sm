import { afterEach, describe, expect, it, vi } from "vitest"

import { barSpecFor, entryLabel, linkLabel } from "@/lib/site/navigation"

describe("barSpecFor", () => {
  it("gives / a single current segment, its two sections, and no parent", () => {
    const spec = barSpecFor("/")

    expect(spec.segments).toEqual([{ label: "~/fiona.sm", href: null }])
    expect(spec.entries).toEqual([
      { name: "blog", href: "/blog", kind: "dir" },
      { name: "canary", href: "/canary", kind: "dir" },
    ])
    expect(spec.parentHref).toBeNull()
  })

  it("links ~/fiona.sm and marks canary current, with canary's four files", () => {
    const spec = barSpecFor("/canary")

    expect(spec.segments).toEqual([
      { label: "~/fiona.sm", href: "/" },
      { label: "canary", href: null },
    ])
    expect(spec.entries.map((entry) => entry.name)).toEqual([
      "canary.asc",
      "fiona.asc",
      "security.txt",
      "llms.txt",
    ])
    expect(spec.entries.every((entry) => entry.kind === "file")).toBe(true)
    expect(spec.parentHref).toBe("/")
  })

  it("sources the canary entries' hrefs from the canary module and literal paths", () => {
    const spec = barSpecFor("/canary")

    expect(spec.entries).toEqual([
      { name: "canary.asc", href: "/canary.asc", kind: "file" },
      { name: "fiona.asc", href: "/fiona.asc", kind: "file" },
      {
        name: "security.txt",
        href: "/.well-known/security.txt",
        kind: "file",
      },
      { name: "llms.txt", href: "/llms.txt", kind: "file" },
    ])
  })

  it("gives /blog its segment and the verify-posts file, not its posts", () => {
    const spec = barSpecFor("/blog")

    expect(spec.segments).toEqual([
      { label: "~/fiona.sm", href: "/" },
      { label: "blog", href: null },
    ])
    expect(spec.entries).toEqual([
      { name: "verify-posts", href: "/blog/verify-posts", kind: "file" },
    ])
    expect(spec.parentHref).toBe("/")
  })

  it("lists no entries on a paginated or individual post route, unlike /blog itself", () => {
    for (const route of ["/blog/page/2", "/blog/tickerbox-cli"]) {
      expect(barSpecFor(route).entries).toEqual([])
    }
    expect(barSpecFor("/blog").entries).toEqual([
      { name: "verify-posts", href: "/blog/verify-posts", kind: "file" },
    ])
    expect(barSpecFor("/canary").entries.length).toBeGreaterThan(0)
  })

  it("gives /privacy no entries and a parent of /", () => {
    const spec = barSpecFor("/privacy")

    expect(spec.segments).toEqual([
      { label: "~/fiona.sm", href: "/" },
      { label: "privacy", href: null },
    ])
    expect(spec.entries).toEqual([])
    expect(spec.parentHref).toBe("/")
  })

  it("gives a blog post its ancestors, no entries, and a parent of /blog", () => {
    const spec = barSpecFor("/blog/tickerbox-cli")

    expect(spec.segments).toEqual([
      { label: "~/fiona.sm", href: "/" },
      { label: "blog", href: "/blog" },
      { label: "tickerbox-cli", href: null },
    ])
    expect(spec.entries).toEqual([])
    expect(spec.parentHref).toBe("/blog")
  })

  it("folds a blog pagination route into one 'pN' segment under blog", () => {
    const spec = barSpecFor("/blog/page/2")

    expect(spec.segments).toEqual([
      { label: "~/fiona.sm", href: "/" },
      { label: "blog", href: "/blog" },
      { label: "p2", href: null },
    ])
    expect(spec.entries).toEqual([])
    expect(spec.parentHref).toBe("/blog")
  })

  it("renders the chip text for a paginated blog route with no separating whitespace", () => {
    const spec = barSpecFor("/blog/page/2")

    const chipText = spec.segments.map((segment) => segment.label).join("/")
    expect(chipText).toBe("~/fiona.sm/blog/p2")
    expect(chipText).not.toMatch(/\s/)
  })

  it("treats an unrecognised page segment as an ordinary nested route", () => {
    const spec = barSpecFor("/blog/page/not-a-number")

    expect(spec.segments).toEqual([
      { label: "~/fiona.sm", href: "/" },
      { label: "blog", href: "/blog" },
      { label: "page", href: "/blog/page" },
      { label: "not-a-number", href: null },
    ])
    expect(spec.parentHref).toBe("/blog/page")
  })
})

describe("barSpecFor / with an empty post list", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/blog/posts")
    vi.resetModules()
  })

  it("omits blog from the root entries", async () => {
    vi.resetModules()
    vi.doMock("@/lib/blog/posts", () => ({
      posts: [],
      postsByNewest: () => [],
    }))

    const { barSpecFor: barSpecForEmptyBlog } =
      await import("@/lib/site/navigation")
    const spec = barSpecForEmptyBlog("/")

    expect(spec.entries).toEqual([
      { name: "canary", href: "/canary", kind: "dir" },
    ])
  })

  it("still renders the /blog route itself, listing only verify-posts", async () => {
    vi.resetModules()
    vi.doMock("@/lib/blog/posts", () => ({
      posts: [],
      postsByNewest: () => [],
    }))

    const { barSpecFor: barSpecForEmptyBlog } =
      await import("@/lib/site/navigation")
    const spec = barSpecForEmptyBlog("/blog")

    expect(spec.segments).toEqual([
      { label: "~/fiona.sm", href: "/" },
      { label: "blog", href: null },
    ])
    expect(spec.entries).toEqual([
      { name: "verify-posts", href: "/blog/verify-posts", kind: "file" },
    ])
    expect(spec.parentHref).toBe("/")
  })
})

describe("linkLabel", () => {
  it("names a nested route with a leading slash", () => {
    expect(linkLabel("/blog")).toBe("/blog")
    expect(linkLabel("/canary")).toBe("/canary")
    expect(linkLabel("/privacy")).toBe("/privacy")
  })

  it("names the root ~/fiona.sm, the one exception to the leading-slash rule", () => {
    expect(linkLabel("/")).toBe("~/fiona.sm")
  })
})

describe("entryLabel", () => {
  it("labels a directory entry by its href", () => {
    expect(entryLabel({ name: "blog", href: "/blog", kind: "dir" })).toBe(
      "/blog"
    )
  })

  it("labels a file entry by its name with a leading slash", () => {
    expect(
      entryLabel({ name: "canary.asc", href: "/canary.asc", kind: "file" })
    ).toBe("/canary.asc")
    expect(
      entryLabel({
        name: "verify-posts",
        href: "/blog/verify-posts",
        kind: "file",
      })
    ).toBe("/verify-posts")
  })

  it("labels security.txt by its real href, since its name alone resolves nowhere", () => {
    expect(
      entryLabel({
        name: "security.txt",
        href: "/.well-known/security.txt",
        kind: "file",
      })
    ).toBe("/.well-known/security.txt")
  })
})
