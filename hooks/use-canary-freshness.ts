"use client"

import { useSyncExternalStore } from "react"

import { canaryFreshness } from "@/lib/canary/canary-status"
import type { CanaryFreshness } from "@/lib/canary/canary-status"
import { todayIsoUtc } from "@/lib/iso-date"

const freshnessIntervalMs = 60 * 60 * 1000

function subscribe(notify: () => void): () => void {
  const interval = window.setInterval(notify, freshnessIntervalMs)

  return () => {
    window.clearInterval(interval)
  }
}

function serverToday(): string {
  return ""
}

function useVisitorToday(): string {
  return useSyncExternalStore(subscribe, todayIsoUtc, serverToday)
}

export type CanaryFreshnessState = {
  readonly today: string
  readonly freshness: CanaryFreshness
  readonly signedOn: string
  readonly renewBy: string
}

export function useCanaryFreshness(
  signedOn: string,
  renewBy: string
): CanaryFreshnessState {
  const today = useVisitorToday()

  return {
    today,
    freshness:
      today === "" ? "valid" : canaryFreshness(signedOn, renewBy, today),
    signedOn,
    renewBy,
  }
}
