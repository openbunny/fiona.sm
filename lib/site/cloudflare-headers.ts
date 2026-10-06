import { match } from "path-to-regexp"

import { routeHeaders } from "@/lib/site/route-headers"
import { securityHeaders } from "@/lib/site/security-headers"

const headerRuleLimit = 100
const headerLineLimit = 2000
const shareCardPath = /\/opengraph-image\/[0-9a-f]{128}$/u

export function cloudflareHeaders(assetPaths: readonly string[]): string {
  if (assetPaths.length === 0) {
    throw new Error(
      "The static export contains no assets. Run `bun run build` before generating Cloudflare headers."
    )
  }

  const rules = routeHeaders.slice(1).map((rule) => ({
    matches: match(rule.source),
    headers: rule.headers,
  }))
  const globalHeaders = [
    ...securityHeaders,
    {
      key: "Cache-Control",
      value: "public, max-age=0, must-revalidate",
    },
  ]
  const blocks = [
    "/*\n" +
      globalHeaders.map(({ key, value }) => `  ${key}: ${value}`).join("\n"),
    "/_next/static/*\n  ! Cache-Control\n  Cache-Control: public, max-age=31536000, immutable",
  ]

  for (const assetPath of [...new Set(assetPaths)].sort()) {
    const path =
      assetPath === "/index.html" ? "/" : assetPath.replace(/\.html$/u, "")
    const headers = new Map<string, string>()
    for (const rule of rules.filter((rule) => rule.matches(path))) {
      for (const { key, value } of rule.headers) {
        headers.set(key, value)
      }
    }
    if (shareCardPath.test(path)) {
      headers.set("Content-Type", "image/png")
      headers.set("Cache-Control", "public, max-age=31536000, immutable")
    }
    if (path.startsWith("/_next/static/")) continue
    if (headers.size === 0) continue
    const lines = [...headers].flatMap(([key, value]) => [
      `  ! ${key}`,
      `  ${key}: ${value}`,
    ])
    blocks.push(`${path}\n${lines.join("\n")}`)
  }

  if (blocks.length > headerRuleLimit) {
    throw new Error(
      `Cloudflare headers require ${blocks.length} rules; the limit is ${headerRuleLimit}. Reduce the rule count before deployment.`
    )
  }
  const output = blocks.join("\n\n") + "\n"
  if (output.split("\n").some((line) => line.length > headerLineLimit)) {
    throw new Error(
      `A Cloudflare header line exceeds ${headerLineLimit} characters. Shorten the policy before deployment.`
    )
  }
  return output
}
