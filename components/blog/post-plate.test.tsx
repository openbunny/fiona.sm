/** @vitest-environment jsdom */

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { BlogPost } from "@/lib/blog/posts"
import type * as blogPosts from "@/lib/blog/posts"

const fixtureArtwork = {
  animatedSrc: "/post-art/with-art.gif",
  staticSrc: "/post-art/with-art-static.png",
  width: 400,
  height: 300,
}

const fixturePosts: readonly BlogPost[] = [
  {
    slug: "with-art",
    title: "With art",
    date: "2026-01-01",
    href: "/blog/with-art",
    artwork: fixtureArtwork,
  },
  {
    slug: "without-art",
    title: "Without art",
    date: "2026-01-02",
    href: "/blog/without-art",
  },
]

vi.mock("@/lib/blog/posts", async () => {
  const actual = await vi.importActual<typeof blogPosts>("@/lib/blog/posts")
  return {
    ...actual,
    postBySlug: (slug: string) =>
      fixturePosts.find((post) => post.slug === slug),
  }
})

afterEach(() => {
  cleanup()
})

describe("PostPlate", () => {
  it("renders the declared artwork, swapping to its still frame under reduced motion", async () => {
    const { PostPlate } = await import("@/components/blog/post-plate")
    const { container } = render(<PostPlate slug="with-art" />)

    const images = [...container.querySelectorAll("picture > img")]
    expect(images).toHaveLength(1)
    expect(images[0]).toHaveAttribute("src", fixtureArtwork.animatedSrc)
    expect(
      container.querySelector(
        'picture > source[media="(prefers-reduced-motion: reduce)"]'
      )
    ).toHaveAttribute("srcset", fixtureArtwork.staticSrc)
  })

  it("renders nothing for a post with no declared artwork", async () => {
    const { PostPlate } = await import("@/components/blog/post-plate")
    const { container } = render(<PostPlate slug="without-art" />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing for a slug with no post at all", async () => {
    const { PostPlate } = await import("@/components/blog/post-plate")
    const { container } = render(<PostPlate slug="no-such-post" />)

    expect(container).toBeEmptyDOMElement()
  })
})
