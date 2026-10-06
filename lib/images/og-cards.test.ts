import { existsSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { posts } from "@/lib/blog/posts"
import { canary } from "@/lib/canary/canary"
import { formatLongDate } from "@/lib/iso-date"
import { contentHash } from "@/lib/images/content-name"
import {
  isOgCardKey,
  ogCardImageMetadata,
  ogCardResponse,
  ogCards,
  type OgCardKey,
  renderOgCard,
} from "@/lib/images/og-cards"
import { site } from "@/lib/site/site"

const keys = Object.keys(ogCards).filter(isOgCardKey)

const pictures: Readonly<Record<OgCardKey, RegExp>> = {
  home: /rabbit/,
  blog: /cat/,
  canary: /cat/,
  "worms-wmd": /rocket/,
  "openbunny-bulk-release": /puppy swimming happily/,
  "homebrew-tap": /cat/,
  "tickerbox-cli": /rabbit/,
}

describe("share cards", () => {
  it("declares a card for the home page, the blog, the canary and every post", () => {
    expect(keys).toEqual(
      expect.arrayContaining([
        "home",
        "blog",
        "canary",
        ...posts.map((post) => post.slug),
      ])
    )
  })

  it.each(keys)("draws %s from artwork the site publishes", (key) => {
    expect(existsSync(ogCards[key].artwork)).toBe(true)
  })

  it.each(keys)(
    "names in the %s alt the caption the card draws, beside the picture",
    (key) => {
      const { alt, title } = ogCards[key]
      expect(alt).toContain(`"${title}"`)
      expect(alt).toMatch(pictures[key])
      expect(alt).toBe(alt.toLowerCase())
    }
  )

  it("describes the home picture rather than restating the page description", () => {
    expect(ogCards.home.alt).toContain(site.homeTitle)
    expect(ogCards.home.alt).not.toContain(site.description)
  })

  it("states in the canary alt both dates the card draws, so a stale unfurl is visible", () => {
    expect(ogCards.canary.alt).toContain(formatLongDate(canary.signedOn))
    expect(ogCards.canary.alt).toContain(formatLongDate(canary.renewBy))
    expect(ogCards.canary.alt).not.toContain(canary.fingerprint)
  })

  it.each(keys)(
    "serves the %s card under the sha-512 of the png it responds with",
    async (key) => {
      const [metadata] = await ogCardImageMetadata(key)
      const response = await ogCardResponse(key)
      const bytes = new Uint8Array(await response.arrayBuffer())

      expect(response.headers.get("content-type")).toBe("image/png")
      expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
      expect(metadata).toEqual({
        id: contentHash(bytes),
        alt: ogCards[key].alt,
        size: { width: 1200, height: 630 },
        contentType: "image/png",
      })
    }
  )

  it("renders the same bytes on every call, so the hashed name stays valid", async () => {
    const first = await renderOgCard("home")
    const { ogCard } = await import("@/lib/images/og-card")
    const again = new Uint8Array(
      await (await ogCard(ogCards.home)).arrayBuffer()
    )
    expect(contentHash(again)).toBe(contentHash(first))
  })
})
