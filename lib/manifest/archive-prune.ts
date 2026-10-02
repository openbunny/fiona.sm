import { existsSync, readdirSync, rmSync } from "node:fs"

import {
  archivedArticleTextPath,
  articleTextArchiveDir,
} from "@/lib/manifest/manifest-paths"

export function publishedDigestsFor(
  signedDigest: string | undefined,
  currentDigest: string
): ReadonlySet<string> {
  return new Set(
    signedDigest === undefined ? [currentDigest] : [signedDigest, currentDigest]
  )
}

export function pruneUnpublishedRevisions(
  articleTextDir: string,
  slug: string,
  published: ReadonlySet<string>
): readonly string[] {
  const directory = articleTextArchiveDir(articleTextDir, slug)
  if (!existsSync(directory)) {
    return []
  }

  const dropped: string[] = []
  for (const name of readdirSync(directory).sort()) {
    if (!name.endsWith(".txt")) {
      continue
    }

    const digest = name.slice(0, -".txt".length)
    if (published.has(digest)) {
      continue
    }

    rmSync(archivedArticleTextPath(articleTextDir, slug, digest))
    dropped.push(digest)
  }

  return dropped
}
