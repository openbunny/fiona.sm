/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { renderToReadableStream } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

import PrivacyPage, { metadata } from "@/app/privacy/page"
import { SiteFooter } from "@/components/site-footer"
import { canary } from "@/lib/canary/canary"
import { formatLongDate } from "@/lib/iso-date"
import { siteLastChangedAt } from "@/lib/site/commit-date"
import { site } from "@/lib/site/site"

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

async function renderPrivacyPage(): Promise<void> {
  const stream = await renderToReadableStream(<PrivacyPage />)
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
}

describe("PrivacyPage", () => {
  it("opens with a Privacy heading", async () => {
    await renderPrivacyPage()

    expect(
      screen.getByRole("heading", { level: 1, name: "privacy" })
    ).toBeTruthy()
  })

  it("shows the site's last-changed date below the heading, not a per-page edit time", async () => {
    await renderPrivacyPage()

    const lastChangedAt = siteLastChangedAt()
    const time = screen.getByText(
      `site last changed ${formatLongDate(lastChangedAt.slice(0, 10))}`
    )
    expect(time.tagName).toBe("TIME")
    expect(time.getAttribute("datetime")).toBe(lastChangedAt)
    expect(screen.queryByText(/last edited/)).toBeNull()
  })

  it("carries one section per policy area", async () => {
    await renderPrivacyPage()

    for (const name of [
      "tracking",
      "hosting and transport",
      "on this device",
      "contact",
      "with javascript blocked",
    ]) {
      const heading = screen.getByRole("heading", { level: 2, name })

      expect(
        heading.parentElement?.tagName.toLowerCase(),
        `the h2 "${name}" does not head a section`
      ).toBe("section")
    }
  })

  it("names the production-only measurement and the contact address", async () => {
    await renderPrivacyPage()

    expect(screen.getByText(/run in production only/)).toBeTruthy()
    expect(screen.getAllByRole("link", { name: canary.email })).toHaveLength(2)
  })

  it("links the footer to the policy route as a path", () => {
    render(<SiteFooter />)

    const privacy = screen.getByRole("link", { name: "/privacy" })

    expect(privacy.getAttribute("href")).toBe("/privacy")
  })

  it("mentions no /plain route anywhere on the page", async () => {
    await renderPrivacyPage()

    expect(document.body.textContent).not.toContain("/plain")
  })

  it("describes JavaScript-blocked behavior for the page", async () => {
    await renderPrivacyPage()

    expect(
      screen.getByText(/served the same document as everyone else/)
    ).toBeTruthy()
    expect(
      screen.getByText(/it has no separate no-script version/)
    ).toBeTruthy()
    expect(
      screen.getByText(/needs javascript to run, and\s+nothing is\s+stored/)
    ).toBeTruthy()
  })

  it("claims no off-origin request anywhere in the device policy", async () => {
    await renderPrivacyPage()

    expect(
      screen.getByText(/asks this browser to\s+contact any other host/)
    ).toBeTruthy()
    expect(screen.queryByText(/Monero check/)).toBeNull()
  })

  it("stores nothing in the browser and discloses the page view", async () => {
    await renderPrivacyPage()

    expect(screen.getByText(/nothing is stored in this\s+browser/)).toBeTruthy()
    expect(screen.queryByText(/fiona-theme/)).toBeNull()
    expect(
      screen.getByText(/record a page view on every page load/)
    ).toBeTruthy()
  })

  it("distinguishes an event the reader triggers from one observed without any action", async () => {
    await renderPrivacyPage()

    expect(
      screen.getByText(
        /triggered by something the reader does, such as pressing a copy button/
      )
    ).toBeTruthy()
    expect(
      screen.getByText(
        /triggered by nothing more than reaching a point in the page, with no action from the reader required/
      )
    ).toBeTruthy()
  })

  it("discloses that a no-JS visitor gets no reference to any measurement script", async () => {
    await renderPrivacyPage()

    expect(
      screen.getByText(/no script tag is present in the html/)
    ).toBeTruthy()
    expect(
      screen.getByText(/receives no reference to any of them/)
    ).toBeTruthy()
  })

  it("states that the page contacts no other host", async () => {
    await renderPrivacyPage()

    expect(screen.getByText(/never requests them/).textContent).toMatch(
      /asks this browser to contact any other host/
    )
  })
})

describe("privacy metadata", () => {
  it("previews as its own page, not the site root", () => {
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: `${site.url}/privacy`,
      title: "privacy",
    })
  })

  it("keeps the site-wide fields that an openGraph override must not drop", () => {
    expect(metadata.openGraph?.siteName).toBe(site.name)
    expect(metadata.openGraph?.locale).toBe(site.locale)
  })
})
