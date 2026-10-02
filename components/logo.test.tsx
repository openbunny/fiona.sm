/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Logo } from "@/components/logo"

afterEach(() => {
  cleanup()
})

describe("Logo", () => {
  it("swaps to the still frame when motion is reduced", () => {
    const { container } = render(<Logo />)
    const images = [...container.querySelectorAll("img")]
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute("src", "/home.gif")
    expect(images[0]?.className).toMatch(/motion-reduce:hidden/)
    expect(images[1]).toHaveAttribute("src", "/home-static.png")
    expect(images[1]?.className).toMatch(/motion-reduce:block/)
  })

  it("carries no name of its own, because a heading always names it", () => {
    const { container } = render(<Logo />)
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
    for (const img of container.querySelectorAll("img")) {
      expect(img.getAttribute("alt")).toBe("")
    }
    expect(screen.queryByRole("img")).toBeNull()
  })
})
