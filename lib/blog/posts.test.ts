import { describe, expect, it } from "vitest"

import {
  BLOG_POSTS_PER_PAGE,
  blogPageCount,
  blogPageHref,
  blogPostsForPage,
  postBySlug,
  postsByNewest,
  posts,
  type BlogPost,
} from "@/lib/blog/posts"
import { TICKERBOX_CLI_PLATE } from "@/lib/images/plates"

function makePosts(count: number): readonly BlogPost[] {
  return Array.from({ length: count }, (_, index) => ({
    slug: `post-${index}`,
    title: `Post ${index}`,
    date: `2026-01-${String(index + 1).padStart(2, "0")}`,
    href: `/blog/post-${index}`,
  }))
}

describe("posts", () => {
  it("registers the tickerbox-cli post", () => {
    expect(posts).toContainEqual({
      slug: "tickerbox-cli",
      title: "tickerbox-cli",
      date: "2026-10-01",
      href: "/blog/tickerbox-cli",
      artwork: TICKERBOX_CLI_PLATE,
    })
  })
})

describe("postBySlug", () => {
  const first: BlogPost = {
    slug: "first",
    title: "First",
    date: "2026-01-01",
    href: "/blog/first",
  }
  const second: BlogPost = {
    slug: "second",
    title: "Second",
    date: "2026-02-01",
    href: "/blog/second",
    artwork: TICKERBOX_CLI_PLATE,
  }
  const source = [first, second]

  it("finds a post by its slug", () => {
    expect(postBySlug("second", source)).toEqual(second)
  })

  it("returns undefined for a slug that is not in the source", () => {
    expect(postBySlug("missing", source)).toBeUndefined()
  })

  it("defaults to the exported posts array", () => {
    expect(postBySlug("tickerbox-cli")).toEqual(
      postBySlug("tickerbox-cli", posts)
    )
  })
})

describe("postsByNewest", () => {
  it("returns an empty array for an empty source", () => {
    expect(postsByNewest([])).toEqual([])
  })

  it("orders posts newest-first by date", () => {
    const oldest: BlogPost = {
      slug: "oldest",
      title: "Oldest",
      date: "2026-01-01",
      href: "/blog/oldest",
    }
    const middle: BlogPost = {
      slug: "middle",
      title: "Middle",
      date: "2026-06-15",
      href: "/blog/middle",
    }
    const newest: BlogPost = {
      slug: "newest",
      title: "Newest",
      date: "2026-09-01",
      href: "/blog/newest",
    }

    expect(postsByNewest([oldest, newest, middle])).toEqual([
      newest,
      middle,
      oldest,
    ])
  })

  it("does not mutate the source array", () => {
    const first: BlogPost = {
      slug: "first",
      title: "First",
      date: "2026-01-01",
      href: "/blog/first",
    }
    const second: BlogPost = {
      slug: "second",
      title: "Second",
      date: "2026-02-01",
      href: "/blog/second",
    }
    const source = [first, second]

    postsByNewest(source)

    expect(source).toEqual([first, second])
  })

  it("defaults to the exported posts array", () => {
    expect(postsByNewest()).toEqual(postsByNewest(posts))
  })
})

describe("blogPageCount", () => {
  it("is one page for zero posts", () => {
    expect(blogPageCount([])).toBe(1)
  })

  it("is one page for exactly the page size", () => {
    expect(blogPageCount(makePosts(BLOG_POSTS_PER_PAGE))).toBe(1)
  })

  it("is two pages for one more than the page size", () => {
    expect(blogPageCount(makePosts(BLOG_POSTS_PER_PAGE + 1))).toBe(2)
  })
})

describe("blogPageHref", () => {
  it("points page one at /blog", () => {
    expect(blogPageHref(1)).toBe("/blog")
  })

  it("points every later page at /blog/page/<n>", () => {
    expect(blogPageHref(2)).toBe("/blog/page/2")
    expect(blogPageHref(3)).toBe("/blog/page/3")
  })
})

describe("blogPostsForPage", () => {
  it("returns an empty page one when there are no posts", () => {
    expect(blogPostsForPage(1, [])).toEqual([])
  })

  it("returns every post on the single page at exactly the page size", () => {
    const source = makePosts(BLOG_POSTS_PER_PAGE)
    expect(blogPostsForPage(1, source)).toEqual(postsByNewest(source))
  })

  it("splits one more than the page size across two pages", () => {
    const source = makePosts(BLOG_POSTS_PER_PAGE + 1)
    const ordered = postsByNewest(source)

    const firstPage = blogPostsForPage(1, source)
    const secondPage = blogPostsForPage(2, source)

    expect(firstPage).toEqual(ordered.slice(0, BLOG_POSTS_PER_PAGE))
    expect(firstPage).toHaveLength(BLOG_POSTS_PER_PAGE)
    expect(secondPage).toEqual(ordered.slice(BLOG_POSTS_PER_PAGE))
    expect(secondPage).toHaveLength(1)
  })

  it("fails an out-of-range page rather than returning an empty list", () => {
    const source = makePosts(BLOG_POSTS_PER_PAGE + 1)

    expect(blogPostsForPage(0, source)).toBeNull()
    expect(blogPostsForPage(-1, source)).toBeNull()
    expect(blogPostsForPage(3, source)).toBeNull()
    expect(blogPostsForPage(1.5, source)).toBeNull()
  })

  it("fails page two once there is only one page", () => {
    expect(blogPostsForPage(2, [])).toBeNull()
    expect(blogPostsForPage(2, makePosts(BLOG_POSTS_PER_PAGE))).toBeNull()
  })

  it("defaults to the exported posts array", () => {
    expect(blogPostsForPage(1)).toEqual(blogPostsForPage(1, posts))
  })
})
