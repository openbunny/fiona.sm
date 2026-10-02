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
  const { default: TickerboxCliPage } = await import("./page")
  const stream = await renderToReadableStream(<TickerboxCliPage />)
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
}

describe("TickerboxCliPage", () => {
  it("opens with the post title as the heading", async () => {
    await renderPost()

    expect(
      screen.getByRole("heading", { level: 1, name: "tickerbox-cli" })
    ).toBeTruthy()
  })

  it("dates the post with a machine-readable time element", async () => {
    await renderPost()

    const time = document.querySelector("time")
    expect(time?.getAttribute("dateTime")).toBe("2026-10-01")
  })

  it("numbers citations by first appearance, one number per distinct source", async () => {
    await renderPost()

    const marks = screen.getAllByRole("link", { name: /^\[\d\]$/ })
    expect(marks.map((mark) => mark.textContent)).toEqual([
      "[1]",
      "[2]",
      "[3]",
      "[4]",
    ])
  })

  it("lists every cited reference once, in first-appearance order", async () => {
    await renderPost()

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(4)
    expect(items.map((item) => item.id)).toEqual([
      "ref-tickerbox",
      "ref-tickerbox-cli",
      "ref-openbunny",
      "ref-feed",
    ])
  })

  it("gives each once-cited source a single back-link", async () => {
    await renderPost()

    for (const id of ["tickerbox", "tickerbox-cli", "openbunny", "feed"]) {
      expect(
        document.querySelectorAll(`#ref-${id} a[href^="#cite-${id}-"]`)
      ).toHaveLength(1)
    }
  })

  it("cites the openbunny organization and the tickerbox-cli repository as distinct sources", async () => {
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
    expect(sourceHref("ref-tickerbox-cli")).toBe(
      "https://github.com/openbunny/tickerbox-cli"
    )
  })

  it("points the feed citation at the site's feedPath, not a literal hardcoded path", async () => {
    await renderPost()

    const ref = document.getElementById("ref-feed")
    if (ref === null) {
      throw new Error("ref-feed not found")
    }
    const feedLink = within(ref).getByRole("link", { name: "source" })
    expect(feedLink).toHaveAttribute("href", `${site.url}${site.feedPath}`)
  })

  it("renders no underline on a citation marker", async () => {
    await renderPost()

    const marks = screen.getAllByRole("link", { name: /^\[\d\]$/ })
    for (const mark of marks) {
      expect(mark.className).not.toMatch(/underline/)
    }
  })

  it("renders the install commands in copyable command boxes", async () => {
    await renderPost()

    expect(
      screen.getByRole("button", {
        name: "copy command: brew install oa/tap/tickerbox-cli",
      })
    ).toBeTruthy()
    expect(
      screen.getByRole("button", {
        name: "copy command: go install github.com/openbunny/tickerbox-cli@latest",
      })
    ).toBeTruthy()
  })

  it("shows the $ prompt as decorative, not part of the copied text", async () => {
    await renderPost()

    const prompts = screen.getAllByText("$")
    expect(prompts.length).toBeGreaterThan(0)
    for (const prompt of prompts) {
      expect(prompt.getAttribute("aria-hidden")).toBe("true")
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
      document.querySelector('img[src="/post-art/tickerbox-cli.gif"]')
    ).not.toBeNull()
    expect(
      document.querySelector('img[src="/post-art/tickerbox-cli-static.png"]')
    ).not.toBeNull()
  })

  it("shows the site bar with the post current and blog linked", async () => {
    await renderPost()

    const current = screen.getByText("tickerbox-cli", {
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

  it("points to its own manifest hash and to /blog/verify-posts", async () => {
    await renderPost()

    const { manifestEntryForSlug, readManifestLookup } =
      await import("@/lib/manifest/manifest-lookup")
    const entry = manifestEntryForSlug("tickerbox-cli", readManifestLookup())

    if (entry !== undefined) {
      expect(screen.getByText(entry.sha256)).toBeTruthy()
    }

    expect(
      screen.getByRole("link", { name: "/blog/verify-posts" })
    ).toHaveAttribute("href", "/blog/verify-posts")
    expect(screen.getByRole("link", { name: "/posts.asc" })).toHaveAttribute(
      "href",
      "/posts.asc"
    )
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

describe("tickerbox-cli metadata", () => {
  it("previews as its own post, not the site root", async () => {
    const { metadata } = await import("./page")

    expect(metadata.openGraph).toMatchObject({
      type: "article",
      url: `${site.url}/blog/tickerbox-cli`,
      title: "tickerbox-cli",
    })
  })

  it("keeps the site-wide fields that an openGraph override must not drop", async () => {
    const { metadata } = await import("./page")

    expect(metadata.openGraph?.siteName).toBe(site.name)
    expect(metadata.openGraph?.locale).toBe(site.locale)
  })
})
