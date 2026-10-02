/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { RenewalWindow } from "@/components/canary/renewal-window"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const props = { signedOn: "2026-09-03", renewBy: "2026-12-02" }

function filled(container: HTMLElement): Element | null {
  return container.querySelectorAll("rect")[1] ?? null
}

describe("RenewalWindow", () => {
  it("prerenders the window length and no elapsed bar without a clock", () => {
    const markup = renderToStaticMarkup(<RenewalWindow {...props} />)

    expect(markup).toContain("90-day window")
    expect(markup.match(/<rect/g)).toHaveLength(1)
  })

  it("fills the elapsed share of the window and counts the day", () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-09-18T12:00:00Z"))
    const { container } = render(<RenewalWindow {...props} />)

    expect(screen.getByText("day 15 of 90")).toBeInTheDocument()
    expect(filled(container)?.getAttribute("width")).toBe(
      String((15 / 90) * 100)
    )
    expect(filled(container)?.getAttribute("class")).toContain("fill-sprout")
    expect(filled(container)?.getAttribute("rx")).toBeNull()
  })

  it("turns the bar red and counts overdue days past renew-by", () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-12-05T12:00:00Z"))
    const { container } = render(<RenewalWindow {...props} />)

    expect(screen.getByText("3 days overdue")).toBeInTheDocument()
    expect(filled(container)?.getAttribute("class")).toContain("fill-expired")
  })

  it("shows no elapsed bar when the visitor clock predates the signing", () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-09-01T12:00:00Z"))
    const { container } = render(<RenewalWindow {...props} />)

    expect(container.querySelectorAll("rect")).toHaveLength(1)
    expect(screen.getByText("90-day window")).toBeInTheDocument()
  })
})
