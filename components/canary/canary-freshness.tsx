import type { ReactElement } from "react"

import type { CanaryFreshness } from "@/lib/canary/canary-status"
import { formatLongDate } from "@/lib/iso-date"

type CanaryFreshnessNoticeProps = {
  readonly freshness: Extract<CanaryFreshness, "expired">
  readonly renewBy: string
}

export function CanaryFreshnessNotice({
  renewBy,
}: CanaryFreshnessNoticeProps): ReactElement {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 bg-expired px-4 py-5 text-paper"
    >
      <p className="flex items-center gap-3 font-sc text-[0.7rem]">
        <span
          aria-hidden="true"
          className="inline-block size-2.5 border border-background"
        />
        expired
      </p>
      <p className="font-display text-[0.92rem] leading-[1.7]">
        this statement was due {formatLongDate(renewBy)} and has not been
        replaced, so it says nothing about today. a missed renewal is not proof
        of compromise: travel, illness, or a lost key will do it. treat this
        page as out of date rather than as current assurance, and ask for a new
        signed statement.
      </p>
    </div>
  )
}
