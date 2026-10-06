import { ogCardImageMetadata, ogCardResponse } from "@/lib/images/og-cards"

export const dynamic = "force-static"
export const dynamicParams = false

export function generateImageMetadata(): ReturnType<
  typeof ogCardImageMetadata
> {
  return ogCardImageMetadata("worms-wmd")
}

export default function Image(): Promise<Response> {
  return ogCardResponse("worms-wmd")
}
