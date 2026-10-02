import { existsSync, readFileSync } from "node:fs"

import { defaultManifestPath } from "@/lib/manifest/manifest-paths"
import {
  parseManifestEntries,
  type ManifestEntry,
} from "@/lib/manifest/manifest-text"

export const manifestClearsignMarker = "-----BEGIN PGP SIGNED MESSAGE-----"

export type ManifestLookup =
  | { readonly kind: "absent" }
  | {
      readonly kind: "present"
      readonly signed: boolean
      readonly entries: readonly ManifestEntry[]
    }

export function readManifestLookup(
  manifestPath: string = defaultManifestPath()
): ManifestLookup {
  if (!existsSync(manifestPath)) {
    return { kind: "absent" }
  }

  const raw = readFileSync(manifestPath, "utf8")
  return {
    kind: "present",
    signed: raw.trimStart().startsWith(manifestClearsignMarker),
    entries: parseManifestEntries(raw),
  }
}

export function manifestEntryForSlug(
  slug: string,
  lookup: ManifestLookup
): ManifestEntry | undefined {
  return lookup.kind === "present"
    ? lookup.entries.find((entry) => entry.slug === slug)
    : undefined
}
