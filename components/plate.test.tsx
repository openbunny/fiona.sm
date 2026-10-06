/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Plate } from "@openbunny/react"
import { HOME_PLATE } from "@/lib/images/plates"

afterEach(() => {
  cleanup()
})

describe("Plate", () => {
  it("swaps to the still frame when motion is reduced", () => {
    const { container } = render(<Plate asset={HOME_PLATE} />)
    const images = [...container.querySelectorAll("picture > img")]
    expect(images).toHaveLength(1)
    expect(images[0]).toHaveAttribute("src", HOME_PLATE.animatedSrc)
    expect(
      container.querySelector(
        'picture > source[media="(prefers-reduced-motion: reduce)"]'
      )
    ).toHaveAttribute("srcset", HOME_PLATE.staticSrc)
  })

  it("carries the asset's native dimensions on its image", () => {
    const { container } = render(<Plate asset={HOME_PLATE} />)

    for (const img of container.querySelectorAll("img")) {
      expect(img.getAttribute("width")).toBe(String(HOME_PLATE.width))
      expect(img.getAttribute("height")).toBe(String(HOME_PLATE.height))
    }
  })

  it("carries no name of its own, because a heading always names it", () => {
    const { container } = render(<Plate asset={HOME_PLATE} />)

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
    for (const img of container.querySelectorAll("img")) {
      expect(img.getAttribute("alt")).toBe("")
    }
    expect(screen.queryByRole("img")).toBeNull()
  })
})
