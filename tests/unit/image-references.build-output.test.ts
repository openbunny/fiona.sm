import { existsSync, readdirSync, readFileSync } from "node:fs"
import { basename, join } from "node:path"

import { describe, expect, it } from "vitest"

import { contentHash, imageExtensions } from "@/lib/images/content-name"
import { site } from "@/lib/site/site"

const OUT = "out"

const outFiles = readdirSync(OUT, { recursive: true, encoding: "utf8" })
const htmlFiles = outFiles.filter((path) => path.endsWith(".html"))

const extensions = imageExtensions.join("|")
const imageUrl = new RegExp(
  `^/(?:img/[0-9a-f]{128}\\.(?:${extensions})|favicon\\.ico|(?:.+/)?opengraph-image/[0-9a-f]{128})$`,
  "u"
)
const imageLike = new RegExp(
  `\\.(?:${extensions})$|/opengraph-image(?:/|$)`,
  "u"
)
const contentPath = new RegExp(`/img/[0-9a-f]{128}\\.(?:${extensions})`, "gu")
const shareCard = /(?:^|\/)opengraph-image\/[0-9a-f]{128}$/u

function toPath(reference: string): string {
  return reference
    .replace(site.url, "")
    .replaceAll("&amp;", "&")
    .replace(/[?#].*$/u, "")
}

function referencedImages(): ReadonlyMap<string, string> {
  const found = new Map<string, string>()
  for (const file of htmlFiles) {
    const html = readFileSync(join(OUT, file), "utf8")
    for (const [, reference] of html.matchAll(
      /(?:src|srcSet|href|content)="([^"]+)"/gu
    )) {
      if (reference === undefined) continue
      for (const candidate of reference.split(/[\s,]+/u)) {
        const path = toPath(candidate)
        if (path.startsWith("/") && imageLike.test(path)) found.set(path, file)
      }
    }
  }
  for (const file of outFiles.filter((path) => path.endsWith(".js"))) {
    const script = readFileSync(join(OUT, file), "utf8")
    for (const [path] of script.matchAll(contentPath)) {
      found.set(path, file)
    }
  }
  const manifest = JSON.parse(
    readFileSync(join(OUT, "manifest.webmanifest"), "utf8")
  ) as { icons: { src: string }[] }
  for (const { src } of manifest.icons) {
    found.set(toPath(src), "manifest.webmanifest")
  }
  return found
}

const references = referencedImages()

describe("image references in the built site", () => {
  it("finds pages and images to check, so an empty build cannot pass", () => {
    expect(htmlFiles.length).toBeGreaterThan(0)
    expect(references.size).toBeGreaterThan(0)
  })

  it.each([...references])(
    "serves %s, referenced from %s, under a sha-512 name that exists",
    (path) => {
      expect(path).toMatch(imageUrl)
      expect(existsSync(join(OUT, path))).toBe(true)
    }
  )

  it("references every file in public/img, so none ships unused", () => {
    const shipped = readdirSync("public/img").map((name) => `/img/${name}`)
    expect(shipped.length).toBeGreaterThan(0)
    expect(shipped.filter((path) => !references.has(path))).toEqual([])
  })

  it("names every rendered share card by the sha-512 of its bytes", () => {
    const cards = outFiles.filter((path) => shareCard.test(path))
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(basename(card)).toBe(contentHash(readFileSync(join(OUT, card))))
    }
  })
})
