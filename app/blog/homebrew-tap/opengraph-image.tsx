import { ogCardImageMetadata, ogCardResponse } from "@/lib/images/og-cards"

export const dynamic = "force-static"
export const dynamicParams = false

export function generateImageMetadata(): ReturnType<
  typeof ogCardImageMetadata
> {
  return ogCardImageMetadata("homebrew-tap")
}

export default function Image(): Promise<Response> {
  return ogCardResponse("homebrew-tap")
}
