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

    expect(
      container.querySelector(
        'img[src="/img/a71b2c5643dea06fedc5c31fea19ee4dec33b96ae669c79ff442e2e39149b90ef216fa2c54c21f2ed9fd249572369b7d0c310bd4d2193a9b88e91989d68a016c.webp"]'
      )
    ).not.toBeNull()
    expect(
      container.querySelector(
        'img[src="/img/b41057b9974f3f139a7d8ef9c9aef7624e7229f2f34e00d1eaba271bcee8cba63fd1452a8e23de4f5003753995e4c35cfd47d46e32f2c0a2ee57f863ca222544.webp"]'
      )
    ).toBeNull()
    expect(
      container.querySelector(
        'img[src="/img/bd0a1c582aa64034a09953f1571e2782fdae0b481ffc42371b836b1fc92611e7f02ec73b31412729aae840b832052051b5db404ecf532a3a38219451eb273c34.webp"]'
      )
    ).toBeNull()

    vi.restoreAllMocks()
  })
})
