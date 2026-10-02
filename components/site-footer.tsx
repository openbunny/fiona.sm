import type { ReactElement } from "react"

import Link from "next/link"

import { MailLink } from "@/components/mail-link"
import { commitHash } from "@/lib/site/commit-hash"
import { linkLabel } from "@/lib/site/navigation"

export function SiteFooter(): ReactElement {
  const hash = commitHash()

  return (
    <footer className="mt-14 flex items-baseline justify-between gap-4 border-t border-line pt-6">
      <Link
        href="/privacy"
        className="font-mono text-[0.72rem] text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        {linkLabel("/privacy")}
      </Link>
      <span className="font-mono text-[0.72rem] text-muted">
        <span className="sr-only">{`build ${hash}`}</span>
        <span aria-hidden="true" className="opacity-50">
          {hash}
        </span>
      </span>
      <MailLink />
    </footer>
  )
}
