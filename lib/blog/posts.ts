import {
  HOMEBREW_TAP_PLATE,
  OPENBUNNY_BULK_RELEASE_PLATE,
  type PlateAsset,
  TICKERBOX_CLI_PLATE,
  WORMS_WMD_PLATE,
} from "@/lib/images/plates"

export type BlogPost = {
  readonly slug: string
  readonly title: string
  readonly date: string
  readonly href: string
  readonly artwork?: PlateAsset
}

export const posts: readonly BlogPost[] = [
  {
    slug: "worms-wmd",
    title: "playing worms on my macbook",
    date: "2026-10-06",
    href: "/blog/worms-wmd",
    artwork: WORMS_WMD_PLATE,
  },
  {
    slug: "openbunny-bulk-release",
    title: "safari extensions, component libraries and this site's source",
    date: "2026-10-02",
    href: "/blog/openbunny-bulk-release",
    artwork: OPENBUNNY_BULK_RELEASE_PLATE,
  },
  {
    slug: "homebrew-tap",
    title: "custom homebrew tap",
    date: "2026-10-02",
    href: "/blog/homebrew-tap",
    artwork: HOMEBREW_TAP_PLATE,
  },
  {
    slug: "tickerbox-cli",
    title: "tickerbox-cli",
    date: "2026-10-01",
    href: "/blog/tickerbox-cli",
    artwork: TICKERBOX_CLI_PLATE,
  },
]

export function postsByNewest(
  source: readonly BlogPost[] = posts
): readonly BlogPost[] {
  return [...source].sort((a, b) => b.date.localeCompare(a.date))
}

export function requirePostBySlug(slug: string): BlogPost {
  const found = postBySlug(slug)
  if (found === undefined) {
    throw new Error(
      `lib/blog/posts.ts publishes no post with the slug "${slug}", so a route that names it has no date, artwork or citation to render. Add it to posts, or delete that route.`
    )
  }

  return found
}

export function postBySlug(
  slug: string,
  source: readonly BlogPost[] = posts
): BlogPost | undefined {
  return source.find((post) => post.slug === slug)
}

export const BLOG_POSTS_PER_PAGE = 15

export function blogPageCount(source: readonly BlogPost[] = posts): number {
  return Math.max(1, Math.ceil(source.length / BLOG_POSTS_PER_PAGE))
}

export function blogPageHref(page: number): string {
  return page === 1 ? "/blog" : `/blog/page/${page}`
}

export function blogPostsForPage(
  page: number,
  source: readonly BlogPost[] = posts
): readonly BlogPost[] | null {
  const pageCount = blogPageCount(source)
  if (!Number.isInteger(page) || page < 1 || page > pageCount) {
    return null
  }

  const start = (page - 1) * BLOG_POSTS_PER_PAGE
  return postsByNewest(source).slice(start, start + BLOG_POSTS_PER_PAGE)
}
