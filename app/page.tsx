import type { ReactElement, ReactNode } from "react"

import Link from "next/link"

import { Logo } from "@/components/logo"
import { MailLink } from "@/components/mail-link"
import { PageShell } from "@/components/page-shell"
import { SiteBar } from "@/components/site-bar"
import { SiteFooter } from "@/components/site-footer"
import { canary } from "@/lib/canary/canary"
import { fingerprintRows } from "@/lib/canary/fingerprint"
import { linkLabel } from "@/lib/site/navigation"

export default function Page(): ReactElement {
  const rows = fingerprintRows(canary.fingerprint)

  return (
    <PageShell>
      <SiteBar route="/" />
      <header className="mt-6 border-b border-line">
        <Logo className="w-44 translate-y-px md:w-56" />
      </header>
      <main id="main" className="mt-8 flex flex-col gap-10">
        <h1 className="font-display text-[clamp(2rem,9vw,3.25rem)] leading-[1.05]">
          {canary.displayName}
        </h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 font-mono text-[0.78rem] leading-[1.6]">
          <Row label="mail">
            <MailLink className="text-[0.78rem]" />
          </Row>
          <Row label="key">
            {canary.algorithm},{" "}
            <a href={canary.publicKeyHref} className="link">
              {canary.publicKeyHref.slice(1)}
            </a>
          </Row>
          <Row label="fingerprint">
            <span className="sr-only">
              {`in ten groups of four: ${rows.top} ${rows.bottom}`}
            </span>
            <span aria-hidden="true" className="block [overflow-wrap:anywhere]">
              {rows.top}
              <br />
              {rows.bottom}
            </span>
          </Row>
          <Row label="canary">
            <Link href="/canary" className="link no-underline">
              {linkLabel("/canary")}
            </Link>{" "}
            <span className="text-muted">
              — signed statement, renewed every 90 days
            </span>
          </Row>
        </dl>
      </main>
      <SiteFooter />
    </PageShell>
  )
}

function Row({
  label,
  children,
}: {
  readonly label: string
  readonly children: ReactNode
}): ReactElement {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  )
}
