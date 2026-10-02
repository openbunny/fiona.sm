import type { Metadata } from "next"
import type { ReactElement } from "react"

import { CanaryPage } from "@/components/canary/canary-page"
import { routeSocialMetadata } from "@/lib/site/metadata"
import { site } from "@/lib/site/site"

const title = "canary"
const description = "a clearsigned statement, dated against a monero block."

export const metadata: Metadata = {
  title: { absolute: `${site.possessive} ${title}` },
  description,
  category: "security",
  keywords: ["pgp", "openpgp", "key canary", "warrant canary"],
  alternates: { canonical: "/canary" },
  ...routeSocialMetadata({
    title,
    description,
    path: "/canary",
    type: "website",
    twitterCard: "summary_large_image",
  }),
}

export default function Page(): ReactElement {
  return <CanaryPage />
}
