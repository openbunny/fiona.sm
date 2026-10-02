import type { ImageResponse } from "next/og"

import { canary } from "@/lib/canary/canary"
import { formatLongDate } from "@/lib/iso-date"
import { ogArtFiles } from "@/lib/images/og-art"
import { ogCard, ogContentType, ogSize } from "@/lib/images/og-card"

const title = "key canary"
const signedOn = formatLongDate(canary.signedOn)
const renewBy = formatLongDate(canary.renewBy)
const note = `signed ${signedOn} · renew by ${renewBy}`

export const alt = `a white cat stretched out asleep, captioned "key canary", above the line "${note}".`
export const size = ogSize
export const contentType = ogContentType

export default async function OpengraphImage(): Promise<ImageResponse> {
  return ogCard({ artwork: ogArtFiles.canary, title, note })
}
