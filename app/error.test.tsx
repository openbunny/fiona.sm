/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import ErrorPage from "@/app/error"

afterEach(() => {
  cleanup()
})

function testError(): Error & { digest?: string } {
  return Object.assign(new Error("boom"), { digest: "abc123" })
}

describe("Error", () => {
  it("says a render error is a bug in the page, not a signal about the canary", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    render(<ErrorPage error={testError()} reset={() => undefined} />)

    expect(screen.getByText(/it is not a failed signature check/)).toBeTruthy()

    vi.restoreAllMocks()
  })

  it("calls reset when try again is pressed", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    const reset = vi.fn()

    render(<ErrorPage error={testError()} reset={reset} />)
    fireEvent.click(screen.getByRole("button", { name: "try again" }))

    expect(reset).toHaveBeenCalledOnce()

    vi.restoreAllMocks()
  })

  it("links home", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    render(<ErrorPage error={testError()} reset={() => undefined} />)
    const link = screen.getByRole("link", { name: "return home" })

    expect(link.getAttribute("href")).toBe("/")

    vi.restoreAllMocks()
  })

  it("logs the error for an operator without swallowing it silently", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const error = testError()

    render(<ErrorPage error={error} reset={() => undefined} />)

    expect(spy).toHaveBeenCalledWith(error)

    vi.restoreAllMocks()
  })

  it("renders the error plate, not the 404 or home plate", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    const { container } = render(
      <ErrorPage error={testError()} reset={() => undefined} />
    )

    expect(container.querySelector('img[src="/error.gif"]')).not.toBeNull()
    expect(container.querySelector('img[src="/404.gif"]')).toBeNull()
    expect(container.querySelector('img[src="/home.gif"]')).toBeNull()

    vi.restoreAllMocks()
  })
})
