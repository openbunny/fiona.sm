/** @vitest-environment jsdom */

import { screen } from "@testing-library/react"
import { renderToReadableStream } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CanaryPage } from "@/components/canary/canary-page"
import type * as CanaryHistory from "@/lib/canary/canary-history"

const archives = vi.hoisted(() => ({ list: vi.fn(() => [] as unknown[]) }))

vi.mock("@/lib/canary/canary-history", async () => {
  const actual = await vi.importActual<typeof CanaryHistory>(
    "@/lib/canary/canary-history"
  )
  return { ...actual, listCanaryArchives: archives.list }
})

afterEach(() => {
  document.body.innerHTML = ""
})

async function renderPage(): Promise<void> {
  const stream = await renderToReadableStream(<CanaryPage />)
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
}

describe("CanaryPage without a canary history", () => {
  it("numbers sections in order, with no history section", async () => {
    archives.list.mockReturnValue([])
    await renderPage()

    const ids = [...document.querySelectorAll("main section[id]")].map(
      (section) => section.id
    )

    expect(ids).toEqual(["statement", "public-key", "verify", "proof-of-date"])

    const numbers = [
      ...document.querySelectorAll("main h2 > span[aria-hidden]"),
    ].map((span) => span.textContent)
    expect(numbers).toEqual(["1", "2", "3", "4"])
    expect(
      screen.queryByRole("heading", { name: /statement history/ })
    ).toBeNull()
  })
})
