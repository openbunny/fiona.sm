import { ogCardImageMetadata, ogCardResponse } from "@/lib/images/og-cards"

export const dynamic = "force-static"
export const dynamicParams = false

export function generateImageMetadata(): ReturnType<
  typeof ogCardImageMetadata
> {
  return ogCardImageMetadata("openbunny-bulk-release")
}

export default function Image(): Promise<Response> {
  return ogCardResponse("openbunny-bulk-release")
}
