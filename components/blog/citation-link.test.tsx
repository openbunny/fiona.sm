/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CitationLink } from "@/components/blog/citation-link"

const analytics = vi.hoisted(() => ({ track: vi.fn() }))

vi.mock("@vercel/analytics", () => ({ track: analytics.track }))

beforeEach(() => {
  analytics.track.mockReset()
})

afterEach(() => {
  cleanup()
})

describe("CitationLink", () => {
  it("renders a plain anchor to the given href", () => {
    render(
      <CitationLink id="jaynes2003" href="https://example.test/paper">
        source
      </CitationLink>
    )

    const link = screen.getByRole("link", { name: "source" })
    expect(link.getAttribute("href")).toBe("https://example.test/paper")
  })

  it("fires citation-click with the reference id on click", () => {
    render(
      <CitationLink id="jaynes2003" href="https://example.test/paper">
        source
      </CitationLink>
    )

    fireEvent.click(screen.getByRole("link", { name: "source" }))

    expect(analytics.track).toHaveBeenCalledWith("citation-click", {
      ref: "jaynes2003",
    })
  })

  it("still navigates when the analytics call throws", () => {
    analytics.track.mockImplementation(() => {
      throw new Error("blocked by ad blocker")
    })
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)

    render(
      <CitationLink id="jaynes2003" href="https://example.test/paper">
        source
      </CitationLink>
    )

    const notCanceled = fireEvent.click(
      screen.getByRole("link", { name: "source" })
    )

    expect(analytics.track).toHaveBeenCalled()
    expect(notCanceled).toBe(true)
    error.mockRestore()
  })
})
