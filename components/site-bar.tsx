import Link from "next/link"
import type { ReactElement } from "react"

import { ChevronIcon } from "@/components/chevron-icon"
import { barSpecFor, entryLabel } from "@/lib/site/navigation"
import { cn } from "@/lib/utils"

const ENTRY_COLUMNS = 2

export function SiteBar({ route }: { readonly route: string }): ReactElement {
  const spec = barSpecFor(route)
  const parentHref = spec.parentHref
  const wrapsToRows = spec.entries.length > ENTRY_COLUMNS
  const parentLabel = spec.segments
    .slice(0, -1)
    .map((segment) => segment.label)
    .join("/")

  const entries =
    spec.entries.length === 0 ? null : (
      <div
        className={cn(
          "w-fit items-baseline gap-x-6 text-right",
          wrapsToRows
            ? "ml-auto grid grid-cols-[auto_auto] justify-items-end gap-y-1"
            : "flex"
        )}
      >
        {spec.entries.map((entry) => (
          <Link key={entry.href} href={entry.href} className="hover:text-ink">
            {entryLabel(entry)}
          </Link>
        ))}
      </div>
    )

  const back =
    parentHref === null ? null : (
      <Link
        href={parentHref}
        aria-label={`up to ${parentLabel}`}
        className={cn("chip", wrapsToRows && "absolute top-0 right-0")}
      >
        <ChevronIcon direction="left" />
      </Link>
    )

  return (
    <nav
      aria-label="path and directory listing"
      className={cn(
        "no-print relative flex flex-wrap items-center justify-between gap-x-6 gap-y-2 font-mono text-[0.72rem] text-muted",
        wrapsToRows && parentHref !== null && "pr-14 sm:pr-16"
      )}
    >
      <p className="chip">
        {spec.segments.map((segment, index) => (
          <span key={segment.label}>
            {index > 0 ? "/" : null}
            {segment.href === null ? (
              <span aria-current="page">{segment.label}</span>
            ) : (
              <Link href={segment.href} className="hover:text-ink">
                {segment.label}
              </Link>
            )}
          </span>
        ))}
      </p>
      {wrapsToRows ? (
        entries
      ) : (
        <div className="flex items-center gap-x-6">
          {entries}
          {back}
        </div>
      )}
      {wrapsToRows ? back : null}
    </nav>
  )
}
