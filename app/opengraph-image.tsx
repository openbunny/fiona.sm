import type { ImageResponse } from "next/og"

import { ogArtFiles } from "@/lib/images/og-art"
import { ogCard, ogContentType, ogSize } from "@/lib/images/og-card"
import { site } from "@/lib/site/site"

export const alt =
  'a white rabbit with its ears flopped over its eyes, captioned "fiona\'s website".'
export const size = ogSize
export const contentType = ogContentType
export const dynamic = "force-static"

export default async function OpengraphImage(): Promise<ImageResponse> {
  return ogCard({ artwork: ogArtFiles.home, title: site.homeTitle })
}
