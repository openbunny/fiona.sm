import type { ReactElement } from "react"

import { canary } from "@/lib/canary/canary"
import { formatLongDate, formatLongDateTime } from "@/lib/iso-date"

export function CanaryFacts({
  signedAt,
  renewBy,
}: {
  readonly signedAt: string
  readonly renewBy: string
}): ReactElement {
  return (
    <dl className="mt-10 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3">
      <Fact
        label="signed"
        value={formatLongDateTime(signedAt)}
        datetime={signedAt}
      />
      <Fact
        label="renew by"
        value={formatLongDate(renewBy)}
        datetime={renewBy}
      />
      <Fact label="key type" value={canary.algorithm} />
    </dl>
  )
}

function Fact({
  label,
  value,
  datetime,
}: {
  readonly label: string
  readonly value: string
  readonly datetime?: string
}): ReactElement {
  return (
    <>
      <dt className="font-mono text-[0.72rem] text-muted">{label}</dt>
      <dd className="font-mono text-[0.8rem]">
        {datetime ? <time dateTime={datetime}>{value}</time> : value}
      </dd>
    </>
  )
}
