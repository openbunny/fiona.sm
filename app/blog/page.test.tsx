/** @vitest-environment jsdom */

import { cleanup, screen, within } from "@testing-library/react"
import { renderToReadableStream } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { canary } from "@/lib/canary/canary"
import { BLOG_POSTS_PER_PAGE, type BlogPost } from "@/lib/blog/posts"
import type * as blogPosts from "@/lib/blog/posts"

const mockPosts = vi.hoisted(() => ({ current: [] as BlogPost[] }))

function makePosts(count: number): BlogPost[] {
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
    postsByNewest: (source?: readonly BlogPost[]) =>
      actual.postsByNewest(source ?? mockPosts.current),
    blogPageCount: (source?: readonly BlogPost[]) =>
      actual.blogPageCount(source ?? mockPosts.current),
    blogPostsForPage: (page: number, source?: readonly BlogPost[]) =>
      actual.blogPostsForPage(page, source ?? mockPosts.current),
  }
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
  mockPosts.current = []
})

async function renderBlogPage(): Promise<void> {
  const { default: BlogPage } = await import("@/app/blog/page")
  const stream = await renderToReadableStream(<BlogPage />)
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
}

describe("BlogPage", () => {
  it("opens with a blog heading", async () => {
    await renderBlogPage()

    expect(screen.getByRole("heading", { level: 1, name: "blog" })).toBeTruthy()
  })

  it("states plainly that nothing is published when the list is empty", async () => {
    await renderBlogPage()

    expect(screen.getByText("nothing published yet.")).toBeTruthy()
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("renders one entry per post, newest first, with a machine-readable date", async () => {
    mockPosts.current = [
      {
        slug: "first",
        title: "First post",
        date: "2026-01-05",
        href: "/blog/first",
      },
      {
        slug: "second",
        title: "Second post",
        date: "2026-06-15",
        href: "/blog/second",
      },
    ]

    await renderBlogPage()

    const main = screen.getByRole("main")
    const items = within(main).getAllByRole("listitem")
    expect(items).toHaveLength(2)

    const titles = within(main)
      .getAllByRole("link")
      .map((link) => link.textContent)
    expect(titles).toEqual(["/second", "/first"])

    const times = [...document.querySelectorAll("time")]
    expect(times).toHaveLength(2)
    expect(times[0]?.getAttribute("dateTime")).toBe("2026-06-15")
    expect(times[1]?.getAttribute("dateTime")).toBe("2026-01-05")
  })

  it("carries the blog plate masthead above the heading", async () => {
    await renderBlogPage()

    const plate = document.querySelector('img[src="/blog.gif"]')
    expect(plate).not.toBeNull()

    const heading = screen.getByRole("heading", { level: 1, name: "blog" })
    expect(
      plate?.compareDocumentPosition(heading) ??
        Node.DOCUMENT_POSITION_DISCONNECTED
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it("shows the site bar with blog current, home linked, and only the verify-posts entry", async () => {
    await renderBlogPage()

    const current = screen.getByText("blog", {
      selector: "span[aria-current]",
    })
    expect(current.getAttribute("aria-current")).toBe("page")

    expect(
      screen.getByRole("link", { name: "~/fiona.sm" }).getAttribute("href")
    ).toBe("/")

    const nav = screen.getByRole("navigation", {
      name: "path and directory listing",
    })
    const back = within(nav).getByRole("link", { name: /^up to / })
    expect(back).toHaveAttribute("href", "/")
    const entries = within(nav)
      .getAllByRole("link")
      .filter((entry) => entry !== back)
      .filter((entry) => entry.closest(".chip") === null)
    expect(entries.map((entry) => entry.textContent)).toEqual(["/verify-posts"])
  })

  it("carries the site footer's privacy and mail links", async () => {
    await renderBlogPage()

    expect(
      screen.getByRole("link", { name: "/privacy" }).getAttribute("href")
    ).toBe("/privacy")
    expect(
      screen.getByRole("link", { name: canary.email }).getAttribute("href")
    ).toBe(`mailto:${canary.email}`)
  })

  it("renders no pagination controls at exactly the page size", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE)

    await renderBlogPage()

    expect(
      screen.queryByRole("navigation", { name: "blog pagination" })
    ).toBeNull()
  })

  it("shows pagination naming the current page and the next page's link, with no previous link", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE + 1)

    await renderBlogPage()

    const pagination = screen.getByRole("navigation", {
      name: "blog pagination",
    })
    expect(within(pagination).getByText("page 1/2")).toBeTruthy()
    expect(
      within(pagination).queryByRole("link", { name: /^previous/ })
    ).toBeNull()
    const next = within(pagination).getByRole("link", { name: /^next/ })
    expect(next).toHaveAttribute("href", "/blog/page/2")
    expect(next).toHaveAttribute("aria-label", "next page 2")
    expect(next.textContent).toBe("p2")
  })

  it("gives the next link a chevron svg with no bare glyph text", async () => {
    mockPosts.current = makePosts(BLOG_POSTS_PER_PAGE + 1)

    await renderBlogPage()

    const pagination = screen.getByRole("navigation", {
      name: "blog pagination",
    })
    const next = within(pagination).getByRole("link", { name: /^next/ })
    const svg = next.querySelector("svg")
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute("aria-hidden", "true")
    expect(svg).toHaveAttribute("focusable", "false")
    expect(next.textContent).not.toMatch(/[‹›]/)
  })
})
