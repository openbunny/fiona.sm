export const MS_PER_DAY = 86_400_000

export function parseIsoDate(isoDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new Error(`Invalid ISO date: ${isoDate}`)
  }

  const date = new Date(`${isoDate}T00:00:00Z`)
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== isoDate
  ) {
    throw new Error(`Invalid ISO date: ${isoDate}`)
  }

  return date
}

export function isoDateMidnightUtc(isoDate: string): string {
  parseIsoDate(isoDate)
  return `${isoDate}T00:00:00Z`
}

function toIsoInstant(instant: Date): string {
  return `${instant.toISOString().slice(0, 19)}Z`
}

function parseIsoInstant(isoInstant: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(isoInstant)) {
    throw new Error(`Invalid ISO instant: ${isoInstant}`)
  }

  const instant = new Date(isoInstant)
  if (Number.isNaN(instant.getTime()) || toIsoInstant(instant) !== isoInstant) {
    throw new Error(`Invalid ISO instant: ${isoInstant}`)
  }

  return instant
}

export function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export function nowIsoUtc(): string {
  return toIsoInstant(new Date())
}

export function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(parseIsoDate(isoDate))
    .toLowerCase()
}

export function formatLongDateTime(isoInstant: string): string {
  const instant = parseIsoInstant(isoInstant)
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(instant)

  return `${formatLongDate(isoInstant.slice(0, 10))} ${time} utc`
}

export function daysUntil(isoDate: string, today = todayIsoUtc()): number {
  const target = parseIsoDate(isoDate)
  const from = parseIsoDate(today)
  return Math.round((target.getTime() - from.getTime()) / MS_PER_DAY)
}

export function addIsoDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate)
  date.setUTCDate(date.getUTCDate() + days)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${isoDate} plus ${days} days`)
  }

  const shifted = date.toISOString().slice(0, 10)
  parseIsoDate(shifted)
  return shifted
}

const longMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

export function parseLongDate(longDate: string): string {
  const match = /^(\d{1,2}) ([a-z]+) (\d{4})$/.exec(longDate)
  if (match === null) {
    throw new Error(`Invalid long date: ${longDate}`)
  }

  const [, day, monthName, year] = match
  const month = longMonths.findIndex((name) => name.toLowerCase() === monthName)
  if (month < 0) {
    throw new Error(`Invalid long date: ${longDate}`)
  }

  const isoDate = `${year ?? ""}-${String(month + 1).padStart(2, "0")}-${(day ?? "").padStart(2, "0")}`
  if (formatLongDate(isoDate) !== longDate) {
    throw new Error(`Invalid long date: ${longDate}`)
  }

  return isoDate
}
