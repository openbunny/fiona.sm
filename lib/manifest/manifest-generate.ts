import { posts } from "@/lib/blog/posts"
import { builtArticleText, hashArticleText } from "@/lib/manifest/article-hash"
import { defaultBuildOutputDir } from "@/lib/manifest/manifest-paths"
import {
  buildManifestText,
  type ManifestEntry,
} from "@/lib/manifest/manifest-text"

export type GenerateManifestOptions = {
  readonly fingerprint: string
  readonly buildOutputDir?: string
  readonly publishedSlugs?: readonly string[]
}

type GeneratedArticleText = {
  readonly slug: string
  readonly text: string
}

export type GeneratedManifest = {
  readonly manifestText: string
  readonly articleTexts: readonly GeneratedArticleText[]
}

export function generateManifest(
  options: GenerateManifestOptions
): GeneratedManifest {
  const buildOutputDir = options.buildOutputDir ?? defaultBuildOutputDir()
  const slugs = [...(options.publishedSlugs ?? posts.map((post) => post.slug))]
    .slice()
    .sort((a, b) => a.localeCompare(b))

  const articleTexts: GeneratedArticleText[] = slugs.map((slug) => ({
    slug,
    text: builtArticleText(buildOutputDir, slug),
  }))

  const entries: ManifestEntry[] = articleTexts.map(({ slug, text }) => ({
    slug,
    sha256: hashArticleText(text),
  }))

  return {
    manifestText: buildManifestText({
      fingerprint: options.fingerprint,
      entries,
    }),
    articleTexts,
  }
}

export function generateManifestText(options: GenerateManifestOptions): string {
  return generateManifest(options).manifestText
}
