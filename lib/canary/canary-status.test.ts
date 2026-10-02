import { describe, expect, it } from "vitest"

import { canaryFreshness } from "@/lib/canary/canary-status"

const signedOn = "2026-08-25"
const renewBy = "2026-11-25"

describe("canaryFreshness", () => {
  it("is valid on the renew-by date", () => {
    expect(canaryFreshness(signedOn, renewBy, "2026-11-25")).toBe("valid")
  })

  it("is valid the day before renew-by", () => {
    expect(canaryFreshness(signedOn, renewBy, "2026-11-24")).toBe("valid")
  })

  it("is expired the day after renew-by", () => {
    expect(canaryFreshness(signedOn, renewBy, "2026-11-26")).toBe("expired")
  })

  it("is valid on the signing date itself", () => {
    expect(canaryFreshness(signedOn, renewBy, "2026-08-25")).toBe("valid")
  })

  it("is future when the visitor clock is a day before signing", () => {
    expect(canaryFreshness(signedOn, renewBy, "2026-08-24")).toBe("future")
  })

  it("is future long before the signing date", () => {
    expect(canaryFreshness(signedOn, renewBy, "2019-01-01")).toBe("future")
  })
})
