/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CommandBlock } from "@/components/command-block"

afterEach(() => {
  cleanup()
})

const steps = [
  { command: "one --a", comment: "First step." },
  { command: "two 'b c'", comment: "Second step." },
]

describe("CommandBlock", () => {
  it("renders one copy field per command", () => {
    render(<CommandBlock id="verify" number="4" title="Verify" steps={steps} />)
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getAllByRole("button")).toHaveLength(2)
  })

  it("names every copy control after the command it copies", () => {
    render(<CommandBlock id="verify" number="4" title="Verify" steps={steps} />)
    expect(
      screen.getByRole("button", { name: "copy command: one --a" })
    ).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "copy command: two 'b c'" })
    ).toBeTruthy()
  })

  it("adds one control that copies every command when asked", () => {
    render(
      <CommandBlock
        id="verify"
        number="4"
        title="Verify"
        steps={steps}
        copyAll
      />
    )
    expect(
      screen.getByRole("button", { name: "copy all Verify commands" })
    ).toHaveTextContent("copy all")
  })

  it("chains the copied commands so a failed step stops the ones after it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })
    render(
      <CommandBlock
        id="verify"
        number="4"
        title="Verify"
        steps={steps}
        copyAll
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: "copy all Verify commands" })
    )

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        steps.map((step) => step.command).join(" &&\n")
      )
    })
  })

  it("numbers each step under the section number, hidden from the heading name", () => {
    render(<CommandBlock id="verify" number="4" title="Verify" steps={steps} />)
    expect(
      screen.getByRole("heading", { level: 2, name: "Verify" })
    ).toHaveTextContent("4Verify")
    expect(screen.getByText("Second step.")).toHaveTextContent(
      "4.2Second step."
    )
  })

  it("keeps the command text whole while colouring its parts", () => {
    const { container } = render(
      <CommandBlock id="verify" number="4" title="Verify" steps={steps} />
    )
    const code = container.querySelectorAll("code")[1]
    expect(code?.textContent).toBe("$two 'b c'")
    expect(code?.querySelector(".tok-cmd")?.textContent).toBe("two")
    expect(code?.querySelector(".tok-str")?.textContent).toBe("'b c'")
  })

  it("marks the prompt as decorative and unselectable", () => {
    render(
      <CommandBlock
        id="verify"
        number="4"
        title="Verify"
        steps={steps.slice(0, 1)}
      />
    )
    const prompt = screen.getByText("$")
    expect(prompt.getAttribute("aria-hidden")).toBe("true")
    expect(prompt.className).toMatch(/select-none/)
  })

  it("boxes each command row like the statement and public-key panels", () => {
    const { container } = render(
      <CommandBlock id="verify" number="4" title="Verify" steps={steps} />
    )
    const row = container.querySelectorAll("li > div")[0]
    expect(row?.className).toMatch(/\bborder\b/)
    expect(row?.className).toMatch(/\bborder-line\b/)
    expect(row?.className).toMatch(/\bbg-paper-inset\b/)
    expect(row?.className).not.toMatch(/\brounded-/)
  })

  it("keeps the step number out of the accessible name", () => {
    render(<CommandBlock id="verify" number="4" title="Verify" steps={steps} />)
    const index = screen.getByText("4.1")
    expect(index.getAttribute("aria-hidden")).toBe("true")
  })

  it("renders a note under the commands when one is given", () => {
    render(
      <CommandBlock
        id="verify"
        number="4"
        title="Verify"
        steps={steps}
        note="compare the fingerprint elsewhere."
      />
    )
    expect(screen.getByText("compare the fingerprint elsewhere.")).toBeTruthy()
  })

  it("renders nothing beyond the step sentences without a note", () => {
    const { container } = render(
      <CommandBlock id="verify" number="4" title="Verify" steps={steps} />
    )
    expect(container.querySelectorAll("p")).toHaveLength(steps.length)
  })
})
