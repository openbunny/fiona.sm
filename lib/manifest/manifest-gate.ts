import { existsSync, readdirSync, readFileSync } from "node:fs"

import { posts } from "@/lib/blog/posts"
import { builtArticleText, hashArticleText } from "@/lib/manifest/article-hash"
import { manifestClearsignMarker } from "@/lib/manifest/manifest-lookup"
import {
  archivedArticleTextPath,
  articleTextArchiveDir,
  articleTextPath,
  defaultArticleTextDir,
} from "@/lib/manifest/manifest-paths"
import {
  parseManifestEntries,
  parseManifestFingerprint,
} from "@/lib/manifest/manifest-text"
import { verifyClearsigned } from "@/lib/openpgp-armor"

type PostDriftState =
  "matching" | "differing" | "missingFromManifest" | "orphanInManifest"

type ArticleTextDriftState = "ok" | "missing" | "stale"

type ArchiveDriftState = "ok" | "missing"

export type PostDrift = {
  readonly slug: string
  readonly state: PostDriftState
  readonly manifestHash?: string
  readonly builtHash?: string
  readonly articleText?: ArticleTextDriftState
  readonly archive?: ArchiveDriftState
}

export type ManifestGateState =
  | { readonly kind: "manifestMissing" }
  | { readonly kind: "manifestUnsigned" }
  | { readonly kind: "signatureInvalid"; readonly detail: string }
  | { readonly kind: "noPublishedPosts" }
  | {
      readonly kind: "verified"
      readonly drift: readonly PostDrift[]
      readonly orphanArticleTextFiles: readonly string[]
      readonly corruptArchiveFiles: readonly string[]
    }

export type ManifestGateOptions = {
  readonly manifestPath: string
  readonly publicKeyArmor: string
  readonly expectedFingerprint: string
  readonly buildOutputDir: string
  readonly articleTextDir?: string
  readonly publishedSlugs?: readonly string[]
}

function evaluateArticleText(
  articleTextDir: string,
  slug: string,
  builtText: string,
  manifestHash: string
): ArticleTextDriftState {
  const path = articleTextPath(articleTextDir, slug)
  if (!existsSync(path)) {
    return "missing"
  }

  const committed = readFileSync(path, "utf8")
  if (committed !== builtText) {
    return "stale"
  }

  return hashArticleText(committed) === manifestHash ? "ok" : "stale"
}

function evaluateArchive(
  articleTextDir: string,
  slug: string,
  manifestHash: string
): ArchiveDriftState {
  return existsSync(archivedArticleTextPath(articleTextDir, slug, manifestHash))
    ? "ok"
    : "missing"
}

function corruptArchiveFiles(
  articleTextDir: string,
  publishedSlugs: ReadonlySet<string>
): string[] {
  const corrupt: string[] = []

  for (const slug of [...publishedSlugs].sort((a, b) => a.localeCompare(b))) {
    const directory = articleTextArchiveDir(articleTextDir, slug)
    if (!existsSync(directory)) {
      continue
    }

    for (const name of readdirSync(directory).sort()) {
      if (!name.endsWith(".txt")) {
        corrupt.push(`${directory}/${name}`)
        continue
      }

      const path = `${directory}/${name}`
      const claimed = name.slice(0, -".txt".length)
      if (hashArticleText(readFileSync(path, "utf8")) !== claimed) {
        corrupt.push(path)
      }
    }
  }

  return corrupt
}

function orphanArticleTextFiles(
  articleTextDir: string,
  publishedSlugs: ReadonlySet<string>
): string[] {
  if (!existsSync(articleTextDir)) {
    return []
  }

  return readdirSync(articleTextDir)
    .filter((name) => name.endsWith(".txt"))
    .map((name) => name.slice(0, -".txt".length))
    .filter((slug) => !publishedSlugs.has(slug))
    .sort((a, b) => a.localeCompare(b))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function evaluateManifestGate(
  options: ManifestGateOptions
): Promise<ManifestGateState> {
  if (!existsSync(options.manifestPath)) {
    return { kind: "manifestMissing" }
  }

  const raw = readFileSync(options.manifestPath, "utf8")
  if (!raw.trimStart().startsWith(manifestClearsignMarker)) {
    return { kind: "manifestUnsigned" }
  }

  let cleartext: string
  try {
    cleartext = await verifyClearsigned(raw, options.publicKeyArmor)
  } catch (error) {
    return { kind: "signatureInvalid", detail: errorMessage(error) }
  }

  const manifestFingerprint = parseManifestFingerprint(cleartext)
  if (manifestFingerprint !== options.expectedFingerprint) {
    return {
      kind: "signatureInvalid",
      detail: `Manifest declares fingerprint ${manifestFingerprint}, lib/canary/canary.ts declares ${options.expectedFingerprint}`,
    }
  }

  const entries = parseManifestEntries(cleartext)
  const manifestBySlug = new Map(
    entries.map((entry) => [entry.slug, entry.sha256])
  )
  const publishedSlugs = new Set(
    options.publishedSlugs ?? posts.map((post) => post.slug)
  )

  if (publishedSlugs.size === 0) {
    return { kind: "noPublishedPosts" }
  }

  const articleTextDir = options.articleTextDir ?? defaultArticleTextDir()
  const allSlugs = new Set([...manifestBySlug.keys(), ...publishedSlugs])

  const drift: PostDrift[] = []
  for (const slug of [...allSlugs].sort((a, b) => a.localeCompare(b))) {
    const manifestHash = manifestBySlug.get(slug)
    const isPublished = publishedSlugs.has(slug)

    if (manifestHash !== undefined && isPublished) {
      const builtText = builtArticleText(options.buildOutputDir, slug)
      const actual = hashArticleText(builtText)
      drift.push({
        slug,
        state: actual === manifestHash ? "matching" : "differing",
        manifestHash,
        builtHash: actual,
        articleText: evaluateArticleText(
          articleTextDir,
          slug,
          builtText,
          manifestHash
        ),
        archive: evaluateArchive(articleTextDir, slug, manifestHash),
      })
      continue
    }

    if (manifestHash === undefined && isPublished) {
      drift.push({ slug, state: "missingFromManifest" })
      continue
    }

    if (manifestHash !== undefined && !isPublished) {
      drift.push({ slug, state: "orphanInManifest", manifestHash })
    }
  }

  return {
    kind: "verified",
    drift,
    corruptArchiveFiles: corruptArchiveFiles(articleTextDir, publishedSlugs),
    orphanArticleTextFiles: orphanArticleTextFiles(
      articleTextDir,
      publishedSlugs
    ),
  }
}
