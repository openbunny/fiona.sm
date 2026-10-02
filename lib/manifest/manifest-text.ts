import { fingerprintRows } from "@/lib/canary/fingerprint"

export type ManifestEntry = {
  readonly slug: string
  readonly sha256: string
}

export type ManifestDocument = {
  readonly fingerprint: string
  readonly entries: readonly ManifestEntry[]
}

const sha256Pattern = /^[0-9a-f]{64}$/
const slugPattern = /^[a-z0-9-]+$/
const entryLinePattern = /^([0-9a-f]{64}) {2}(\S+)$/gm
const fingerprintLinePattern =
  /^key fingerprint: ([0-9a-f]{4}(?: [0-9a-f]{4}){9})$/m

const columnHeader = `sha256${" ".repeat(64 - "sha256".length)}  slug`

function assertSortedUniqueSlugs(entries: readonly ManifestEntry[]): void {
  for (const [index, entry] of entries.entries()) {
    if (!sha256Pattern.test(entry.sha256)) {
      throw new Error(
        `Entry for "${entry.slug}" has a sha256 of "${entry.sha256}", expected 64 lowercase hex characters`
      )
    }

    if (!slugPattern.test(entry.slug)) {
      throw new Error(`Entry slug "${entry.slug}" is not lowercase kebab-case`)
    }

    const previous = entries[index - 1]
    if (previous !== undefined && previous.slug >= entry.slug) {
      throw new Error(
        `Entries are not sorted by slug: "${previous.slug}" is not before "${entry.slug}"`
      )
    }
  }
}

export function buildManifestText(document: ManifestDocument): string {
  assertSortedUniqueSlugs(document.entries)
  const { top, bottom } = fingerprintRows(document.fingerprint)
  const fingerprintLine = `${top} ${bottom}`.toLowerCase()

  return [
    "post content manifest for fiona <mail@fiona.sm>",
    `key fingerprint: ${fingerprintLine}`,
    "",
    "each line below pairs the sha-256 of one published post's normalised",
    "article text with its slug. that text is published verbatim at",
    "/posts/<slug>.txt, so re-deriving a hash needs no access to the source:",
    "curl -fsS https://fiona.sm/posts/<slug>.txt | sha256sum",
    "",
    "this file does not attest to markup, scripts, or styling; to anything",
    "outside a post's <article> element; to git history (commit signing",
    "already covers that); or to a post published after this file was",
    "generated. a reader who never checks this file against the key above",
    "gains nothing from its existence.",
    "",
    columnHeader,
    ...document.entries.map((entry) => `${entry.sha256}  ${entry.slug}`),
    "",
  ].join("\n")
}

export function parseManifestFingerprint(manifestText: string): string {
  const match = fingerprintLinePattern.exec(manifestText)
  if (match?.[1] === undefined) {
    throw new Error(
      'Manifest carries no "key fingerprint: <hex>" line in the expected format'
    )
  }

  return match[1].replaceAll(" ", "").toUpperCase()
}

export function parseManifestEntries(
  manifestText: string
): readonly ManifestEntry[] {
  const entries: ManifestEntry[] = []
  const seenSlugs = new Set<string>()

  for (const match of manifestText.matchAll(entryLinePattern)) {
    const [, sha256, slug] = match
    if (sha256 === undefined || slug === undefined) {
      continue
    }

    if (seenSlugs.has(slug)) {
      throw new Error(`Manifest carries more than one entry for "${slug}"`)
    }

    seenSlugs.add(slug)
    entries.push({ slug, sha256 })
  }

  return entries
}
