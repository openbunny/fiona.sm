import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { hashArticleText } from "@/lib/manifest/article-hash"
import {
  generateManifest,
  generateManifestText,
} from "@/lib/manifest/manifest-generate"
import { parseManifestEntries } from "@/lib/manifest/manifest-text"

const fingerprint = "4820FA938BA2573DE08E4FAD45B4B5460D72A034"

function page(text: string): string {
  return `<!DOCTYPE html><html><body><article><p>${text}</p></article></body></html>`
}

describe("generateManifestText", () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fiona-manifest-test-"))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("hashes every published slug's built article text, sorted by slug", async () => {
    await writeFile(join(dir, "zeta.html"), page("zeta content"), {
      encoding: "utf8",
    })
    await writeFile(join(dir, "alpha.html"), page("alpha content"), {
      encoding: "utf8",
    })

    const text = generateManifestText({
      fingerprint,
      buildOutputDir: dir,
      publishedSlugs: ["zeta", "alpha"],
    })

    expect(parseManifestEntries(text)).toEqual([
      { slug: "alpha", sha256: hashArticleText("alpha content") },
      { slug: "zeta", sha256: hashArticleText("zeta content") },
    ])
  })

  it("throws naming the missing build output for a published slug", () => {
    expect(() =>
      generateManifestText({
        fingerprint,
        buildOutputDir: dir,
        publishedSlugs: ["missing-post"],
      })
    ).toThrow(/missing-post\.html is missing/)
  })
})

describe("generateManifest", () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fiona-manifest-test-"))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("returns each published slug's exact normalised article text alongside the manifest", async () => {
    await writeFile(join(dir, "zeta.html"), page("zeta content"), {
      encoding: "utf8",
    })
    await writeFile(join(dir, "alpha.html"), page("alpha content"), {
      encoding: "utf8",
    })

    const { manifestText, articleTexts } = generateManifest({
      fingerprint,
      buildOutputDir: dir,
      publishedSlugs: ["zeta", "alpha"],
    })

    expect(articleTexts).toEqual([
      { slug: "alpha", text: "alpha content" },
      { slug: "zeta", text: "zeta content" },
    ])

    const entries = parseManifestEntries(manifestText)
    for (const { slug, text } of articleTexts) {
      const entry = entries.find((candidate) => candidate.slug === slug)
      expect(entry?.sha256).toBe(hashArticleText(text))
    }
  })
})
