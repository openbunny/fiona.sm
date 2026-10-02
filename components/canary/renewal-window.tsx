"use client"

import type { ReactElement } from "react"

import { useCanaryFreshness } from "@/hooks/use-canary-freshness"
import { renewalProgress } from "@/lib/canary/renewal-progress"
import { formatLongDate } from "@/lib/iso-date"

export function RenewalWindow({
  signedOn,
  renewBy,
}: {
  readonly signedOn: string
  readonly renewBy: string
}): ReactElement {
  const { today, freshness } = useCanaryFreshness(signedOn, renewBy)
  const progress =
    today === "" || freshness === "future"
      ? undefined
      : renewalProgress(signedOn, renewBy, today)

  return (
    <figure className="mt-10 flex flex-col gap-2">
      <svg
        viewBox="0 0 100 4"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="h-2 w-full"
      >
        <rect width="100" height="4" className="fill-sprout-fill" />
        {progress === undefined ? null : (
          <rect
            width={progress.fraction * 100}
            height="4"
            className={
              progress.overdueDays > 0 ? "fill-expired" : "fill-sprout"
            }
          />
        )}
      </svg>
      <figcaption className="flex flex-wrap justify-between gap-x-4 gap-y-1 font-mono text-[0.72rem] text-muted">
        <span>{formatLongDate(signedOn)}</span>
        <span className="text-center">
          {progress === undefined
            ? `${String(renewalProgress(signedOn, renewBy, signedOn).windowDays)}-day window`
            : progress.overdueDays > 0
              ? `${String(progress.overdueDays)} days overdue`
              : `day ${String(progress.elapsedDays)} of ${String(progress.windowDays)}`}
        </span>
        <span>{formatLongDate(renewBy)}</span>
      </figcaption>
    </figure>
  )
}
