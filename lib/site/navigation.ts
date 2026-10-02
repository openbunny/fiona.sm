import { posts } from "@/lib/blog/posts"
import { canary } from "@/lib/canary/canary"

type PathSegment = {
  readonly label: string
  readonly href: string | null
}

type BarEntry = {
  readonly name: string
  readonly href: string
  readonly kind: "dir" | "file"
}

export type BarSpec = {
  readonly segments: readonly PathSegment[]
  readonly entries: readonly BarEntry[]
  readonly parentHref: string | null
}

const ROOT_LABEL = "~/fiona.sm"

export function linkLabel(route: string): string {
  return route === "/" ? ROOT_LABEL : route
}

const FILE_LABELS_BY_UNRESOLVABLE_HREF: ReadonlyMap<string, string> = new Map([
  ["/.well-known/security.txt", "/.well-known/security.txt"],
])

export function entryLabel(entry: BarEntry): string {
  if (entry.kind === "dir") {
    return linkLabel(entry.href)
  }
  return (
    FILE_LABELS_BY_UNRESOLVABLE_HREF.get(entry.href) ??
    linkLabel(`/${entry.name}`)
  )
}

function routeParts(route: string): readonly string[] {
  return route.split("/").filter((part) => part.length > 0)
}

const BLOG_PAGE_ROUTE_LENGTH = 3

function blogPageNumberFromParts(parts: readonly string[]): number | null {
  if (parts.length !== BLOG_PAGE_ROUTE_LENGTH) {
    return null
  }
  if (parts[0] !== "blog" || parts[1] !== "page") {
    return null
  }

  const pageNumber = Number(parts[2])
  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null
}

function segmentsFor(route: string): readonly PathSegment[] {
  const parts = routeParts(route)
  const blogPage = blogPageNumberFromParts(parts)
  if (blogPage !== null) {
    return [
      { label: ROOT_LABEL, href: "/" },
      { label: "blog", href: "/blog" },
      { label: `p${blogPage}`, href: null },
    ]
  }

  const segments: PathSegment[] = [
    { label: ROOT_LABEL, href: parts.length === 0 ? null : "/" },
  ]

  let builtHref = ""
  for (const [index, part] of parts.entries()) {
    builtHref += `/${part}`
    const isLast = index === parts.length - 1
    segments.push({ label: part, href: isLast ? null : builtHref })
  }

  return segments
}

function parentHrefFor(route: string): string | null {
  const parts = routeParts(route)
  if (blogPageNumberFromParts(parts) !== null) {
    return "/blog"
  }
  if (parts.length === 0) {
    return null
  }

  const parentParts = parts.slice(0, -1)
  return parentParts.length === 0 ? "/" : `/${parentParts.join("/")}`
}

const ROUTES_WITH_ENTRY_LISTINGS: ReadonlySet<string> = new Set([
  "/",
  "/blog",
  "/canary",
])

function entriesFor(route: string): readonly BarEntry[] {
  if (!ROUTES_WITH_ENTRY_LISTINGS.has(route)) {
    return []
  }

  switch (route) {
    case "/": {
      const rootEntries: BarEntry[] = []
      if (posts.length > 0) {
        rootEntries.push({ name: "blog", href: "/blog", kind: "dir" })
      }
      rootEntries.push({ name: "canary", href: "/canary", kind: "dir" })
      return rootEntries
    }
    case "/blog":
      return [
        { name: "verify-posts", href: "/blog/verify-posts", kind: "file" },
      ]
    case "/canary":
      return [
        { name: "canary.asc", href: canary.statementHref, kind: "file" },
        { name: "fiona.asc", href: canary.publicKeyHref, kind: "file" },
        {
          name: "security.txt",
          href: "/.well-known/security.txt",
          kind: "file",
        },
        { name: "llms.txt", href: "/llms.txt", kind: "file" },
      ]
    default:
      return []
  }
}

export function barSpecFor(route: string): BarSpec {
  return {
    segments: segmentsFor(route),
    entries: entriesFor(route),
    parentHref: parentHrefFor(route),
  }
}
