/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Fingerprint } from "@/components/canary/fingerprint"
import { canary } from "@/lib/canary/canary"
import { fingerprintLine } from "@/lib/canary/fingerprint"

afterEach(() => {
  cleanup()
})

const line = fingerprintLine(canary.fingerprint)

describe("Fingerprint", () => {
  it("names itself with hidden text rather than aria-label on a paragraph", () => {
    const { container } = render(<Fingerprint />)
    const paragraph = container.querySelector("p")
    expect(paragraph).not.toBeNull()
    expect(paragraph?.getAttribute("aria-label")).toBeNull()
    expect(
      screen.getByText(`openpgp fingerprint, in ten groups of four: ${line}`)
        .className
    ).toMatch(/sr-only/)
  })

  it("hides the visible line so the groups are not read twice", () => {
    render(<Fingerprint />)
    expect(screen.getByText(line).getAttribute("aria-hidden")).toBe("true")
  })

  it("scrolls rather than pushing the page sideways", () => {
    const { container } = render(<Fingerprint />)
    expect(container.querySelector("p")?.className).toMatch(/overflow-x-auto/)
  })

  it("centers the fingerprint block horizontally", () => {
    const { container } = render(<Fingerprint />)
    expect(container.querySelector("p")?.className).toMatch(/text-center/)
  })

  it("keeps a deliberate keyboard stop, which is not the overflow pairing", () => {
    const { container } = render(<Fingerprint />)
    const paragraph = container.querySelector("p")

    expect(paragraph?.getAttribute("tabindex")).toBe("0")
    expect(paragraph?.textContent).toContain(
      "openpgp fingerprint, in ten groups of four"
    )
  })
})
