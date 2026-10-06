/** @vitest-environment jsdom */

import { cleanup, screen, within } from "@testing-library/react"
import { renderToReadableStream } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

import { site } from "@/lib/site/site"

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

async function renderPost(): Promise<void> {
  const { default: WormsWmdPage } = await import("./page")
  const stream = await renderToReadableStream(<WormsWmdPage />)
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
}

function sourceHref(refId: string): string | null {
  const ref = document.getElementById(refId)
  if (ref === null) {
    throw new Error(`${refId} not found`)
  }
  return within(ref).getByRole("link", { name: "source" }).getAttribute("href")
}

describe("WormsWmdPage", () => {
  it("opens with the post title as the heading", async () => {
    await renderPost()

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "playing worms on my macbook",
      })
    ).toBeTruthy()
  })

  it("dates the post with a machine-readable time element", async () => {
    await renderPost()

    expect(document.querySelector("time")?.getAttribute("dateTime")).toBe(
      "2026-10-06"
    )
  })

  it("reuses one number for the original fix, cited twice", async () => {
    await renderPost()

    const marks = screen.getAllByRole("link", { name: /^\[\d\]$/ })
    expect(marks.map((mark) => mark.textContent)).toEqual([
      "[1]",
      "[2]",
      "[3]",
      "[4]",
      "[3]",
    ])
  })

  it("lists every cited reference once, in first-appearance order", async () => {
    await renderPost()

    expect(screen.getAllByRole("listitem").map((item) => item.id)).toEqual([
      "ref-worms-wmd",
      "ref-macos-26-release-notes",
      "ref-wormswmd-macos-fix",
      "ref-wormswmd",
    ])
  })

  it("gives the twice-cited original fix two back-links", async () => {
    await renderPost()

    expect(
      document.querySelectorAll(
        '#ref-wormswmd-macos-fix a[href^="#cite-wormswmd-macos-fix-"]'
      )
    ).toHaveLength(2)
  })

  it("links each reference to its source", async () => {
    await renderPost()

    expect(sourceHref("ref-worms-wmd")).toBe(
      "https://store.steampowered.com/app/327030/Worms_WMD/"
    )
    expect(sourceHref("ref-macos-26-release-notes")).toBe(
      "https://developer.apple.com/documentation/macos-release-notes/macos-26-release-notes"
    )
    expect(sourceHref("ref-wormswmd-macos-fix")).toBe(
      "https://github.com/cboyd0319/WormsWMD-macOS-Fix"
    )
    expect(sourceHref("ref-wormswmd")).toBe(
      "https://github.com/openbunny/wormswmd"
    )
  })

  it("shows the results screenshot inside the article, described for a screen reader", async () => {
    await renderPost()

    const shot = screen.getByRole("img", { name: /results screen/ })
    expect(shot).toHaveAttribute(
      "src",
      "/img/18b57a57bcbefbae09c768845e08fcf75ea2ddda63249e2fe3bc9415a894facee2a4527de0c0344093c646791384375263f36451b0cf7afd803f4de308d1af23.webp"
    )
    expect(shot.closest("article")).not.toBeNull()
    expect(
      shot.closest("figure")?.querySelector("figcaption")
    ).toHaveTextContent("old screenshot, i didnt win this time")
  })

  it("renders its declared per-post artwork and no home plate", async () => {
    await renderPost()

    expect(
      document.querySelector(
        'img[src="/img/51829f0641dbb4269c039c6588110c9f16d7e7317a5aae81cfcd98293d4e93d5736b4a4691725179767fe48a496a7fa309c4521b16e86ceb2296ff387c6e1b01.webp"]'
      )
    ).not.toBeNull()
    expect(
      document.querySelector(
        'source[media="(prefers-reduced-motion: reduce)"][srcset="/img/9dd0d8a9a980e89e2eced081c136ba81bc51f1056a865b7ef8d4239a39b5bf4fa140af8385001e3083309f92e75a9019f20ad6e478f90eb9b1823606677a330c.png"]'
      )
    ).not.toBeNull()
    expect(
      document.querySelector(
        'img[src="/img/bd0a1c582aa64034a09953f1571e2782fdae0b481ffc42371b836b1fc92611e7f02ec73b31412729aae840b832052051b5db404ecf532a3a38219451eb273c34.webp"]'
      )
    ).toBeNull()
  })
})

describe("worms-wmd metadata", () => {
  it("previews as its own post, not the site root", async () => {
    const { metadata } = await import("./page")

    expect(metadata.openGraph).toMatchObject({
      type: "article",
      url: `${site.url}/blog/worms-wmd`,
      title: "playing worms on my macbook",
    })
  })
})
