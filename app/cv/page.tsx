import type { Metadata } from "next"
import type { ReactElement } from "react"

import { CvViewer } from "@/components/cv-viewer"
import { SiteBar } from "@/components/site-bar"
import { SiteFooter } from "@/components/site-footer"
import { routeSocialMetadata } from "@/lib/site/metadata"
import { PageShell } from "@openbunny/react"

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
  return (
    <PageShell>
      <SiteBar route="/cv" />
      <main id="main" className="mt-8">
        <h1 className="mb-4 font-display text-3xl">cv</h1>
        <CvViewer />
      </main>
      <SiteFooter />
    </PageShell>
  )
}
