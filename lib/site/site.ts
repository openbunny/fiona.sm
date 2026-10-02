import { canary } from "@/lib/canary/canary"

export const site = {
  name: canary.displayName,
  title: canary.displayName,
  homeTitle: "fiona's website",
  possessive: `${canary.displayName}'s`,
  description: "a blog and a signed canary.",
  url: canary.siteOrigin,
  locale: "en_GB",
  language: "en",
  feedPath: "/feed.xml",
} as const

export function absoluteUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return new URL(normalized, `${site.url}/`).toString()
}

export function isRelativeAssetPath(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("..")) {
    return false
  }

  const segments = href.slice(1).split("/")
  return (
    segments.length > 0 &&
    segments.every((segment) => /^[\w.-]+$/.test(segment))
  )
}
