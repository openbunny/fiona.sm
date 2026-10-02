import { describe, expect, it } from "vitest"

import { maxRenewDays, parseRenewDays } from "@/lib/renew/renew-days"

describe("parseRenewDays", () => {
  it("accepts the default renewal window", () => {
    expect(parseRenewDays("90")).toBe(90)
  })

  it("accepts the longest allowed window", () => {
    expect(maxRenewDays).toBe(366)
    expect(parseRenewDays("366")).toBe(366)
  })

  it("rejects a window longer than a year", () => {
    expect(() => parseRenewDays("367")).toThrow(/from 1 to 366/)
    expect(() => parseRenewDays("9000")).toThrow(/from 1 to 366/)
    expect(() => parseRenewDays("99999999999999999999")).toThrow(
      /from 1 to 366/
    )
  })

  it("rejects zero, negatives, and fractions", () => {
    expect(() => parseRenewDays("0")).toThrow(/from 1 to 366/)
    expect(() => parseRenewDays("-90")).toThrow(/from 1 to 366/)
    expect(() => parseRenewDays("90.5")).toThrow(/from 1 to 366/)
  })

  it("rejects anything that is not a run of decimal digits", () => {
    expect(() => parseRenewDays("")).toThrow(/from 1 to 366/)
    expect(() => parseRenewDays(" 90 ")).toThrow(/from 1 to 366/)
    expect(() => parseRenewDays("0x5a")).toThrow(/from 1 to 366/)
    expect(() => parseRenewDays("9e1")).toThrow(/from 1 to 366/)
    expect(() => parseRenewDays("Infinity")).toThrow(/from 1 to 366/)
  })
})
