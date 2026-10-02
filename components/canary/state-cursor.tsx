"use client"

import type { ReactElement } from "react"

import { useCanaryFreshness } from "@/hooks/use-canary-freshness"

export function StateCursor({
  signedOn,
  renewBy,
}: {
  readonly signedOn: string
  readonly renewBy: string
}): ReactElement {
  const { freshness } = useCanaryFreshness(signedOn, renewBy)

  return (
    <span
      aria-hidden="true"
      data-freshness={freshness}
      className="state-cursor"
    />
  )
}
