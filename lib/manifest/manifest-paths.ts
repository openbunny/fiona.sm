import { join } from "node:path"

export function defaultBuildOutputDir(root?: string): string {
  return root === undefined
    ? ".next/server/app/blog"
    : join(root, ".next/server/app/blog")
}

export function defaultManifestPath(root?: string): string {
  return root === undefined
    ? "public/posts.asc"
    : join(root, "public/posts.asc")
}

export function defaultPublicKeyPath(root?: string): string {
  return root === undefined
    ? "public/fiona.asc"
    : join(root, "public/fiona.asc")
}

export function defaultArticleTextDir(root?: string): string {
  return root === undefined ? "public/posts" : join(root, "public/posts")
}

export function articleTextPath(articleTextDir: string, slug: string): string {
  return join(articleTextDir, `${slug}.txt`)
}

export function articleTextArchiveDir(
  articleTextDir: string,
  slug: string
): string {
  return join(articleTextDir, slug)
}

export function archivedArticleTextPath(
  articleTextDir: string,
  slug: string,
  sha256: string
): string {
  return join(articleTextDir, slug, `${sha256}.txt`)
}
