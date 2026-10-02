/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { PageTitle } from "@/components/page-title"
import { formatLongDate } from "@/lib/iso-date"

const lastChangedAt = "2026-10-01T12:00:00+03:00"

afterEach(cleanup)

describe("PageTitle", () => {
  it("heads the page with a level one heading", () => {
    render(<PageTitle title="privacy" />)

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "privacy"
    )
  })

  it("states the last-changed date against a machine-readable datetime", () => {
    const { container } = render(
      <PageTitle title="privacy" lastChangedAt={lastChangedAt} />
    )
    const time = container.querySelector("time")

    expect(time?.getAttribute("datetime")).toBe(lastChangedAt)
    expect(time?.textContent).toBe(
      `site last changed ${formatLongDate(lastChangedAt.slice(0, 10))}`
    )
  })

  it("omits the date entirely when a page carries none", () => {
    const { container } = render(<PageTitle title="blog" />)

    expect(container.querySelector("time")).toBeNull()
  })
})
