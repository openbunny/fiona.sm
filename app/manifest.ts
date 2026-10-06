import { color } from "@openbunny/theme/tokens"
import type { MetadataRoute } from "next"

import { iconUrls } from "@/lib/images/icon-urls"
import { site } from "@/lib/site/site"

export const dynamic = "force-static"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.title,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "browser",
    background_color: color.paper.toUpperCase(),
    theme_color: color.paper.toUpperCase(),
    lang: site.language,
    icons: [
      {
        src: iconUrls.svg,
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: iconUrls.png192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: iconUrls.png512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: iconUrls.maskable192,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: iconUrls.maskable512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
