import { describe, expect, it } from "vitest"

import {
  RENEWAL_WARNING_LEAD_DAYS,
  canaryRenewalCheck,
  canaryRenewalMessage,
} from "@/lib/canary/renewal-reminder"

const renewBy = "2026-12-29"

describe("canaryRenewalCheck", () => {
  it("is current comfortably ahead of renew-by", () => {
    const check = canaryRenewalCheck(renewBy, "2026-09-01")
    expect(check.state).toBe("current")
    expect(check.daysRemaining).toBe(119)
  })

  it("is current the day after the warning window opens", () => {
    const check = canaryRenewalCheck(renewBy, "2026-11-28")
    expect(check.state).toBe("current")
    expect(check.daysRemaining).toBe(RENEWAL_WARNING_LEAD_DAYS + 1)
  })

  it("is approaching exactly at the warning lead time", () => {
    const check = canaryRenewalCheck(renewBy, "2026-11-29")
    expect(check.state).toBe("approaching")
    expect(check.daysRemaining).toBe(RENEWAL_WARNING_LEAD_DAYS)
  })

  it("is approaching the day before renew-by", () => {
    const check = canaryRenewalCheck(renewBy, "2026-12-28")
    expect(check.state).toBe("approaching")
    expect(check.daysRemaining).toBe(1)
  })

  it("is approaching on the renew-by date itself", () => {
    const check = canaryRenewalCheck(renewBy, renewBy)
    expect(check.state).toBe("approaching")
    expect(check.daysRemaining).toBe(0)
  })

  it("is expired the day after renew-by", () => {
    const check = canaryRenewalCheck(renewBy, "2026-12-30")
    expect(check.state).toBe("expired")
    expect(check.daysRemaining).toBe(-1)
  })

  it("is expired long after renew-by", () => {
    const check = canaryRenewalCheck(renewBy, "2027-03-29")
    expect(check.state).toBe("expired")
    expect(check.daysRemaining).toBe(-90)
  })

  it("throws a clear error on a malformed renew-by date", () => {
    expect(() => canaryRenewalCheck("29 December 2026", "2026-09-01")).toThrow(
      "Invalid ISO date: 29 December 2026"
    )
  })

  it("throws a clear error on a malformed today argument", () => {
    expect(() => canaryRenewalCheck(renewBy, "not-a-date")).toThrow(
      "Invalid ISO date: not-a-date"
    )
  })
})

describe("canaryRenewalMessage", () => {
  it("reads as informational, not a warning, when current", () => {
    const message = canaryRenewalMessage(
      canaryRenewalCheck(renewBy, "2026-09-01")
    )
    expect(message).toContain("canary renewal current")
    expect(message).toContain("119 day(s)")
    expect(message).toContain("29 december 2026")
    expect(message).not.toContain("EXPIRED")
  })

  it("reads as an actionable warning when approaching", () => {
    const message = canaryRenewalMessage(
      canaryRenewalCheck(renewBy, "2026-12-10")
    )
    expect(message).toContain("canary renewal approaching")
    expect(message).toContain("19 day(s) left")
    expect(message).toContain("YubiKey")
    expect(message).not.toContain("EXPIRED")
  })

  it("reads more seriously than the approaching warning when expired", () => {
    const message = canaryRenewalMessage(
      canaryRenewalCheck(renewBy, "2027-01-05")
    )
    expect(message).toContain("EXPIRED")
    expect(message).toContain("7 day(s) ago")
    expect(message).toContain("stale now")
  })
})
