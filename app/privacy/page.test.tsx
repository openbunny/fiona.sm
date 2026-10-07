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

  it("discloses browser analytics and names the contact address", async () => {
    await renderPrivacyPage()

    expect(screen.getByText(/can record page views/)).toBeTruthy()
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
      screen.getByText(/require javascript to run, and\s+nothing is\s+stored/)
    ).toBeTruthy()
  })

  it("names the off-origin beacon and excludes verification endpoints", async () => {
    await renderPrivacyPage()

    expect(
      screen.getByText(/analytics beacon is the only\s+off-origin script/)
    ).toBeTruthy()
    expect(screen.queryByText(/Monero check/)).toBeNull()
  })

  it("states the beacon storage policy and excludes custom events", async () => {
    await renderPrivacyPage()

    expect(screen.getByText(/nothing is stored in this\s+browser/)).toBeTruthy()
    expect(screen.queryByText(/fiona-theme/)).toBeNull()
    expect(
      screen.getByText(
        /copy actions, citation clicks and reading progress are not\s+reported/
      )
    ).toBeTruthy()
    expect(
      screen.getByText(/beacon uses no cookies or browser storage/)
    ).toBeTruthy()
  })

  it("links the hosting provider's privacy policy", async () => {
    await renderPrivacyPage()
    const link = screen.getByRole("link", { name: "cloudflare privacy policy" })
    expect(link.getAttribute("href")).toBe(
      "https://www.cloudflare.com/privacypolicy/"
    )
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe("noopener noreferrer")
  })

  it("links the analytics vendor documentation", async () => {
    await renderPrivacyPage()

    expect(
      screen
        .getByRole("link", { name: "beacon privacy documentation" })
        .getAttribute("href")
    ).toBe(
      "https://developers.cloudflare.com/speed/observatory/rum-beacon/#privacy-information"
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
