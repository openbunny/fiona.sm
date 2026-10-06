import { describe, expect, it } from "vitest"

import * as plates from "@/lib/images/plates"
import { routeHeaders } from "@/lib/site/route-headers"

const cacheControlOf = (source: string): string =>
  routeHeaders
    .filter((rule) => rule.source === source)
    .flatMap((rule) => rule.headers)
    .find((header) => header.key === "Cache-Control")?.value ?? ""

const contentTypeOf = (source: string): string =>
  routeHeaders
    .filter((rule) => rule.source === source)
    .flatMap((rule) => rule.headers)
    .find((header) => header.key === "Content-Type")?.value ?? ""

const everyCacheRule = routeHeaders
  .flatMap((rule) =>
    rule.headers.map((header) => ({ source: rule.source, header }))
  )
  .filter(({ header }) => header.key === "Cache-Control")

const iconAssets = "/:asset(favicon\\.ico|manifest\\.webmanifest)"

const contentAddressed = ["/posts/:slug/:digest.txt", "/img/:name"]

describe("route cache policy", () => {
  it.each(["/", "/privacy", "/canary", "/blog", "/blog/tickerbox-cli"])(
    "never serves the %s document from a stale cache",
    (source) => {
      const document = cacheControlOf(source)

      expect(document).toBe("public, max-age=0, s-maxage=60, must-revalidate")
      expect(document).not.toContain("stale-while-revalidate")
    }
  )

  it("allows stale-while-revalidate only on the fixed-URL icons", () => {
    const stale = everyCacheRule
      .filter(({ header }) => header.value.includes("stale-while-revalidate"))
      .map(({ source }) => source)

    expect(stale).toEqual([iconAssets])
  })

  it("requires revalidation on every rule but the icons and the content-addressed one", () => {
    const withoutRevalidation = everyCacheRule
      .filter(({ source }) => source !== iconAssets)
      .filter(({ header }) => !header.value.includes("must-revalidate"))
      .map(({ source }) => source)

    expect(withoutRevalidation).toEqual(contentAddressed)
  })

  it("allows immutable only where the url names the digest of what it serves", () => {
    const immutable = everyCacheRule
      .filter(({ header }) => header.value.includes("immutable"))
      .map(({ source }) => source)

    expect(immutable).toEqual(contentAddressed)
  })

  it("declares no cache lifetime for a canary date that may not exist", () => {
    const dated = cacheControlOf("/canary/:date.asc")

    expect(dated).toBe("public, max-age=0, must-revalidate")
    expect(dated).not.toContain("immutable")
    expect(dated).not.toMatch(/max-age=[1-9]/u)
    expect(dated).not.toContain("s-maxage")
  })

  it("keeps a lifetime on the fixed URLs that always resolve", () => {
    expect(cacheControlOf("/canary.asc")).toBe(
      "public, max-age=300, must-revalidate"
    )
    expect(cacheControlOf("/fiona.asc")).toBe(
      "public, max-age=300, must-revalidate"
    )
    expect(cacheControlOf("/posts.asc")).toBe(
      "public, max-age=300, must-revalidate"
    )
    expect(cacheControlOf("/posts/:slug.txt")).toBe(
      "public, max-age=300, must-revalidate"
    )
  })

  it("serves the clearsigned post manifest as plain text, not a detached signature", () => {
    expect(contentTypeOf("/posts.asc")).toBe("text/plain; charset=utf-8")
  })

  it("serves each post's published article text as plain text, the same as the manifest", () => {
    expect(contentTypeOf("/posts/:slug.txt")).toBe("text/plain; charset=utf-8")
  })

  it("caches every plate immutably, since each file name is the digest of its content", () => {
    const files = Object.values(plates).flatMap((plate) => [
      plate.animatedSrc,
      plate.staticSrc,
    ])
    expect(
      files.length,
      "no plate was discovered, so this test would pass having checked nothing"
    ).toBeGreaterThanOrEqual(16)

    for (const file of files) {
      expect(file).toMatch(/^\/img\/[0-9a-f]{128}\.(webp|png)$/u)
    }
    expect(cacheControlOf("/img/:name")).toBe(
      "public, max-age=31536000, immutable"
    )
  })
})

describe("the feed route", () => {
  it("declares an atom content type, since next infers none for a route handler", () => {
    expect(contentTypeOf("/feed.xml")).toBe(
      "application/atom+xml; charset=utf-8"
    )
  })

  it("shares the home page's revalidation cadence, not a long-lived asset ttl", () => {
    const feed = cacheControlOf("/feed.xml")

    expect(feed).toBe("public, max-age=0, s-maxage=60, must-revalidate")
    expect(feed).not.toContain("stale-while-revalidate")
  })
})

describe("cross-origin reads of the web key directory", () => {
  it("relaxes the embed policy on the two web key directory paths only", () => {
    const relaxed = routeHeaders
      .filter((rule) =>
        rule.headers.some(
          (header) =>
            header.key === "Cross-Origin-Resource-Policy" &&
            header.value === "cross-origin"
        )
      )
      .map((rule) => rule.source)

    expect(relaxed).toEqual([
      "/.well-known/openpgpkey/hu/:hash",
      "/.well-known/openpgpkey/policy",
    ])
  })

  it("reads freely on exactly those paths, and nowhere else", () => {
    const readable = routeHeaders
      .filter((rule) =>
        rule.headers.some(
          (header) =>
            header.key === "Access-Control-Allow-Origin" && header.value === "*"
        )
      )
      .map((rule) => rule.source)

    expect(readable).toEqual([
      "/.well-known/openpgpkey/hu/:hash",
      "/.well-known/openpgpkey/policy",
    ])
  })
})

describe("the archived revision route", () => {
  it("serves an archived revision as plain text, the same as the current one", () => {
    expect(contentTypeOf("/posts/:slug/:digest.txt")).toBe(
      "text/plain; charset=utf-8"
    )
  })

  it("caches an archived revision forever, since its name is its own digest", () => {
    const archived = cacheControlOf("/posts/:slug/:digest.txt")

    expect(archived).toContain("immutable")
    expect(archived).toContain("max-age=31536000")
  })
})
