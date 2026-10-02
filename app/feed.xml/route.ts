import { posts, postsByNewest } from "@/lib/blog/posts"
import { canary } from "@/lib/canary/canary"
import { buildAtomFeed } from "@/lib/feed/atom"
import { isoDateMidnightUtc, nowIsoUtc } from "@/lib/iso-date"
import { absoluteUrl, site } from "@/lib/site/site"

export const dynamic = "force-static"

export function GET(): Response {
  const entries = postsByNewest(posts).map((post) => ({
    id: absoluteUrl(post.href),
    title: post.title,
    href: absoluteUrl(post.href),
    updated: isoDateMidnightUtc(post.date),
  }))

  const feed = buildAtomFeed({
    id: absoluteUrl("/"),
    title: site.name,
    href: absoluteUrl("/"),
    selfHref: absoluteUrl(site.feedPath),
    updated: entries[0]?.updated ?? nowIsoUtc(),
    authorName: site.name,
    authorEmail: canary.email,
    entries,
  })

  return new Response(feed)
}
