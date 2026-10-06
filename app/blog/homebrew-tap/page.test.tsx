/** @vitest-environment jsdom */

import { cleanup, screen } from "@testing-library/react"
import { renderToReadableStream } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

async function renderPost(): Promise<void> {
  const { default: HomebrewTapPage } = await import("./page")
  const stream = await renderToReadableStream(<HomebrewTapPage />)
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
}

describe("HomebrewTapPage", () => {
  it("opens with the post title as the heading", async () => {
    await renderPost()

    expect(
      screen.getByRole("heading", { level: 1, name: "custom homebrew tap" })
    ).toBeTruthy()
  })

  it("numbers its seven sources by first appearance", async () => {
    await renderPost()

    expect(
      screen
        .getAllByRole("link", { name: /^\[\d\]$/ })
        .map((mark) => mark.textContent)
    ).toEqual(["[1]", "[2]", "[3]", "[4]", "[5]", "[6]", "[7]"])
  })

  it("labels the reference links in lowercase, not the package defaults", async () => {
    await renderPost()

    expect(screen.getAllByRole("link", { name: "source" })).toHaveLength(7)
    expect(screen.queryByRole("link", { name: "Source" })).toBeNull()
    expect(
      screen.getByRole("link", { name: "back to citation 1" })
    ).toHaveAttribute("href", "#cite-proton-cli-1")
  })

  it("renders the tap commands in copyable command boxes", async () => {
    await renderPost()

    expect(
      screen.getByRole("button", { name: "copy command: brew tap oa/tap" })
    ).toBeTruthy()
  })
})
