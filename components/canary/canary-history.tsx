import { PageSection, SectionHeading } from "@openbunny/react"
import type { ReactElement } from "react"

import { canary } from "@/lib/canary/canary"
import type { CanaryArchive } from "@/lib/canary/canary-history"
import { formatLongDate } from "@/lib/iso-date"

type HistoryEntry = {
  readonly signedOn: string
  readonly href: string
}

export function CanaryHistory({
  number,
  archives,
}: {
  readonly number: string
  readonly archives: ReadonlyArray<CanaryArchive>
}): ReactElement {
  const entries: ReadonlyArray<HistoryEntry> = [
    { signedOn: canary.signedOn, href: canary.statementHref },
    ...archives.filter((archive) => archive.signedOn !== canary.signedOn),
  ]

  return (
    <PageSection id="history">
      <SectionHeading number={number}>statement history</SectionHeading>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li
            key={entry.href}
            className="flex items-baseline justify-between gap-4 hover:bg-paper-deep"
          >
            <a href={entry.href} className="link font-mono text-[0.78rem]">
              <time dateTime={entry.signedOn}>
                {formatLongDate(entry.signedOn)}
              </time>
            </a>
            <a
              href={entry.href}
              download
              aria-label={`download the statement signed ${formatLongDate(entry.signedOn)}`}
              className="link font-sc text-[0.7rem]"
            >
              download
            </a>
          </li>
        ))}
      </ul>
    </PageSection>
  )
}
