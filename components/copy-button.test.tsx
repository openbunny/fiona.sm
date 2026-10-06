/** @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CopyButton } from "@/components/copy-button"

const writeText = vi.fn()

beforeEach(() => {
  writeText.mockReset()
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  })
})

afterEach(() => {
  cleanup()
})

describe("CopyButton", () => {
  it("turns its text ink on hover, never the background colour", () => {
    render(<CopyButton text="secret-block" label="copy statement" />)
    const className = screen.getByRole("button", {
      name: "copy statement",
    }).className
    expect(className).not.toMatch(/hover:text-background/)
    expect(className).toMatch(/hover:text-ink\b/)
  })

  it("does not force a 44px min height", () => {
    render(<CopyButton text="secret-block" label="copy statement" />)
    expect(
      screen.getByRole("button", { name: "copy statement" }).className
    ).not.toMatch(/min-h-11/)
  })

  it("draws a border that clears the 3:1 non-text contrast floor", () => {
    render(<CopyButton text="secret-block" label="copy statement" />)
    const className = screen.getByRole("button", {
      name: "copy statement",
    }).className
    expect(className).toMatch(/border-foreground\/(4[5-9]|[5-9]\d|100)\b/)
  })

  it("takes its accessible name from context and still reads Copy", () => {
    render(<CopyButton text="secret-block" label="copy public key" />)
    const button = screen.getByRole("button", { name: "copy public key" })
    expect(button.textContent).toBe("copy")
  })

  it("keeps a status region beside the button from first render", () => {
    render(<CopyButton text="secret-block" label="copy statement" />)
    const status = screen.getByRole("status")
    expect(status.className).toMatch(/sr-only/)
    expect(status.textContent).toBe("")
    expect(
      screen
        .getByRole("button", { name: "copy statement" })
        .getAttribute("aria-live")
    ).toBeNull()
  })

  it("copies text without renaming itself", async () => {
    writeText.mockResolvedValue(undefined)
    render(<CopyButton text="secret-block" label="copy statement" />)

    const button = screen.getByRole("button", { name: "copy statement" })
    fireEvent.click(button)

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("secret-block")
    })
    await waitFor(() => {
      expect(button.textContent).toBe("copied")
    })
    expect(button.getAttribute("aria-label")).toBe("copy statement")
  })

  it("keeps one accessible name across idle, copied and failed", async () => {
    const names: Array<string | null> = []

    writeText.mockResolvedValue(undefined)
    const copied = render(
      <CopyButton text="secret-block" label="copy statement" />
    )
    const succeeding = screen.getByRole("button")
    names.push(succeeding.getAttribute("aria-label"))
    fireEvent.click(succeeding)
    await waitFor(() => {
      expect(succeeding.textContent).toBe("copied")
    })
    names.push(succeeding.getAttribute("aria-label"))
    copied.unmount()

    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    writeText.mockRejectedValue(new Error("denied"))
    render(<CopyButton text="secret-block" label="copy statement" />)
    const failing = screen.getByRole("button")
    fireEvent.click(failing)
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain("failed.")
    })
    names.push(failing.getAttribute("aria-label"))
    error.mockRestore()

    expect(names).toEqual([
      "copy statement",
      "copy statement",
      "copy statement",
    ])
  })

  it("says copied in the control itself, announcing nothing on success", async () => {
    writeText.mockResolvedValue(undefined)
    render(<CopyButton text="secret-block" label="copy statement" />)

    const button = screen.getByRole("button", { name: "copy statement" })
    fireEvent.click(button)

    await waitFor(() => {
      expect(button.textContent).toBe("copied")
    })
    expect(screen.getAllByRole("status")).toHaveLength(1)
    expect(screen.getByRole("status").textContent).toBe("")
  })

  it("hides its own text from assistive technology, so the name never shifts", async () => {
    writeText.mockResolvedValue(undefined)
    render(<CopyButton text="secret-block" label="copy statement" />)

    const button = screen.getByRole("button", { name: "copy statement" })
    expect(button.firstElementChild?.getAttribute("aria-hidden")).toBe("true")

    fireEvent.click(button)
    await waitFor(() => {
      expect(button.textContent).toBe("copied")
    })

    expect(button.firstElementChild?.getAttribute("aria-hidden")).toBe("true")
    expect(
      screen.getByRole("button", { name: "copy statement" })
    ).toBeInTheDocument()
  })

  it("returns to its caption after the window, under the same name", async () => {
    vi.useFakeTimers()
    writeText.mockResolvedValue(undefined)
    render(<CopyButton text="secret-block" label="copy statement" />)

    const button = screen.getByRole("button", { name: "copy statement" })
    fireEvent.click(button)
    await vi.waitFor(() => {
      expect(button.textContent).toBe("copied")
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450)
    })

    expect(button.textContent).toBe("copy")
    expect(button.getAttribute("aria-label")).toBe("copy statement")
    vi.useRealTimers()
  })

  it("states the failure, names a fallback, and does not revert", async () => {
    vi.useFakeTimers()
    writeText.mockRejectedValue(new Error("denied"))
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    render(
      <CopyButton
        text="secret-block"
        label="copy statement"
        failureHint="use the download link above this block."
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "copy statement" }))
    await vi.waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "copy statement failed. use the download link above this block."
      )
    })
    expect(screen.getByRole("status").className).not.toMatch(/sr-only/)

    await vi.advanceTimersByTimeAsync(5000)
    expect(screen.getByRole("status").textContent).toBe(
      "copy statement failed. use the download link above this block."
    )
    const button = screen.getByRole("button", { name: "copy statement" })
    expect(button.textContent).toBe("copy")
    expect(button.getAttribute("aria-label")).toContain(button.textContent)
    expect(error).toHaveBeenCalled()
    error.mockRestore()
    vi.useRealTimers()
  })
})
