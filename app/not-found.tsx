import { ChevronIcon, StatusPage } from "@openbunny/react"
import type { Metadata } from "next"
import Link from "next/link"
import type { ReactElement } from "react"

import { NOT_FOUND_PLATE } from "@/lib/images/plates"
import { routeSocialMetadata } from "@/lib/site/metadata"

const title = "not found"
const description = "that path does not exist on this site."

const social = routeSocialMetadata({
  title,
  description,
  path: "/",
  type: "website",
})

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  alternates: { canonical: null },
  openGraph: { ...social.openGraph, images: [] },
  twitter: { ...social.twitter, images: [] },
}

export default function NotFound(): ReactElement {
  return (
    <StatusPage
      asset={NOT_FOUND_PLATE}
      plateClassName="w-[177px] md:w-[354px]"
      heading="?"
      actions={
        <Link href="/" aria-label="return home" className="chip w-fit">
          <ChevronIcon direction="left" />
        </Link>
      }
    >
      that path does not exist on this site.
    </StatusPage>
  )
}
