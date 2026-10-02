import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import { metadata, routeSocialMetadata } from "@/lib/site/metadata"
import { site } from "@/lib/site/site"

describe("metadata robots", () => {
  it("refuses indexing and following, and is not restated loosely", () => {
    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
        "max-snippet": -1,
        "max-image-preview": "none",
        "max-video-preview": -1,
      },
    })
  })

  it("is not indexable, tested so that index cannot satisfy the test", () => {
    const robots = metadata.robots
    expect(robots).not.toBeNull()
    expect(typeof robots).toBe("object")
    const directives = robots as Extract<typeof robots, { index?: unknown }>
    expect(directives.index).toBe(false)
    expect(directives.follow).toBe(false)
  })
})

describe("metadata alternates", () => {
  it("claims this origin as canonical and nothing else", () => {
    expect(metadata.alternates?.canonical).toBe("/")
  })

  it("points the key and statement types at this site's own paths", () => {
    expect(metadata.alternates?.types).toEqual({
      "application/pgp-keys": canary.publicKeyHref,
      "text/plain": canary.statementHref,
    })
  })
})

describe("metadata pgp:fingerprint", () => {
  it("republishes the fingerprint the canary attests to, not a copy", () => {
    expect(metadata.other?.["pgp:fingerprint"]).toBe(canary.fingerprint)
  })

  it("is a full forty-character fingerprint, so an empty one fails", () => {
    expect(metadata.other?.["pgp:fingerprint"]).toMatch(/^[0-9A-F]{40}$/)
  })
})

describe("metadata referrer and format detection", () => {
  it("sends no path or query cross-origin", () => {
    expect(metadata.referrer).toBe("strict-origin-when-cross-origin")
  })

  it("leaves the address and the fingerprint as plain text", () => {
    expect(metadata.formatDetection).toEqual({
      email: false,
      address: false,
      telephone: false,
    })
  })
})

describe("metadata origin", () => {
  it("resolves relative metadata against this site's own origin", () => {
    expect(metadata.metadataBase?.toString()).toBe(`${site.url}/`)
  })
})

describe("home openGraph", () => {
  it("identifies fiona as a profile at the site root", () => {
    expect(metadata.openGraph).toMatchObject({
      type: "profile",
      url: site.url,
      title: site.homeTitle,
    })
  })

  it("keeps the site name as fiona, distinct from the home title", () => {
    expect(metadata.openGraph?.siteName).toBe(site.name)
    expect(site.name).toBe("fiona")
  })
})

describe("routeSocialMetadata", () => {
  it("builds a route's own og:title, og:url, and og:type", () => {
    const result = routeSocialMetadata({
      title: "privacy",
      description:
        "what this site records about a visit, and what it does not.",
      path: "/privacy",
      type: "website",
    })

    expect(result.openGraph).toMatchObject({
      type: "website",
      url: `${site.url}/privacy`,
      title: "privacy",
      description:
        "what this site records about a visit, and what it does not.",
    })
  })

  it("tags a post as an article rather than the site-wide profile", () => {
    const result = routeSocialMetadata({
      title: "a quiet canary is usually an accident",
      description: "the arithmetic, worked with bayes' rule.",
      path: "/blog/tickerbox-cli",
      type: "article",
    })

    expect(result.openGraph).toMatchObject({ type: "article" })
  })

  it("still carries the site-wide fields a route override must not drop", () => {
    const result = routeSocialMetadata({
      title: "privacy",
      description:
        "what this site records about a visit, and what it does not.",
      path: "/privacy",
      type: "website",
    })

    expect(result.openGraph?.siteName).toBe(site.name)
    expect(result.openGraph?.locale).toBe(site.locale)
  })
})
