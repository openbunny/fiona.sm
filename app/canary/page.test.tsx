/** @vitest-environment jsdom */

import { screen } from "@testing-library/react"
import { renderToReadableStream } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

import Page, { metadata } from "@/app/canary/page"
import { site } from "@/lib/site/site"

afterEach(() => {
  document.body.innerHTML = ""
})

function spokenText(element: Element): string {
  return [...element.childNodes]
    .filter(
      (node) =>
        !(
          node instanceof Element && node.getAttribute("aria-hidden") === "true"
        )
    )
    .map((node) => node.textContent)
    .join("")
}

async function renderPage(): Promise<void> {
  const stream = await renderToReadableStream(<Page />)
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
}

describe("Page (minimal)", () => {
  it("carries the canary plate masthead, not the home or blog one", async () => {
    await renderPage()

    expect(document.querySelector('img[src="/canary.gif"]')).not.toBeNull()
    expect(document.querySelector('img[src="/home.gif"]')).toBeNull()
    expect(document.querySelector('img[src="/blog.gif"]')).toBeNull()
  })

  it("gives the fingerprint a heading that only assistive technology reads", async () => {
    await renderPage()

    const fingerprint = screen.getByRole("heading", {
      level: 2,
      name: "key fingerprint",
    })

    expect(fingerprint.className).toMatch(/\bsr-only\b/)
    expect(fingerprint.parentElement?.tagName.toLowerCase()).toBe("section")
  })

  it("opens the outline with the name, the fingerprint, then the explanation", async () => {
    await renderPage()

    const outline = screen
      .getAllByRole("heading")
      .map(
        (heading) => `${heading.tagName.toLowerCase()} ${spokenText(heading)}`
      )

    expect(outline.slice(0, 6)).toEqual([
      "h1 key canary",
      "h2 canary status",
      "h2 key fingerprint",
      "h2 about this canary",
      "h2 statement",
      "h2 public key",
    ])
  })

  it("heads a section with each of the two hidden headings", async () => {
    await renderPage()

    for (const name of ["key fingerprint", "about this canary"]) {
      const heading = screen.getByRole("heading", { level: 2, name })

      expect(heading.className).toMatch(/\bsr-only\b/)
      expect(
        heading.parentElement?.tagName.toLowerCase(),
        `the h2 "${name}" does not head a section`
      ).toBe("section")
    }
  })

  it("numbers the visible sections in order, starting at 1", async () => {
    await renderPage()

    const numbers = [
      ...document.querySelectorAll("main h2 > span[aria-hidden]"),
    ].map((span) => span.textContent)

    expect(numbers).toEqual(numbers.map((_, index) => String(index + 1)))
    expect(numbers.length).toBeGreaterThan(3)
  })

  it("gives every numbered section an anchor a link can target", async () => {
    await renderPage()

    const ids = [...document.querySelectorAll("main section[id]")].map(
      (section) => section.id
    )

    expect(ids).toEqual(
      expect.arrayContaining(["statement", "public-key", "verify"])
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("renders no interactive demo or reference sections", async () => {
    await renderPage()

    const ids = new Set(
      [...document.querySelectorAll("main section[id]")].map(
        (section) => section.id
      )
    )

    for (const id of ["try", "limits", "hints", "references"]) {
      expect(ids.has(id), `/ should not render #${id}`).toBe(false)
    }
  })
})

describe("canary metadata", () => {
  it("previews as its own page, not the site root", () => {
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: `${site.url}/canary`,
      title: "canary",
    })
  })

  it("keeps the site-wide fields that an openGraph override must not drop", () => {
    expect(metadata.openGraph?.siteName).toBe(site.name)
    expect(metadata.openGraph?.locale).toBe(site.locale)
  })
})
