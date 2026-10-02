/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { CanaryFacts } from "@/components/canary/canary-facts"

afterEach(() => {
  cleanup()
})

describe("CanaryFacts", () => {
  it("pairs every label with a value when a statement is signed", () => {
    const { container } = render(
      <CanaryFacts signedAt="2024-01-02T03:04:05Z" renewBy="2024-04-02" />
    )
    const dl = container.querySelector("dl")

    expect(dl?.querySelectorAll("dt")).toHaveLength(3)
    expect(dl?.querySelectorAll("dd")).toHaveLength(3)
  })

  it("sets each label back from its value rather than boxing it", () => {
    render(<CanaryFacts signedAt="2024-01-02T03:04:05Z" renewBy="2024-04-02" />)
    const label = screen.getByText("key type")

    expect(label.className).toMatch(/text-muted/)
    expect(label.className).not.toMatch(/\bbg-/)
  })
})
