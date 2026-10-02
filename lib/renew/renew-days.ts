export const maxRenewDays = 366

const decimalDigits = /^\d+$/

export function parseRenewDays(value: string): number {
  const days = decimalDigits.test(value) ? Number(value) : Number.NaN
  if (!Number.isSafeInteger(days) || days < 1 || days > maxRenewDays) {
    throw new Error(`Days must be a whole number from 1 to ${maxRenewDays}`)
  }

  return days
}
