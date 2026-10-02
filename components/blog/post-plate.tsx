import type { ReactElement } from "react"

import { Plate } from "@openbunny/react"
import { postBySlug } from "@/lib/blog/posts"

export function PostPlate({
  slug,
}: {
  readonly slug: string
}): ReactElement | null {
  const artwork = postBySlug(slug)?.artwork

  return artwork === undefined ? null : (
    <Plate asset={artwork} className="w-[250px]" />
  )
}
