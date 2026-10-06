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
    const images = [...container.querySelectorAll("picture > img")]
    expect(images).toHaveLength(1)
    expect(images[0]).toHaveAttribute(
      "src",
      "/img/bd0a1c582aa64034a09953f1571e2782fdae0b481ffc42371b836b1fc92611e7f02ec73b31412729aae840b832052051b5db404ecf532a3a38219451eb273c34.webp"
    )
    expect(
      container.querySelector(
        'picture > source[media="(prefers-reduced-motion: reduce)"]'
      )
    ).toHaveAttribute(
      "srcset",
      "/img/307014014e81e15d12eede25b66d81db0b2939f99b8611072ab6c009cf9a6c6a25e41f8051552f6efb4c3c87a9c835dd55a76cb430b4632c3ef6d12e94a94841.png"
    )
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
