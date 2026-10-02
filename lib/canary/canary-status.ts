import { daysUntil, todayIsoUtc } from "@/lib/iso-date"

export type CanaryFreshness = "valid" | "expired" | "future"

export function canaryFreshness(
  signedOn: string,
  renewBy: string,
  today = todayIsoUtc()
): CanaryFreshness {
  if (daysUntil(signedOn, today) > 0) {
    return "future"
  }

  return daysUntil(renewBy, today) >= 0 ? "valid" : "expired"
}
