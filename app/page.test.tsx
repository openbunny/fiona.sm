/** @vitest-environment jsdom */

import { screen, within } from "@testing-library/react"
import { renderToReadableStream } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

import Page from "@/app/page"
import { canary } from "@/lib/canary/canary"

afterEach(() => {
  document.body.innerHTML = ""
})

async function renderPage(): Promise<void> {
  const stream = await renderToReadableStream(<Page />)
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
}

describe("Page (personal home)", () => {
  it("opens with the canary's display name as the only heading", async () => {
    await renderPage()

    const headings = screen.getAllByRole("heading")
    expect(headings).toHaveLength(1)
    expect(headings[0]?.tagName.toLowerCase()).toBe("h1")
    expect(headings[0]?.textContent).toBe(canary.displayName)
  })

  it("links to the canary route as a path, with its description alongside", async () => {
    await renderPage()

    const main = within(screen.getByRole("main"))
    const link = main.getByRole("link", { name: "/canary" })
    expect(link.getAttribute("href")).toBe("/canary")
    expect(
      main.getByText(/signed statement, renewed every 90 days/)
    ).toBeInTheDocument()
  })

  it("renders the directory listing's path link without an underline", async () => {
    await renderPage()

    const main = within(screen.getByRole("main"))
    const link = main.getByRole("link", { name: "/canary" })
    expect(link.className.split(" ")).toContain("no-underline")
  })

  it("publishes the fingerprint in full, in groups of four", async () => {
    await renderPage()

    const grouped = canary.fingerprint.replaceAll(/(.{4})(?=.)/g, "$1 ")
    expect(screen.getByText(grouped, { exact: false })).toBeInTheDocument()
  })

  it("gives the main region the id the skip link targets", async () => {
    await renderPage()

    expect(document.querySelector("main")?.id).toBe("main")
  })

  it("carries the footer's privacy and mail links", async () => {
    await renderPage()

    const footer = within(screen.getByRole("contentinfo"))
    expect(
      footer.getByRole("link", { name: "/privacy" }).getAttribute("href")
    ).toBe("/privacy")
    expect(
      footer.getByRole("link", { name: canary.email }).getAttribute("href")
    ).toBe(`mailto:${canary.email}`)
  })

  it("shows the site bar with the home entry current and blog and canary listed", async () => {
    await renderPage()

    const home = screen.getByText("~/fiona.sm")
    expect(home.tagName.toLowerCase()).toBe("span")
    expect(home.getAttribute("aria-current")).toBe("page")

    const nav = within(
      screen.getByRole("navigation", { name: "path and directory listing" })
    )
    const entries = nav.getAllByRole("link")
    expect(entries.map((entry) => entry.textContent)).toEqual([
      "/blog",
      "/canary",
    ])
    expect(entries[0]).toHaveAttribute("href", "/blog")
    expect(entries[1]).toHaveAttribute("href", "/canary")
    expect(entries).toHaveLength(2)
  })
})
