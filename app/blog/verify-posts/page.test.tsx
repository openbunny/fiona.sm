/** @vitest-environment jsdom */

import { screen } from "@testing-library/react"
import { renderToReadableStream } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

import Page, { metadata } from "@/app/blog/verify-posts/page"
import { postsByNewest } from "@/lib/blog/posts"
import { canary } from "@/lib/canary/canary"
import { formatLongDate } from "@/lib/iso-date"
import { readManifestLookup } from "@/lib/manifest/manifest-lookup"
import { manifestSignedAt } from "@/lib/manifest/manifest-signed-at"
import { manifestStatusText } from "@/lib/manifest/manifest-status-text"
import {
  articleTextVerifySteps,
  manifestVerifyCommands,
} from "@/lib/manifest/verify-commands"
import { siteLastChangedAt } from "@/lib/site/commit-date"
import { site } from "@/lib/site/site"

const examplePost = postsByNewest()[0]
if (examplePost === undefined) {
  throw new Error("expected at least one published post for this test")
}

afterEach(() => {
  document.body.innerHTML = ""
})

async function renderPage(): Promise<void> {
  const stream = await renderToReadableStream(<Page />)
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
}

describe("VerifyPage", () => {
  it("opens with a verify blog posts heading", async () => {
    await renderPage()

    expect(
      screen.getByRole("heading", { level: 1, name: "verify blog posts" })
    ).toBeTruthy()
  })

  it("shows the site's last-changed date below the heading, not a per-page edit time", async () => {
    await renderPage()

    const lastChangedAt = siteLastChangedAt()
    const time = screen.getByText(
      `site last changed ${formatLongDate(lastChangedAt.slice(0, 10))}`
    )
    expect(time.tagName).toBe("TIME")
    expect(time.getAttribute("datetime")).toBe(lastChangedAt)
    expect(screen.queryByText(/last edited/)).toBeNull()
  })

  it("states the manifest's own signing time in the body, as a fact about the manifest", async () => {
    await renderPage()

    const signedAt = await manifestSignedAt()
    const expectedText = `manifest signed ${formatLongDate(signedAt.slice(0, 10))}.`
    const paragraph = [...document.querySelectorAll("main p")].find(
      (p) => p.textContent === expectedText
    )

    expect(paragraph).toBeTruthy()
    const time = paragraph?.querySelector("time")
    expect(time?.getAttribute("datetime")).toBe(signedAt)
  })

  it("numbers its three sections in order, starting at 1", async () => {
    await renderPage()

    const numbers = [
      ...document.querySelectorAll("main h2 > span[aria-hidden]"),
    ].map((span) => span.textContent)

    expect(numbers).toEqual(["1", "2", "3"])
  })

  it("gives each section an anchor a link can target", async () => {
    await renderPage()

    const ids = [...document.querySelectorAll("main section[id]")].map(
      (section) => section.id
    )

    expect(ids).toEqual(["attests", "verify-manifest", "verify-post"])
  })

  it("states accurately, from the real manifest file, whether it is signed", async () => {
    await renderPage()

    const expected = manifestStatusText(readManifestLookup())
    expect(screen.getByText(expected)).toBeTruthy()
  })

  it("offers the manifest-verify commands for fiona's actual key", async () => {
    await renderPage()

    for (const command of manifestVerifyCommands(
      canary.siteOrigin,
      canary.fingerprint
    )) {
      expect(
        screen.getByRole("button", { name: `copy command: ${command}` })
      ).toBeTruthy()
    }
  })

  it("offers the article-text verify command for the example post, naming only public inputs", async () => {
    await renderPage()

    const [step] = articleTextVerifySteps(
      canary.siteOrigin,
      canary.fingerprint,
      examplePost.slug
    )
    if (step === undefined) {
      throw new Error("expected at least one article-text verify step")
    }

    expect(
      screen.getByRole("button", { name: `copy command: ${step.command}` })
    ).toBeTruthy()
    expect(
      screen.queryByRole("button", {
        name: "copy command: bun run manifest verify",
      })
    ).toBeNull()
  })

  it("describes the normalisation instead of citing a private file", async () => {
    await renderPage()

    expect(screen.queryByText("docs/post-manifest.md")).toBeNull()
    expect(screen.queryByText("lib/manifest/article-text.ts")).toBeNull()
    expect(screen.getAllByText(/screen-reader-only/).length).toBeGreaterThan(0)
  })

  it("links to the manifest file and to the canary page", async () => {
    await renderPage()

    expect(screen.getByRole("link", { name: "/posts.asc" })).toHaveAttribute(
      "href",
      "/posts.asc"
    )
    expect(screen.getByRole("link", { name: "canary" })).toHaveAttribute(
      "href",
      "/canary"
    )
  })

  it("shows the site bar with blog linked and a way back up to it", async () => {
    await renderPage()

    expect(
      screen.getByRole("link", { name: "blog" }).getAttribute("href")
    ).toBe("/blog")
    expect(
      screen.getByRole("link", { name: /^up to /u }).getAttribute("href")
    ).toBe("/blog")
  })

  it("carries the site footer's privacy and mail links", async () => {
    await renderPage()

    expect(
      screen.getByRole("link", { name: "/privacy" }).getAttribute("href")
    ).toBe("/privacy")
    expect(
      screen.getByRole("link", { name: canary.email }).getAttribute("href")
    ).toBe(`mailto:${canary.email}`)
  })
})

describe("verify metadata", () => {
  it("previews as its own page, not the site root", () => {
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: `${site.url}/blog/verify-posts`,
      title: "verify blog posts",
    })
  })

  it("keeps the site-wide fields that an openGraph override must not drop", () => {
    expect(metadata.openGraph?.siteName).toBe(site.name)
    expect(metadata.openGraph?.locale).toBe(site.locale)
  })
})
