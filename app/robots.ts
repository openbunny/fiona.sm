import type { MetadataRoute } from "next"

import { site } from "@/lib/site/site"

const disallowedBots = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "PerplexityBot",
  "Amazonbot",
  "Bytespider",
  "Diffbot",
  "Timpibot",
  "Omgilibot",
  "cohere-ai",
  "ImagesiftBot",
  "ia_archiver",
  "archive.org_bot",
]

export const dynamic = "force-static"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: disallowedBots,
        disallow: "/",
      },
    ],
    host: site.url,
  }
}
