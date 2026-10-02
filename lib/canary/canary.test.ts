import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import { fingerprintRows } from "@/lib/canary/fingerprint"
import { daysUntil, formatLongDateTime } from "@/lib/iso-date"
import { maxRenewDays } from "@/lib/renew/renew-days"

describe("canary key material", () => {
  it("matches the published public key", () => {
    const root = process.cwd()
    expect(canary.publicKey).toBe(
      readFileSync(join(root, "public/fiona.asc"), "utf8")
    )
  })

  it("publishes a signed statement", () => {
    expect(canary.signedStatement).toBe(
      readFileSync(join(process.cwd(), "public/canary.asc"), "utf8")
    )
  })

  it("uses a fingerprint that formats into two readable rows", () => {
    const rows = fingerprintRows(canary.fingerprint)
    expect(`${rows.top}${rows.bottom}`.replaceAll(" ", "")).toBe(
      canary.fingerprint
    )
  })
})

describe("canary signing instant", () => {
  it("falls on the published signing date", () => {
    expect(canary.signedAt.startsWith(`${canary.signedOn}T`)).toBe(true)
  })

  it("is a well-formed utc instant", () => {
    expect(formatLongDateTime(canary.signedAt)).toMatch(/ utc$/)
  })
})

describe("canary renewal window", () => {
  it("is more than fourteen days from renewBy", () => {
    expect(daysUntil(canary.renewBy)).toBeGreaterThan(14)
  })

  it("spans at least one day from the signing date", () => {
    expect(daysUntil(canary.renewBy, canary.signedOn)).toBeGreaterThanOrEqual(1)
  })

  it("never spans more than the longest window renew will sign", () => {
    expect(daysUntil(canary.renewBy, canary.signedOn)).toBeLessThanOrEqual(
      maxRenewDays
    )
  })
})
