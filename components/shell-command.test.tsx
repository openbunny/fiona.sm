/** @vitest-environment jsdom */

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ShellCommand } from "@openbunny/react"

afterEach(() => {
  cleanup()
})

describe("ShellCommand", () => {
  it("marks a flag apart from the command word it modifies", () => {
    const { container } = render(<ShellCommand command="gpg --verify" />)
    const flag = container.querySelector(".tok-flag")
    const cmd = container.querySelector(".tok-cmd")

    expect(flag?.textContent).toBe("--verify")
    expect(cmd?.textContent).toBe("gpg")
    expect(flag?.className).not.toBe(cmd?.className)
  })

  it("leaves a quoted string token with no extra classes", () => {
    const { container } = render(<ShellCommand command="two 'b c'" />)
    const str = container.querySelector(".tok-str")

    expect(str?.className).toBe("tok-str")
  })
})
