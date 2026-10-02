import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { extractArticleText } from "@/lib/manifest/article-text"

export function hashArticleText(normalisedText: string): string {
  return createHash("sha256").update(normalisedText, "utf8").digest("hex")
}

export function builtPagePath(buildOutputDir: string, slug: string): string {
  return join(buildOutputDir, `${slug}.html`)
}

export function builtArticleText(buildOutputDir: string, slug: string): string {
  const path = builtPagePath(buildOutputDir, slug)
  if (!existsSync(path)) {
    throw new Error(
      `${path} is missing. Run \`bun run build\` before hashing "${slug}": the manifest hashes built output, not source.`
    )
  }

  const html = readFileSync(path, "utf8")
  return extractArticleText(html)
}

export function hashBuiltPost(buildOutputDir: string, slug: string): string {
  return hashArticleText(builtArticleText(buildOutputDir, slug))
}
