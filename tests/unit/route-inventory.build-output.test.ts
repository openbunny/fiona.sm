import { existsSync, readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { blogPageCount, posts } from "@/lib/blog/posts"
import {
  isOgCardKey,
  ogCardImageMetadata,
  type OgCardKey,
} from "@/lib/images/og-cards"

const PRERENDER_MANIFEST = ".next/prerender-manifest.json"
const ROUTES_MANIFEST = ".next/routes-manifest.json"

const ROUTES_INDEPENDENT_OF_POST_COUNT: readonly string[] = [
  "/",
  "/_global-error",
  "/_not-found",
  "/blog",
  "/blog/verify-posts",
  "/canary",
  "/favicon.ico",
  "/feed.xml",
  "/manifest.webmanifest",
  "/privacy",
  "/robots.txt",
]

const POST_ROUTES: readonly string[] = posts.map((post) => post.href)

const CARD_ROUTES: readonly (readonly [string, OgCardKey])[] = [
  ["", "home"],
  ["/blog", "blog"],
  ["/canary", "canary"],
  ...posts.map((post): readonly [string, OgCardKey] => {
    if (!isOgCardKey(post.slug)) {
      throw new Error(
        `lib/images/og-cards.ts declares no share card for the post "${post.slug}". Add one.`
      )
    }
    return [post.href, post.slug]
  }),
]

const CARD_TEMPLATES: readonly string[] = CARD_ROUTES.flatMap(([prefix]) => [
  `${prefix}/opengraph-image/[__metadata_id__]`,
])

const RENDERED_CARDS: readonly string[] = (
  await Promise.all(
    CARD_ROUTES.map(async ([prefix, key]) => {
      const cards = await ogCardImageMetadata(key)
      return cards.map(({ id }) => `${prefix}/opengraph-image/${id}`)
    })
  )
).flat()

const PAGINATION_ROUTES: readonly string[] = Array.from(
  { length: blogPageCount() },
  (_, index) => `/blog/page/${index + 1}`
)

const EXPECTED_ROUTES: readonly string[] = [
  ...ROUTES_INDEPENDENT_OF_POST_COUNT,
  ...POST_ROUTES,
  ...PAGINATION_ROUTES,
  ...RENDERED_CARDS,
].sort()

const EXPECTED_STATIC_TABLE_ROUTES: readonly string[] = [
  ...ROUTES_INDEPENDENT_OF_POST_COUNT,
  ...POST_ROUTES,
].sort()

const EXPECTED_DYNAMIC_ROUTE_TEMPLATES: readonly string[] = [
  "/blog/page/[page]",
  ...CARD_TEMPLATES,
].sort()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
}

function readKey(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined
}

function requireBuildOutput(file: string, exists: boolean): void {
  if (!exists) {
    throw new Error(
      `${file} does not exist. This test asserts the route inventory of a production build, so it has nothing to check without one: run \`bun run build\` first. In \`bun run check\` and in CI a build always precedes it, so a missing manifest is a real failure rather than a reason to skip.`
    )
  }
}

function readPrerenderManifest(): unknown {
  requireBuildOutput(PRERENDER_MANIFEST, existsSync(PRERENDER_MANIFEST))
  const parsed: unknown = JSON.parse(readFileSync(PRERENDER_MANIFEST, "utf8"))
  return parsed
}

function readRoutesManifest(): unknown {
  requireBuildOutput(ROUTES_MANIFEST, existsSync(ROUTES_MANIFEST))
  const parsed: unknown = JSON.parse(readFileSync(ROUTES_MANIFEST, "utf8"))
  return parsed
}

function prerenderedRoutes(manifest: unknown): readonly string[] {
  const routes = readKey(manifest, "routes")
  if (!isRecord(routes)) {
    throw new Error(`${PRERENDER_MANIFEST} has no \`routes\` mapping.`)
  }
  return Object.keys(routes).sort()
}

function staticRoutePages(manifest: unknown): readonly string[] {
  const staticRoutes = readKey(manifest, "staticRoutes")
  if (!isUnknownArray(staticRoutes)) {
    throw new Error(`${ROUTES_MANIFEST} has no \`staticRoutes\` array.`)
  }

  const pages: string[] = []
  for (const entry of staticRoutes) {
    const page = readKey(entry, "page")
    if (typeof page === "string") {
      pages.push(page)
    }
  }
  return pages.sort()
}

function dynamicRoutePages(manifest: unknown): readonly string[] {
  const dynamicRoutes = readKey(manifest, "dynamicRoutes")
  if (!isUnknownArray(dynamicRoutes)) {
    throw new Error(`${ROUTES_MANIFEST} has no \`dynamicRoutes\` array.`)
  }

  const pages: string[] = []
  for (const entry of dynamicRoutes) {
    const page = readKey(entry, "page")
    if (typeof page === "string") {
      pages.push(page)
    }
  }
  return pages.sort()
}

describe("route inventory", () => {
  it("prerenders exactly the routes this site declares, and no others", () => {
    expect(prerenderedRoutes(readPrerenderManifest())).toStrictEqual([
      ...EXPECTED_ROUTES,
    ])
  })

  it("registers exactly those routes in the router's static table", () => {
    expect(staticRoutePages(readRoutesManifest())).toStrictEqual([
      ...EXPECTED_STATIC_TABLE_ROUTES,
    ])
  })

  it("declares only the pagination and share card templates as dynamic routes, fully enumerated at build time", () => {
    const prerender = readPrerenderManifest()
    const routes = readRoutesManifest()

    const prerenderDynamicRoutes = readKey(prerender, "dynamicRoutes")
    expect(Object.keys(prerenderDynamicRoutes ?? {}).sort()).toStrictEqual([
      ...EXPECTED_DYNAMIC_ROUTE_TEMPLATES,
    ])
    for (const template of EXPECTED_DYNAMIC_ROUTE_TEMPLATES) {
      const entry = readKey(prerenderDynamicRoutes, template)
      expect(readKey(entry, "fallback")).toBe(false)
    }

    expect(dynamicRoutePages(routes)).toStrictEqual([
      ...EXPECTED_DYNAMIC_ROUTE_TEMPLATES,
    ])

    expect(readKey(routes, "dataRoutes")).toStrictEqual([])
  })

  it("computes every route at build time, with no revalidation window", () => {
    const routes = readKey(readPrerenderManifest(), "routes")

    const observed = EXPECTED_ROUTES.map((route) => {
      const entry = readKey(routes, route)
      return [
        route,
        readKey(entry, "compute"),
        readKey(entry, "initialRevalidateSeconds"),
      ]
    })

    expect(observed).toStrictEqual(
      EXPECTED_ROUTES.map((route) => [route, "static", false])
    )
  })
})
