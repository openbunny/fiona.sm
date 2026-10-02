/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SectionHeading } from "@/components/section-heading"

afterEach(() => {
  cleanup()
})

describe("SectionHeading", () => {
  it("carries the index visually without putting it in the accessible name", () => {
    render(<SectionHeading number="4">Verify</SectionHeading>)
    const heading = screen.getByRole("heading", { level: 2, name: "Verify" })
    const index = heading.querySelector("span")

    expect(index?.textContent).toBe("4")
    expect(index?.getAttribute("aria-hidden")).toBe("true")
  })
})
