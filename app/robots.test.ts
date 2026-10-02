import { describe, expect, it } from "vitest"

import robots from "@/app/robots"
import { site } from "@/lib/site/site"

const result = robots()
const rules = Array.isArray(result.rules) ? result.rules : [result.rules]

describe("robots", () => {
  it("lets every crawler read the site, so it can see the noindex directive", () => {
    expect(rules).toContainEqual({ userAgent: "*", allow: "/" })
  })

  it("disallows the AI-training, scraper, and archiver bots by name", () => {
    const botRule = rules.find(
      (rule) => rule.userAgent !== "*" && rule.disallow === "/"
    )

    expect(botRule).toBeDefined()
    const userAgents = botRule?.userAgent
    expect(Array.isArray(userAgents)).toBe(true)

    for (const bot of [
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
    ]) {
      expect(userAgents).toContain(bot)
    }
  })

  it("advertises no sitemap", () => {
    expect(result).not.toHaveProperty("sitemap")
  })

  it("still names this site's own host", () => {
    expect(result.host).toBe(site.url)
  })
})
