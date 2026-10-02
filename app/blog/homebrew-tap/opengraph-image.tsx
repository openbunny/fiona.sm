import type { ImageResponse } from "next/og"

import { ogArtFiles } from "@/lib/images/og-art"
import { ogCard, ogContentType, ogSize } from "@/lib/images/og-card"

const title = "custom homebrew tap"

export const alt = 'a pixel-art cat, captioned "custom homebrew tap".'
export const size = ogSize
export const contentType = ogContentType

export default async function OpengraphImage(): Promise<ImageResponse> {
  return ogCard({ artwork: ogArtFiles.homebrewTap, title })
}
