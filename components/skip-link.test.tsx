/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SkipLink } from "@/components/skip-link"

afterEach(() => {
  cleanup()
})

describe("SkipLink", () => {
  it("targets the main content and leaves the flow until focused", () => {
    render(<SkipLink />)
    const link = screen.getByRole("link", { name: "skip to content" })

    expect(link).toHaveAttribute("href", "#main")
    expect(link.className).toMatch(/\bsr-only\b/)
    expect(link.className).toMatch(/focus:not-sr-only/)
  })
})
