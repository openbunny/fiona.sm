/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Button } from "@openbunny/react"

afterEach(() => {
  cleanup()
})

describe("Button", () => {
  it("shows a focus ring and never rounds its corners", () => {
    render(<Button>Go</Button>)
    const button = screen.getByRole("button", { name: "Go" })

    expect(button.className).toMatch(/focus-visible:ring-ring/)
    expect(button.className).not.toMatch(/\brounded-/)
  })
})
