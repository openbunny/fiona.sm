/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { CanaryHeader } from "@/components/canary/canary-header"
import { canary } from "@/lib/canary/canary"
import { formatLongDate, formatLongDateTime } from "@/lib/iso-date"
import { siteLastChangedAt } from "@/lib/site/commit-date"

afterEach(() => {
  cleanup()
})

describe("CanaryHeader", () => {
  it("still opens with the key canary heading, unchanged", () => {
    render(<CanaryHeader />)

    expect(
      screen.getByRole("heading", { level: 1, name: /key canary/ })
    ).toBeTruthy()
  })

  it("shows the site's last-changed date on the rule beside the plate, not the statement's signing time", () => {
    const { container } = render(<CanaryHeader />)

    const lastChangedAt = siteLastChangedAt()
    const time = screen.getByText(
      `site last changed ${formatLongDate(lastChangedAt.slice(0, 10))}`
    )

    expect(time.tagName).toBe("TIME")
    expect(time.getAttribute("datetime")).toBe(lastChangedAt)

    const row = container.querySelector(".border-b.border-line")
    expect(row).toBeTruthy()
    expect([...(row?.children ?? [])]).toHaveLength(2)
    expect(row?.children[0]?.tagName).toBe("SPAN")
    expect(row?.children[1]).toBe(time)

    expect(time.textContent).not.toBe(formatLongDateTime(canary.signedAt))
    expect(screen.queryByText(/^signed /)).toBeNull()
  })
})
