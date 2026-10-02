import type { ImageResponse } from "next/og"

import { ogArtFiles } from "@/lib/images/og-art"
import { ogCard, ogContentType, ogSize } from "@/lib/images/og-card"

const title = "safari extensions, component libraries and this site's source"

export const alt = `a puppy swimming happily, captioned "${title}".`
export const size = ogSize
export const contentType = ogContentType

export default async function OpengraphImage(): Promise<ImageResponse> {
  return ogCard({ artwork: ogArtFiles.openbunnyBulkRelease, title })
}
