import type { ReactElement } from "react"

import { StateCursor } from "@/components/canary/state-cursor"
import { Plate } from "@openbunny/react"
import { SiteBar } from "@/components/site-bar"
import { canary } from "@/lib/canary/canary"
import { formatLongDate } from "@/lib/iso-date"
import { CANARY_PLATE } from "@/lib/images/plates"
import { siteLastChangedAt } from "@/lib/site/commit-date"

export function CanaryHeader(): ReactElement {
  const lastChangedAt = siteLastChangedAt()

  return (
    <>
      <SiteBar route="/canary" />
      <header className="mt-6">
        <div className="flex items-end justify-between border-b border-line">
          <Plate asset={CANARY_PLATE} className="w-[250px]" />
          <time
            dateTime={lastChangedAt}
            className="mb-1 font-mono text-[0.75rem] text-muted"
          >
            {`site last changed ${formatLongDate(lastChangedAt.slice(0, 10))}`}
          </time>
        </div>
        <div className="flex flex-col items-start gap-3 pt-6 pb-2">
          <h1 className="font-display text-[clamp(2rem,9vw,3.25rem)] leading-[1.05]">
            key canary
            <StateCursor signedOn={canary.signedOn} renewBy={canary.renewBy} />
          </h1>
          <p className="max-w-[58ch] font-display text-[0.95rem] leading-[1.7] text-pretty text-muted">
            a statement <strong className="text-foreground">clearsigned</strong>{" "}
            with the {canary.algorithm} key below, replaced on a{" "}
            <strong className="text-foreground">90-day schedule</strong>, and
            dated against a{" "}
            <strong className="text-foreground">monero block</strong> that could
            not have been known before it was mined. verify it with{" "}
            <code className="font-mono text-[0.85em]">gpg</code>; the commands
            are on this page.
          </p>
        </div>
      </header>
    </>
  )
}
