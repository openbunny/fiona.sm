import { PageShell } from "@openbunny/react"
import type { Metadata } from "next"
import type { ReactElement } from "react"

import { Logo } from "@/components/logo"
import { PageTitle } from "@/components/page-title"
import { SiteBar } from "@/components/site-bar"
import { SiteFooter } from "@/components/site-footer"
import { siteLastChangedAt } from "@/lib/site/commit-date"
import { routeSocialMetadata } from "@/lib/site/metadata"

const title = "cv"
const description = "curriculum vitae."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cv" },
  ...routeSocialMetadata({
    title,
    description,
    path: "/cv",
    type: "website",
  }),
}

export default function CvPage(): ReactElement {
  const lastChangedAt = siteLastChangedAt()

  return (
    <PageShell>
      <SiteBar route="/cv" />
      <header className="mt-6 border-b border-line">
        <Logo className="w-44 translate-y-px md:w-56" />
      </header>
      <main id="main" className="mt-8">
        <PageTitle title={title} lastChangedAt={lastChangedAt} />
      </main>
      <SiteFooter />
    </PageShell>
  )
}
