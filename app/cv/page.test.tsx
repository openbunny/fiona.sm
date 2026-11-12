/** @vitest-environment jsdom */

import { screen, within } from "@testing-library/react"
import { renderToReadableStream } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

import CvPage, { metadata } from "@/app/cv/page"
import { formatLongDate } from "@/lib/iso-date"
import { siteLastChangedAt } from "@/lib/site/commit-date"
import { site } from "@/lib/site/site"

afterEach(() => {
  document.body.innerHTML = ""
})

async function renderCvPage(): Promise<void> {
  const stream = await renderToReadableStream(<CvPage />)
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
}

describe("CvPage", () => {
  it("opens with a cv heading", async () => {
    await renderCvPage()

    expect(screen.getByRole("heading", { level: 1, name: "cv" })).toBeTruthy()
  })

  it("shows the site's last-changed date below the heading", async () => {
    await renderCvPage()

    const lastChangedAt = siteLastChangedAt()
    const time = screen.getByText(
      `site last changed ${formatLongDate(lastChangedAt.slice(0, 10))}`
    )
    expect(time.tagName).toBe("TIME")
    expect(time.getAttribute("datetime")).toBe(lastChangedAt)
  })

  it("publishes no cv content yet, so the heading and its date are all the main region holds", async () => {
    await renderCvPage()

    const main = screen.getByRole("main")
    const changed = `site last changed ${formatLongDate(siteLastChangedAt().slice(0, 10))}`

    expect(main.textContent).toBe(`cv${changed}`)
    expect(within(main).queryAllByRole("heading", { level: 2 })).toEqual([])
    expect(within(main).queryAllByRole("link")).toEqual([])
  })

  it("gives the main region the id the skip link targets", async () => {
    await renderCvPage()

    expect(document.querySelector("main")?.id).toBe("main")
  })

  it("shows the home plate, having no plate of its own", async () => {
    await renderCvPage()

    const header = document.querySelector("header")
    expect(header?.querySelector("img")).toBeTruthy()
  })

  it("places the route under the home path with no entries of its own", async () => {
    await renderCvPage()

    const nav = within(
      screen.getByRole("navigation", { name: "path and directory listing" })
    )
    expect(nav.getByRole("link", { name: "fiona.sm" })).toHaveAttribute(
      "href",
      "/"
    )
    const current = screen.getByText("cv", { selector: "[aria-current=page]" })
    expect(current.getAttribute("aria-current")).toBe("page")
  })

  it("carries the one site footer", async () => {
    await renderCvPage()

    const footer = within(screen.getByRole("contentinfo"))
    expect(
      footer.getByRole("link", { name: "/privacy" }).getAttribute("href")
    ).toBe("/privacy")
  })
})

describe("cv metadata", () => {
  it("previews as its own page, not the site root", () => {
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: `${site.url}/cv`,
      title: "cv",
    })
  })

  it("keeps the site-wide fields that an openGraph override must not drop", () => {
    expect(metadata.openGraph?.siteName).toBe(site.name)
    expect(metadata.openGraph?.locale).toBe(site.locale)
  })

  it("declares itself canonical at its own route", () => {
    expect(metadata.alternates?.canonical).toBe("/cv")
  })
})
