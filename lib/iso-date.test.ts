import { afterEach, describe, expect, it, vi } from "vitest"

import {
  addIsoDays,
  daysUntil,
  formatLongDate,
  formatLongDateTime,
  isoDateMidnightUtc,
  nowIsoUtc,
  parseLongDate,
} from "@/lib/iso-date"

afterEach(() => {
  vi.useRealTimers()
})

describe("formatLongDate", () => {
  it("formats an ISO date in English, UTC", () => {
    expect(formatLongDate("2026-08-25")).toBe("25 august 2026")
  })

  it("rejects a string that is not YYYY-MM-DD", () => {
    expect(() => formatLongDate("25 August 2026")).toThrow(/Invalid ISO date/)
  })

  it("rejects a calendar-invalid date instead of overflowing", () => {
    expect(() => formatLongDate("2026-02-31")).toThrow(/Invalid ISO date/)
  })
})

describe("daysUntil", () => {
  it("counts whole utc days between two iso dates", () => {
    expect(daysUntil("2026-11-25", "2026-08-25")).toBe(92)
  })

  it("is zero on the same day", () => {
    expect(daysUntil("2026-08-25", "2026-08-25")).toBe(0)
  })

  it("is negative after the target date", () => {
    expect(daysUntil("2026-08-25", "2026-08-26")).toBe(-1)
  })

  it("rejects an invalid iso date", () => {
    expect(() => daysUntil("2026-02-31", "2026-08-25")).toThrow(/Invalid ISO/)
  })
})

describe("addIsoDays", () => {
  it("adds days in utc without overflowing the month", () => {
    expect(addIsoDays("2026-08-25", 92)).toBe("2026-11-25")
  })

  it("steps onto the leap day of a leap year", () => {
    expect(addIsoDays("2028-02-28", 1)).toBe("2028-02-29")
  })

  it("crosses a year boundary", () => {
    expect(addIsoDays("2026-12-31", 1)).toBe("2027-01-01")
  })

  it("rejects an invalid calendar date", () => {
    expect(() => addIsoDays("2026-02-31", 1)).toThrow(/Invalid ISO/)
  })

  it("rejects a result it would not accept back", () => {
    expect(() => addIsoDays("9999-12-31", 1)).toThrow(/Invalid ISO date/)
  })

  it("rejects a shift that lands outside the representable range", () => {
    expect(() => addIsoDays("2026-08-25", Number.MAX_SAFE_INTEGER)).toThrow(
      /Invalid ISO date/
    )
  })
})

describe("isoDateMidnightUtc", () => {
  it("renders an iso date as an rfc 3339 instant at utc midnight", () => {
    expect(isoDateMidnightUtc("2026-09-30")).toBe("2026-09-30T00:00:00Z")
  })

  it("rejects a calendar-invalid date instead of overflowing", () => {
    expect(() => isoDateMidnightUtc("2026-02-31")).toThrow(/Invalid ISO date/)
  })

  it("rejects a string that is not YYYY-MM-DD", () => {
    expect(() => isoDateMidnightUtc("30 september 2026")).toThrow(
      /Invalid ISO date/
    )
  })
})

describe("nowIsoUtc", () => {
  it("returns the current utc instant to the second, without milliseconds", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-25T17:05:22.481Z"))
    expect(nowIsoUtc()).toBe("2026-08-25T17:05:22Z")
  })
})

describe("formatLongDateTime", () => {
  it("formats an ISO instant in English, UTC, to the minute", () => {
    expect(formatLongDateTime("2026-08-25T17:05:22Z")).toBe(
      "25 august 2026 17:05 utc"
    )
  })

  it("keeps midnight in a 24-hour clock", () => {
    expect(formatLongDateTime("2026-01-01T00:00:00Z")).toBe(
      "1 january 2026 00:00 utc"
    )
  })

  it("rejects a date without a time", () => {
    expect(() => formatLongDateTime("2026-08-25")).toThrow(
      /Invalid ISO instant/
    )
  })

  it("rejects an instant with milliseconds or an offset", () => {
    expect(() => formatLongDateTime("2026-08-25T17:05:22.481Z")).toThrow(
      /Invalid ISO instant/
    )
    expect(() => formatLongDateTime("2026-08-25T17:05:22+02:00")).toThrow(
      /Invalid ISO instant/
    )
  })

  it("rejects a calendar-invalid instant instead of overflowing", () => {
    expect(() => formatLongDateTime("2026-02-31T00:00:00Z")).toThrow(
      /Invalid ISO instant/
    )
  })
})

describe("parseLongDate", () => {
  it("reads back what formatLongDate writes", () => {
    expect(parseLongDate(formatLongDate("2026-11-23"))).toBe("2026-11-23")
    expect(parseLongDate(formatLongDate("2026-12-02"))).toBe("2026-12-02")
  })

  it.each([
    "2026-11-23",
    "23 nov 2026",
    "23 November 2026",
    "023 november 2026",
  ])("rejects %p", (text) => {
    expect(() => parseLongDate(text)).toThrow(`Invalid long date: ${text}`)
  })

  it("rejects a day the month does not have", () => {
    expect(() => parseLongDate("31 february 2026")).toThrow(
      "Invalid ISO date: 2026-02-31"
    )
  })
})
