"use client"

import type { ReactElement } from "react"

import { CanaryFreshnessNotice } from "@/components/canary/canary-freshness"
import { useCanaryFreshness } from "@/hooks/use-canary-freshness"
import { formatLongDate } from "@/lib/iso-date"

const FINGERPRINT_HEADING = "key fingerprint"

function FingerprintSection({
  fingerprint,
}: {
  readonly fingerprint: ReactElement
}): ReactElement {
  return (
    <section>
      <h2 className="sr-only">{FINGERPRINT_HEADING}</h2>
      {fingerprint}
    </section>
  )
}

export function CanaryStatus({
  signedOn,
  renewBy,
  fingerprint,
}: {
  readonly signedOn: string
  readonly renewBy: string
  readonly fingerprint: ReactElement
}): ReactElement {
  const {
    today,
    freshness,
    signedOn: statedOn,
    renewBy: dueBy,
  } = useCanaryFreshness(signedOn, renewBy)

  if (freshness === "expired") {
    return (
      <div className="mb-10 flex flex-col gap-6">
        <CanaryFreshnessNotice freshness={freshness} renewBy={dueBy} />
        <p className="font-display text-[0.92rem] leading-[1.7] text-pretty text-muted">
          that date is read against the device clock. an incorrect device clock
          produces an incorrect due status, so compare the two dates against an
          independent clock.
        </p>
        <FingerprintSection fingerprint={fingerprint} />
      </div>
    )
  }

  return (
    <div className="mb-10 flex flex-col gap-6">
      <noscript>
        <div className="flex flex-col gap-3 bg-ink px-4 py-5 text-paper">
          <p className="font-sc text-[0.7rem]">
            renew by {formatLongDate(dueBy)}
          </p>
          <p className="font-display text-[0.92rem] leading-[1.7]">
            this page compares that date against the device clock in javascript,
            which is not running, so the comparison does not run here. compare{" "}
            {formatLongDate(dueBy)} with today directly. if today is past{" "}
            {formatLongDate(dueBy)}, this statement has not been replaced on
            time. it then says nothing about today and should not be read as
            current assurance. a missed renewal is not proof of compromise, and
            it is not reassurance either.
          </p>
        </div>
      </noscript>
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-8 gap-y-3">
        <dt className="js-only font-mono text-[0.72rem] text-muted">status</dt>
        <dd className="js-only font-mono text-[0.8rem]">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className={
                freshness === "valid"
                  ? "inline-block size-2 bg-sprout"
                  : "inline-block size-2 bg-line"
              }
            />
            <span
              className={
                freshness === "valid" ? "font-bold text-sprout" : "text-ink"
              }
            >
              {freshness === "valid" ? "current" : "unconfirmed"}
            </span>
          </span>
        </dd>
      </dl>
      <p
        data-clock={today === "" ? "static" : "visitor"}
        className="font-display text-[0.92rem] leading-[1.7] text-pretty text-muted"
      >
        this statement must be replaced by {formatLongDate(dueBy)}. compare that
        date with today.
        {freshness === "future" ? (
          <>
            {" "}
            this statement was signed on {formatLongDate(statedOn)}, a date the
            device clock places in the future. the device clock is therefore
            wrong; compare the dates against an independent clock.
          </>
        ) : null}
      </p>
      <FingerprintSection fingerprint={fingerprint} />
    </div>
  )
}
