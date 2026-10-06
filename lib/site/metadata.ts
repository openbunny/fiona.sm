import { color } from "@openbunny/theme/tokens"
import type { Metadata, Viewport } from "next"

import { canary } from "@/lib/canary/canary"
import { ink } from "@/lib/images/icon-files"
import { iconUrls } from "@/lib/images/icon-urls"
import { absoluteUrl, site } from "@/lib/site/site"

type RouteSocialMetadata = {
  readonly title: string
  readonly description: string
  readonly path: string
  readonly type: "website" | "article"
  readonly twitterCard?: "summary" | "summary_large_image"
}

export function citationMetadata({
  title,
  path,
  publishedOn,
}: {
  readonly title: string
  readonly path: string
  readonly publishedOn: string
}): Record<string, string> {
  const url = absoluteUrl(path)

  return {
    citation_title: title,
    citation_author: site.name,
    citation_publication_date: publishedOn.replaceAll("-", "/"),
    citation_fulltext_html_url: url,
    citation_public_url: url,
    citation_language: site.language,
    "DC.title": title,
    "DC.creator": site.name,
    "DC.date": publishedOn,
    "DC.identifier": url,
    "DC.language": site.language,
    "DC.format": "text/html",
    "DC.type": "Text",
  }
}

export function routeSocialMetadata({
  title,
  description,
  path,
  type,
  twitterCard = "summary",
}: RouteSocialMetadata): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type,
      locale: site.locale,
      url: absoluteUrl(path),
      siteName: site.name,
      title,
      description,
    },
    twitter: {
      card: twitterCard,
      title,
      description,
    },
  }
}

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    template: `%s · ${site.name}`,
    default: site.homeTitle,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: `mailto:${canary.email}` }],
  creator: site.name,
  publisher: site.name,
  keywords: [site.name, canary.email],
  referrer: "strict-origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    types: {
      "application/pgp-keys": canary.publicKeyHref,
      "text/plain": canary.statementHref,
    },
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-snippet": -1,
      "max-image-preview": "none",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "profile",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: site.homeTitle,
    description: site.description,
    firstName: "fiona",
    lastName: "",
    emails: [canary.email],
  },
  twitter: {
    card: "summary_large_image",
    title: site.homeTitle,
    description: site.description,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: iconUrls.svg, type: "image/svg+xml" },
    ],
    apple: [{ url: iconUrls.apple, sizes: "180x180" }],
    other: [
      {
        rel: "mask-icon",
        url: iconUrls.safari,
        color: ink,
      },
    ],
  },
  other: {
    "pgp:fingerprint": canary.fingerprint,
  },
}

export const viewport: Viewport = {
  themeColor: color.paper.toUpperCase(),
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
}
