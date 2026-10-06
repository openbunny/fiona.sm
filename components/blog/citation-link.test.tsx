/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { CitationLink } from "@/components/blog/citation-link"

afterEach(() => {
  cleanup()
})

describe("CitationLink", () => {
  it("renders a plain anchor to the given href", () => {
    render(
      <CitationLink href="https://example.test/paper">source</CitationLink>
    )

    const link = screen.getByRole("link", { name: "source" })
    expect(link.getAttribute("href")).toBe("https://example.test/paper")
  })

  it("does not cancel ordinary navigation", () => {
    render(<CitationLink href="#source">source</CitationLink>)
    expect(fireEvent.click(screen.getByRole("link", { name: "source" }))).toBe(
      true
    )
  })
})
