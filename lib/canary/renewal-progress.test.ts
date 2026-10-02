import { describe, expect, it } from "vitest"

import { renewalProgress } from "@/lib/canary/renewal-progress"

describe("renewalProgress", () => {
  it("counts the days elapsed inside the window", () => {
    expect(renewalProgress("2026-09-03", "2026-12-02", "2026-09-18")).toEqual({
      windowDays: 90,
      elapsedDays: 15,
      overdueDays: 0,
      fraction: 15 / 90,
    })
  })

  it("starts at zero on the signing date", () => {
    expect(
      renewalProgress("2026-09-03", "2026-12-02", "2026-09-03").fraction
    ).toBe(0)
  })

  it("fills the bar and counts overdue days past renew-by", () => {
    expect(
      renewalProgress("2026-09-03", "2026-12-02", "2026-12-12")
    ).toMatchObject({ overdueDays: 10, fraction: 1 })
  })

  it("rejects a renew-by date on or before the signing date", () => {
    expect(() =>
      renewalProgress("2026-09-03", "2026-09-03", "2026-09-03")
    ).toThrow("Renew-by 2026-09-03 is not after signing date 2026-09-03")
  })
})
