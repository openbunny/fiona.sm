import { daysUntil } from "@/lib/iso-date"

export type RenewalProgress = {
  readonly windowDays: number
  readonly elapsedDays: number
  readonly overdueDays: number
  readonly fraction: number
}

export function renewalProgress(
  signedOn: string,
  renewBy: string,
  today: string
): RenewalProgress {
  const windowDays = daysUntil(renewBy, signedOn)
  if (windowDays <= 0) {
    throw new Error(`Renew-by ${renewBy} is not after signing date ${signedOn}`)
  }

  const elapsedDays = Math.max(0, -daysUntil(signedOn, today))

  return {
    windowDays,
    elapsedDays,
    overdueDays: Math.max(0, elapsedDays - windowDays),
    fraction: Math.min(1, elapsedDays / windowDays),
  }
}
