import { formatLongDate } from "@/lib/iso-date"
import { joinOrigin } from "@/lib/publish/url"

const label = "renew by"
const badgeMarker = `[![${label} `
const shieldsBadge = "https://img.shields.io/badge"
const colour = "000000"

export type RenewByBadgeInput = {
  readonly renewBy: string
  readonly siteOrigin: string
  readonly statementHref: string
}

function shieldsSegment(text: string): string {
  return encodeURIComponent(text.replaceAll("_", "__").replaceAll("-", "--"))
}

export function buildRenewByBadge(input: RenewByBadgeInput): string {
  const date = formatLongDate(input.renewBy)
  const source = `${shieldsBadge}/${shieldsSegment(label)}-${shieldsSegment(date)}-${colour}`
  return `${badgeMarker}${date}](${source})](${joinOrigin(input.siteOrigin, input.statementHref)})`
}

export function patchReadmeBadge(source: string, badge: string): string {
  const start = source.indexOf(badgeMarker)
  if (start === -1) {
    throw new Error("Missing renew-by badge in README")
  }

  const end = source.indexOf("\n", start)
  if (end === -1) {
    throw new Error("Unterminated renew-by badge in README")
  }

  return source.slice(0, start) + badge + source.slice(end)
}
