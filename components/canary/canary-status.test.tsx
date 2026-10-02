/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CanaryStatus } from "@/components/canary/canary-status"
import { Fingerprint } from "@/components/canary/fingerprint"
import { canary } from "@/lib/canary/canary"
import { fingerprintRows } from "@/lib/canary/fingerprint"

const rows = fingerprintRows(canary.fingerprint)
const fingerprintDescription = `openpgp fingerprint, in ten groups of four: ${rows.top} ${rows.bottom}`

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("CanaryStatus", () => {
  it("prerenders a true statement without a clock", () => {
    const markup = renderToStaticMarkup(
      <CanaryStatus
        signedOn="2026-08-25"
        renewBy="2026-11-23"
        fingerprint={<Fingerprint />}
      />
    )
    expect(markup).toContain("23 november 2026")
    expect(markup).toContain("compare that date with today")
    expect(markup).not.toContain("Checking")
    expect(markup).not.toContain("clock appears to be wrong")
    expect(markup).not.toContain("may not be due at all")
    expect(markup).toContain('data-clock="static"')
  })

  it("gives a reader with no javascript the date and what passing it means", () => {
    const markup = renderToStaticMarkup(
      <CanaryStatus
        signedOn="2026-08-25"
        renewBy="2026-11-23"
        fingerprint={<Fingerprint />}
      />
    )
    const opening = markup.indexOf("<noscript>")
    const closing = markup.indexOf("</noscript>")

    expect(opening).toBeGreaterThanOrEqual(0)
    expect(closing).toBeGreaterThan(opening)

    const notice = markup.slice(opening, closing)

    expect(notice).toContain("23 november 2026")
    expect(notice).toContain("with today directly")
    expect(notice).toContain("says nothing about today")
    expect(notice).toContain("not proof of compromise")
  })

  it("claims no verdict it cannot reach without a clock", () => {
    const markup = renderToStaticMarkup(
      <CanaryStatus
        signedOn="2026-08-25"
        renewBy="2026-11-23"
        fingerprint={<Fingerprint />}
      />
    )
    const notice = markup.slice(
      markup.indexOf("<noscript>"),
      markup.indexOf("</noscript>")
    )

    expect(notice).not.toContain("expired")
    expect(notice).not.toContain("has not been replaced,")
    expect(markup).toContain('data-clock="static"')
  })

  it("keeps the notice out of the prerendered sentence", () => {
    const markup = renderToStaticMarkup(
      <CanaryStatus
        signedOn="2026-08-25"
        renewBy="2026-11-23"
        fingerprint={<Fingerprint />}
      />
    )

    expect(markup.indexOf("</noscript>")).toBeLessThan(
      markup.indexOf('data-clock="static"')
    )
  })

  it("keeps the renewal date on screen while the canary is current", () => {
    render(
      <CanaryStatus
        signedOn="2000-01-01"
        renewBy="2999-01-01"
        fingerprint={<Fingerprint />}
      />
    )
    const sentence = screen.getByText(/must be replaced by/)
    expect(sentence.textContent).toContain("1 january 2999")
    expect(sentence.textContent).not.toContain("clock appears to be wrong")
    expect(sentence.getAttribute("data-clock")).toBe("visitor")
    expect(screen.queryByText(/read against the device clock/)).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("replaces the sentence with an alert once the canary is expired", () => {
    render(
      <CanaryStatus
        signedOn="1999-01-01"
        renewBy="2000-01-01"
        fingerprint={<Fingerprint />}
      />
    )
    expect(screen.getByRole("alert").textContent).toMatch(/1 january 2000/)
    expect(screen.queryByText(/compare that date with today/)).toBeNull()
  })

  it("hedges the expired reading against a wrong visitor clock", () => {
    render(
      <CanaryStatus
        signedOn="1999-01-01"
        renewBy="2000-01-01"
        fingerprint={<Fingerprint />}
      />
    )

    const hedge = screen.getByText(/read against the device clock/)
    expect(hedge.textContent).toContain("an incorrect device clock")
    expect(hedge.textContent).toContain("incorrect due status")
    expect(hedge.textContent).toContain("against an independent clock")
  })

  it("keeps the expired alert at full strength beside the hedge", () => {
    const { container } = render(
      <CanaryStatus
        signedOn="1999-01-01"
        renewBy="2000-01-01"
        fingerprint={<Fingerprint />}
      />
    )

    const alert = screen.getByRole("alert")
    expect(alert.textContent).toMatch(/expired/)
    expect(alert.textContent).toMatch(/says nothing about today/)
    expect(alert.textContent).toMatch(/not proof of compromise/)
    expect(alert.textContent).not.toMatch(/read against the device clock/)
    expect(container.querySelectorAll("[data-clock]")).toHaveLength(0)
  })

  it("re-evaluates freshness after the utc date changes", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-23T23:30:00Z"))
    render(
      <CanaryStatus
        signedOn="2026-08-25"
        renewBy="2026-11-23"
        fingerprint={<Fingerprint />}
      />
    )

    expect(screen.queryByRole("alert")).toBeNull()

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)

    expect(screen.getByRole("alert").textContent).toMatch(/23 november 2026/)
  })

  it("tells a reader whose clock predates the signing date to compare dates", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-24T12:00:00Z"))
    render(
      <CanaryStatus
        signedOn="2026-08-25"
        renewBy="2026-11-23"
        fingerprint={<Fingerprint />}
      />
    )

    const sentence = screen.getByText(/must be replaced by/)
    expect(sentence.textContent).toContain("signed on 25 august 2026")
    expect(sentence.textContent).toContain(
      "the device clock is therefore wrong"
    )
    expect(sentence.textContent).toContain("against an independent clock")
    expect(sentence.textContent).not.toContain("may not be due at all")
    expect(sentence.getAttribute("data-clock")).toBe("visitor")
    expect(screen.queryByText(/read against the device clock/)).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("shows a current chip only while the canary is genuinely current", () => {
    render(
      <CanaryStatus
        signedOn="2000-01-01"
        renewBy="2999-01-01"
        fingerprint={<Fingerprint />}
      />
    )
    expect(screen.getByText("current")).toBeInTheDocument()
  })

  it("withholds the current chip when the device clock predates signing", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-24T12:00:00Z"))
    render(
      <CanaryStatus
        signedOn="2026-08-25"
        renewBy="2026-11-23"
        fingerprint={<Fingerprint />}
      />
    )
    expect(screen.queryByText("current")).toBeNull()
  })

  it("withholds the current chip once the canary is expired", () => {
    render(
      <CanaryStatus
        signedOn="1999-01-01"
        renewBy="2000-01-01"
        fingerprint={<Fingerprint />}
      />
    )
    expect(screen.queryByText("current")).toBeNull()
  })

  it("keeps the plain sentence on the signing date itself", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-25T00:00:00Z"))
    render(
      <CanaryStatus
        signedOn="2026-08-25"
        renewBy="2026-11-23"
        fingerprint={<Fingerprint />}
      />
    )

    const sentence = screen.getByText(/must be replaced by/)
    expect(sentence.textContent).not.toContain("clock appears to be wrong")
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("leaves the renew-by fact to the facts list rather than restating it", () => {
    const { container } = render(
      <CanaryStatus
        signedOn="2000-01-01"
        renewBy="2999-01-01"
        fingerprint={<Fingerprint />}
      />
    )
    expect(screen.queryByText("renew by")).toBeNull()
    expect(container.querySelectorAll("time")).toHaveLength(0)
  })

  it("labels a genuinely current canary distinctly from an unconfirmed one", () => {
    render(
      <CanaryStatus
        signedOn="2000-01-01"
        renewBy="2999-01-01"
        fingerprint={<Fingerprint />}
      />
    )
    expect(screen.getByText("current")).toBeInTheDocument()
    expect(screen.queryByText("unconfirmed")).toBeNull()
  })

  it("labels a canary it cannot confirm distinctly from a fresh one", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-24T12:00:00Z"))
    render(
      <CanaryStatus
        signedOn="2026-08-25"
        renewBy="2026-11-23"
        fingerprint={<Fingerprint />}
      />
    )
    expect(screen.getByText("unconfirmed")).toBeInTheDocument()
    expect(screen.queryByText("current")).toBeNull()
  })

  it("never labels an expired canary as fresh or unconfirmed", () => {
    render(
      <CanaryStatus
        signedOn="1999-01-01"
        renewBy="2000-01-01"
        fingerprint={<Fingerprint />}
      />
    )
    expect(screen.queryByText("current")).toBeNull()
    expect(screen.queryByText("unconfirmed")).toBeNull()
    expect(screen.getByRole("alert").textContent).toMatch(/expired/)
  })

  it("renders the complete fingerprint alongside a fresh canary", () => {
    render(
      <CanaryStatus
        signedOn="2000-01-01"
        renewBy="2999-01-01"
        fingerprint={<Fingerprint />}
      />
    )
    expect(screen.getByText(fingerprintDescription)).toBeInTheDocument()
  })

  it("renders the complete fingerprint alongside an unconfirmed canary", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-24T12:00:00Z"))
    render(
      <CanaryStatus
        signedOn="2026-08-25"
        renewBy="2026-11-23"
        fingerprint={<Fingerprint />}
      />
    )
    expect(screen.getByText(fingerprintDescription)).toBeInTheDocument()
  })

  it("renders the complete fingerprint alongside an expired canary", () => {
    render(
      <CanaryStatus
        signedOn="1999-01-01"
        renewBy="2000-01-01"
        fingerprint={<Fingerprint />}
      />
    )
    expect(screen.getByText(fingerprintDescription)).toBeInTheDocument()
  })
})
