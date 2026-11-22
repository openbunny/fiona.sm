import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/site/site"

export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: absoluteUrl("/cv"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ]
}
