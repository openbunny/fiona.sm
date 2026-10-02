import { daysUntil, formatLongDate, todayIsoUtc } from "@/lib/iso-date"

export const RENEWAL_WARNING_LEAD_DAYS = 30

export type CanaryRenewalState = "current" | "approaching" | "expired"

export type CanaryRenewalCheck = {
  readonly state: CanaryRenewalState
  readonly daysRemaining: number
  readonly renewBy: string
}

export function canaryRenewalCheck(
  renewBy: string,
  today = todayIsoUtc()
): CanaryRenewalCheck {
  const daysRemaining = daysUntil(renewBy, today)
  const state: CanaryRenewalState =
    daysRemaining < 0
      ? "expired"
      : daysRemaining <= RENEWAL_WARNING_LEAD_DAYS
        ? "approaching"
        : "current"

  return { state, daysRemaining, renewBy }
}

export function canaryRenewalMessage(check: CanaryRenewalCheck): string {
  const renewByLong = formatLongDate(check.renewBy)

  if (check.state === "expired") {
    const daysPast = Math.abs(check.daysRemaining)
    return (
      `canary renewal EXPIRED: the renew-by date (${renewByLong}) was ` +
      `${daysPast} day(s) ago. The published canary is stale now. ` +
      `Re-sign public/canary.asc with the YubiKey and publish the update.`
    )
  }

  if (check.state === "approaching") {
    return (
      `canary renewal approaching: ${check.daysRemaining} day(s) left ` +
      `until the renew-by date (${renewByLong}). ` +
      `Re-sign public/canary.asc with the YubiKey before that date.`
    )
  }

  return (
    `canary renewal current: ${check.daysRemaining} day(s) until the ` +
    `renew-by date (${renewByLong}). No action needed yet.`
  )
}
