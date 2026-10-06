/** @vitest-environment jsdom */

import { cleanup, screen, within } from "@testing-library/react"
import { renderToReadableStream } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BLOG_POSTS_PER_PAGE } from "@/lib/blog/posts"
import type * as blogPosts from "@/lib/blog/posts"

import BlogPageByNumber, {
  generateMetadata,
  generateStaticParams,
} from "./page"

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404"

const mockPosts = vi.hoisted(() => ({ current: [] as blogPosts.BlogPost[] }))

function makePosts(count: number): blogPosts.BlogPost[] {
  return Array.from({ length: count }, (_, index) => ({
    slug: `post-${index}`,
    title: `Post ${index}`,
    date: `2026-01-${String(index + 1).padStart(2, "0")}`,
    href: `/blog/post-${index}`,
  }))
}

vi.mock("@/lib/blog/posts", async () => {
  const actual = await vi.importActual<typeof blogPosts>("@/lib/blog/posts")
  return {
    ...actual,
    get posts() {
      return mockPosts.current
    },
    postsByNewest: (source?: readonly blogPosts.BlogPost[]) =>
      actual.postsByNewest(source ?? mockPosts.current),
    blogPageCount: (source?: readonly blogPosts.BlogPost[]) =>
      actual.blogPageCount(source ?? mockPosts.current),
    blogPostsForPage: (page: number, source?: readonly blogPosts.BlogPost[]) =>
      actual.blogPostsForPage(page, source ?? mockPosts.current),
  }
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
  mockPosts.current = []
})

async function renderPage(page: string): Promise<void> {
  const element = await BlogPageByNumber({
    params: Promise.resolve({ page }),
  })
  const stream = await renderToReadableStream(element)
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
}

describe("BlogPageByNumber with two pages", () => {
  it("carries the blog plate masthead, the same one /blog uses", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE + 1)
    await renderPage("2")

    expect(screen.queryByRole("img")).toBeNull()
    expect(document.querySelector('img[src="/blog.gif"]')).not.toBeNull()
  })

  it("renders the leftover post on the last page", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE + 1)
    await renderPage("2")

    const main = screen.getByRole("main")
    expect(within(main).getAllByRole("listitem")).toHaveLength(1)
  })

  it("shows pagination naming the current page and a link back, with no next link", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE + 1)
    await renderPage("2")

    const pagination = screen.getByRole("navigation", {
      name: "blog pagination",
    })
    expect(within(pagination).getByText("page 2/2")).toBeTruthy()

    const previous = within(pagination).getByRole("link", {
      name: /^previous/,
    })
    expect(previous).toHaveAttribute("href", "/blog")
    expect(previous).toHaveAttribute("aria-label", "previous page 1")
    expect(previous.textContent).toBe("p1")

    expect(within(pagination).queryByRole("link", { name: /^next/ })).toBeNull()
  })

  it("gives the previous link a chevron svg with no bare glyph text", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE + 1)
    await renderPage("2")

    const pagination = screen.getByRole("navigation", {
      name: "blog pagination",
    })
    const previous = within(pagination).getByRole("link", {
      name: /^previous/,
    })
    const svg = previous.querySelector("svg")
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute("aria-hidden", "true")
    expect(svg).toHaveAttribute("focusable", "false")
    expect(previous.textContent).not.toMatch(/[‹›]/)
  })

  it("shows the site bar with the page current and blog linked", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE + 1)
    await renderPage("2")

    expect(
      screen.getByRole("link", { name: "blog" }).getAttribute("href")
    ).toBe("/blog")

    const current = screen.getByText("p2")
    expect(current.tagName.toLowerCase()).toBe("span")
    expect(current.getAttribute("aria-current")).toBe("page")

    const back = screen.getByRole("link", { name: /^up to / })
    expect(back).toHaveAttribute("href", "/blog")
  })
})

describe("BlogPageByNumber given an out-of-range page", () => {
  it("fails honestly instead of rendering an empty page", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE + 1)

    await expect(
      BlogPageByNumber({ params: Promise.resolve({ page: "5" }) })
    ).rejects.toMatchObject({ digest: NOT_FOUND_DIGEST })
  })

  it("fails honestly for a page number that is not a positive integer", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE + 1)

    await expect(
      BlogPageByNumber({ params: Promise.resolve({ page: "abc" }) })
    ).rejects.toMatchObject({ digest: NOT_FOUND_DIGEST })
    await expect(
      BlogPageByNumber({ params: Promise.resolve({ page: "0" }) })
    ).rejects.toMatchObject({ digest: NOT_FOUND_DIGEST })
  })
})

describe("generateStaticParams", () => {
  it("generates the page-one redirect target when the whole list fits", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE)

    expect(await generateStaticParams()).toEqual([{ page: "1" }])
  })

  it("generates every page, including the page-one redirect target", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE * 2 + 1)

    expect(await generateStaticParams()).toEqual([
      { page: "1" },
      { page: "2" },
      { page: "3" },
    ])
  })
})

describe("generateMetadata", () => {
  it("names the page in the title and canonical url", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE + 1)

    const metadata = await generateMetadata({
      params: Promise.resolve({ page: "2" }),
    })

    expect(metadata.title).toEqual({ absolute: "fiona's blog — page 2" })
    expect(metadata.alternates).toMatchObject({ canonical: "/blog/page/2" })
  })
})
