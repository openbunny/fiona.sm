/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { CanaryFreshnessNotice } from "@/components/canary/canary-freshness"

afterEach(() => {
  cleanup()
})

describe("CanaryFreshnessNotice", () => {
  it("warns when the canary is expired", () => {
    render(<CanaryFreshnessNotice freshness="expired" renewBy="2026-11-25" />)
    const text = screen.getByRole("alert").textContent ?? ""
    expect(text).toMatch(/25 november 2026/)
    expect(text).toMatch(/says nothing about today/)
  })

  it("does not read a missed renewal as proof of compromise", () => {
    render(<CanaryFreshnessNotice freshness="expired" renewBy="2026-11-25" />)
    const text = screen.getByRole("alert").textContent ?? ""
    expect(text).toMatch(/not proof of compromise/)
    expect(text).not.toMatch(/treat the published key as compromised/)
  })

  it("fills the alert block rather than rounding it", () => {
    render(<CanaryFreshnessNotice freshness="expired" renewBy="2026-11-25" />)
    const alert = screen.getByRole("alert")

    expect(alert.className).toMatch(/bg-expired/)
    expect(alert.className).not.toMatch(/\brounded-/)
  })
})
