/** @vitest-environment jsdom */

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { PlateHeader } from "@openbunny/react"
import { PRIVACY_PLATE } from "@/lib/images/plates"

afterEach(cleanup)

describe("PlateHeader", () => {
  it("rules off the masthead, so a page cannot drift from the shared separator", () => {
    const { container } = render(
      <PlateHeader asset={PRIVACY_PLATE} plateClassName="w-[245px]" />
    )
    const header = container.querySelector("header")

    expect(header?.className).toBe("mt-6 border-b border-line")
  })

  it("renders both the animated and the reduced-motion source", () => {
    const { container } = render(
      <PlateHeader asset={PRIVACY_PLATE} plateClassName="w-[245px]" />
    )
    expect(container.querySelector("picture > img")).toHaveAttribute(
      "src",
      PRIVACY_PLATE.animatedSrc
    )
    expect(
      container.querySelector(
        'picture > source[media="(prefers-reduced-motion: reduce)"]'
      )
    ).toHaveAttribute("srcset", PRIVACY_PLATE.staticSrc)
  })

  it("passes the display width through to the plate", () => {
    const { container } = render(
      <PlateHeader asset={PRIVACY_PLATE} plateClassName="w-[245px]" />
    )

    expect(container.querySelector("span")?.className).toContain("w-[245px]")
  })
})
