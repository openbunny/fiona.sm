/** @vitest-environment jsdom */

import { cleanup, screen, within } from "@testing-library/react"
import { renderToReadableStream } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import { site } from "@/lib/site/site"

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

async function renderPost(): Promise<void> {
  const { default: OpenbunnyBulkReleasePage } = await import("./page")
  const stream = await renderToReadableStream(<OpenbunnyBulkReleasePage />)
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
}

const title = "safari extensions, component libraries and this site's source"

const REFERENCE_IDS = [
  "openbunny",
  "glyphmark",
  "material-icons",
  "scrollmark",
  "control-panel-for-twitter",
  "dotgithub",
  "react",
  "theme",
  "fiona-sm",
] as const

describe("OpenbunnyBulkReleasePage", () => {
  it("opens with the post title as the heading", async () => {
    await renderPost()

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy()
  })

  it("dates the post with a machine-readable time element", async () => {
    await renderPost()

    const time = document.querySelector("time")
    expect(time?.getAttribute("dateTime")).toBe("2026-10-02")
  })

  it("numbers citations by first appearance, one number per distinct source", async () => {
    await renderPost()

    const marks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href^="#ref-"]')
    )
    expect(
      marks.map((mark) => [mark.getAttribute("href"), mark.textContent])
    ).toEqual([
      ["#ref-openbunny", "[1]"],
      ["#ref-glyphmark", "[2]"],
      ["#ref-material-icons", "[3]"],
      ["#ref-scrollmark", "[4]"],
      ["#ref-control-panel-for-twitter", "[5]"],
      ["#ref-dotgithub", "[6]"],
      ["#ref-react", "7"],
      ["#ref-theme", "8"],
      ["#ref-fiona-sm", "[9]"],
    ])
  })

  it("renders the component and style libraries as one grouped marker", async () => {
    await renderPost()

    const group = screen.getByRole("link", { name: "7" }).parentElement
    expect(group?.textContent).toBe("[7, 8]")
    expect(screen.getByRole("link", { name: "8" })).toHaveAttribute(
      "href",
      "#ref-theme"
    )
  })

  it("lists every cited reference once, in first-appearance order", async () => {
    await renderPost()

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(REFERENCE_IDS.length)
    expect(items.map((item) => item.id)).toEqual(
      REFERENCE_IDS.map((id) => `ref-${id}`)
    )
  })

  it("gives each once-cited source a single back-link", async () => {
    await renderPost()

    for (const id of REFERENCE_IDS) {
      expect(
        document.querySelectorAll(`#ref-${id} a[href^="#cite-${id}-"]`)
      ).toHaveLength(1)
    }
  })

  it("cites the openbunny organisation and each of its repositories as distinct sources", async () => {
    await renderPost()

    function sourceHref(refId: string): string | null {
      const ref = document.getElementById(refId)
      if (ref === null) {
        throw new Error(`${refId} not found`)
      }
      return within(ref)
        .getByRole("link", { name: "source" })
        .getAttribute("href")
    }

    expect(sourceHref("ref-openbunny")).toBe("https://github.com/openbunny/")
    expect(sourceHref("ref-glyphmark")).toBe(
      "https://github.com/openbunny/glyphmark"
    )
    expect(sourceHref("ref-fiona-sm")).toBe(
      "https://github.com/openbunny/fiona.sm"
    )
  })

  it("cites the browser extension glyphmark reimplements, and the one scrollmark was tested against, as sources of their own", async () => {
    await renderPost()

    function sourceHref(refId: string): string | null {
      const ref = document.getElementById(refId)
      if (ref === null) {
        throw new Error(`${refId} not found`)
      }
      return within(ref)
        .getByRole("link", { name: "source" })
        .getAttribute("href")
    }

    expect(sourceHref("ref-material-icons")).toBe(
      "https://github.com/material-extensions/material-icons-browser-extension"
    )
    expect(sourceHref("ref-control-panel-for-twitter")).toBe(
      "https://apps.apple.com/us/app/control-panel-for-twitter/id1668516167"
    )
  })

  it("renders no underline on a citation marker", async () => {
    await renderPost()

    const marks = screen.getAllByRole("link", { name: /^\[\d\]$/ })
    for (const mark of marks) {
      expect(mark.className).not.toMatch(/underline/)
    }
  })

  it("shows no home plate, so a post never carries two pieces of artwork", async () => {
    await renderPost()

    expect(document.querySelector('img[src="/home.gif"]')).toBeNull()
    expect(document.querySelector('img[src="/home-static.png"]')).toBeNull()
  })

  it("renders its declared per-post artwork", async () => {
    await renderPost()

    expect(
      document.querySelector('img[src="/post-art/openbunny-bulk-release.gif"]')
    ).not.toBeNull()
    expect(
      document.querySelector(
        'img[src="/post-art/openbunny-bulk-release-static.png"]'
      )
    ).not.toBeNull()
  })

  it("shows the site bar with the post current and blog linked", async () => {
    await renderPost()

    const current = screen.getByText("openbunny-bulk-release", {
      selector: "span[aria-current]",
    })
    expect(current.tagName.toLowerCase()).toBe("span")
    expect(current.getAttribute("aria-current")).toBe("page")

    expect(
      screen.getByRole("link", { name: "blog" }).getAttribute("href")
    ).toBe("/blog")

    const back = screen.getByRole("link", { name: /^up to / })
    expect(back).toHaveAttribute("href", "/blog")
  })

  it("carries its own manifest hash and a link to the manifest attesting it", async () => {
    await renderPost()

    const { manifestEntryForSlug, readManifestLookup } =
      await import("@/lib/manifest/manifest-lookup")
    const entry = manifestEntryForSlug(
      "openbunny-bulk-release",
      readManifestLookup()
    )

    expect(entry).toBeDefined()
    expect(screen.getByText(entry?.sha256 ?? "")).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "/blog/verify-posts" })
    ).toHaveAttribute("href", "/blog/verify-posts")
    expect(screen.getByRole("link", { name: "/posts.asc" })).toHaveAttribute(
      "href",
      "/posts.asc"
    )
  })

  it("sets an animated heart at 155 by 155 pixels, in the paragraph above the thanks", async () => {
    await renderPost()

    const heart = document.querySelector<HTMLImageElement>(
      'img[src="/post-art/openbunny-bulk-release/heartsign.gif"]'
    )
    expect(heart).not.toBeNull()
    expect(heart?.getAttribute("alt")).toBe("")
    expect(heart?.className).toBe("")
    expect(heart?.getAttribute("width")).toBe("155")
    expect(heart?.getAttribute("height")).toBe("155")

    const heartParagraph = heart?.closest("p")
    expect(heartParagraph?.children).toHaveLength(1)
    expect(heartParagraph?.textContent).toBe("")

    const thanksParagraph = Array.from(
      document.querySelectorAll("article > p")
    ).find((paragraph) =>
      paragraph.textContent?.includes("exceptional continued support")
    )
    expect(thanksParagraph?.textContent?.trim()).toBe(
      "i want to thank my boyfriend john and my best friend sasha for their exceptional continued support!"
    )
    expect(
      Array.from(thanksParagraph?.querySelectorAll("strong") ?? []).map(
        (name) => name.textContent
      )
    ).toEqual(["john", "sasha"])

    expect(thanksParagraph?.previousElementSibling).toBe(heartParagraph)
    expect(thanksParagraph?.firstElementChild?.tagName).not.toBe("IMG")
  })

  it("signs off with -f as the last paragraph", async () => {
    await renderPost()

    const paragraphs = Array.from(document.querySelectorAll("article > p")).map(
      (paragraph) => paragraph.textContent
    )
    expect(paragraphs.at(-1)).toBe("-f")
  })

  it("carries the site footer's privacy and mail links", async () => {
    await renderPost()

    expect(
      screen.getByRole("link", { name: "/privacy" }).getAttribute("href")
    ).toBe("/privacy")
    expect(
      screen.getByRole("link", { name: canary.email }).getAttribute("href")
    ).toBe(`mailto:${canary.email}`)
  })
})

describe("openbunny-bulk-release metadata", () => {
  it("previews as its own post, not the site root", async () => {
    const { metadata } = await import("./page")

    expect(metadata.openGraph).toMatchObject({
      type: "article",
      url: `${site.url}/blog/openbunny-bulk-release`,
      title,
    })
  })

  it("keeps the site-wide fields that an openGraph override must not drop", async () => {
    const { metadata } = await import("./page")

    expect(metadata.openGraph?.siteName).toBe(site.name)
    expect(metadata.openGraph?.locale).toBe(site.locale)
  })
})
