/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SiteBar } from "@/components/site-bar"
import { postsByNewest } from "@/lib/blog/posts"

afterEach(() => {
  cleanup()
})

function backLink(): HTMLElement | null {
  return screen.queryByRole("link", { name: /^up to / })
}

describe("SiteBar on /", () => {
  it("marks ~/fiona.sm current, with no parent to link", () => {
    render(<SiteBar route="/" />)

    const current = screen.getByText("~/fiona.sm")
    expect(current.tagName.toLowerCase()).toBe("span")
    expect(current.getAttribute("aria-current")).toBe("page")
    expect(screen.queryByRole("link", { name: "~/fiona.sm" })).toBeNull()
  })

  it("lists blog and canary as directories, in that order", () => {
    render(<SiteBar route="/" />)

    const nav = screen.getByRole("navigation")
    const entries = within(nav).getAllByRole("link")
    expect(entries.map((entry) => entry.textContent)).toEqual([
      "/blog",
      "/canary",
    ])
    expect(entries[0]).toHaveAttribute("href", "/blog")
    expect(entries[1]).toHaveAttribute("href", "/canary")
  })

  it("omits the back control entirely: no root has a parent", () => {
    render(<SiteBar route="/" />)

    expect(backLink()).toBeNull()
  })
})

describe("SiteBar on /canary", () => {
  it("links ~/fiona.sm and marks canary current", () => {
    render(<SiteBar route="/canary" />)

    const root = screen.getByRole("link", { name: "~/fiona.sm" })
    expect(root).toHaveAttribute("href", "/")

    const current = screen.getByText("canary")
    expect(current.tagName.toLowerCase()).toBe("span")
    expect(current.getAttribute("aria-current")).toBe("page")
  })

  it("lists the four published files as leaves, statement first", () => {
    render(<SiteBar route="/canary" />)

    const nav = screen.getByRole("navigation")
    const entries = within(nav)
      .getAllByRole("link")
      .filter((entry) => entry.getAttribute("aria-label") === null)
      .filter((entry) => entry.closest(".chip") === null)
    expect(entries.map((entry) => entry.textContent)).toEqual([
      "/canary.asc",
      "/fiona.asc",
      "/.well-known/security.txt",
      "/llms.txt",
    ])
    expect(entries.map((entry) => entry.getAttribute("href"))).toEqual([
      "/canary.asc",
      "/fiona.asc",
      "/.well-known/security.txt",
      "/llms.txt",
    ])
  })

  it("points the back control at / with a destination-naming label", () => {
    render(<SiteBar route="/canary" />)

    const back = backLink()
    expect(back).not.toBeNull()
    expect(back).toHaveAttribute("href", "/")
    expect(back).toHaveAttribute("aria-label", "up to ~/fiona.sm")
  })
})

describe("SiteBar on /blog", () => {
  it("links ~/fiona.sm and marks blog current", () => {
    render(<SiteBar route="/blog" />)

    expect(screen.getByRole("link", { name: "~/fiona.sm" })).toHaveAttribute(
      "href",
      "/"
    )
    const current = screen.getByText("blog")
    expect(current.getAttribute("aria-current")).toBe("page")
  })

  it("lists no posts: /blog lists only the verify-posts file, never a post slug", () => {
    render(<SiteBar route="/blog" />)

    const nav = screen.getByRole("navigation")
    const entries = within(nav)
      .getAllByRole("link")
      .filter((entry) => entry.getAttribute("aria-label") === null)
      .filter((entry) => entry.closest(".chip") === null)
    expect(entries.map((entry) => entry.textContent)).toEqual(["/verify-posts"])
    for (const post of postsByNewest()) {
      expect(screen.queryByText(post.slug)).toBeNull()
    }
  })

  it("points the back control at /", () => {
    render(<SiteBar route="/blog" />)

    expect(backLink()).toHaveAttribute("href", "/")
    expect(backLink()).toHaveAttribute("aria-label", "up to ~/fiona.sm")
  })

  it("carries no machine files from the canary route", () => {
    render(<SiteBar route="/blog" />)

    for (const name of [
      "fiona.asc",
      "canary.asc",
      "security.txt",
      "llms.txt",
    ]) {
      expect(screen.queryByText(name)).toBeNull()
    }
  })
})

describe("SiteBar on /privacy", () => {
  it("links ~/fiona.sm and marks privacy current, with no children", () => {
    render(<SiteBar route="/privacy" />)

    expect(screen.getByRole("link", { name: "~/fiona.sm" })).toHaveAttribute(
      "href",
      "/"
    )
    expect(screen.getByText("privacy").getAttribute("aria-current")).toBe(
      "page"
    )

    const nav = screen.getByRole("navigation")
    const entries = within(nav)
      .getAllByRole("link")
      .filter((entry) => entry.getAttribute("aria-label") === null)
      .filter((entry) => entry.closest(".chip") === null)
    expect(entries).toHaveLength(0)
  })

  it("points the back control at /", () => {
    render(<SiteBar route="/privacy" />)

    expect(backLink()).toHaveAttribute("href", "/")
  })

  it("is never listed as anyone's child entry", () => {
    render(<SiteBar route="/" />)

    expect(screen.queryByText("privacy")).toBeNull()
    expect(screen.queryByText("/privacy")).toBeNull()
  })
})

describe("SiteBar on /blog/page/2", () => {
  it("marks ~/fiona.sm, blog, and p2 as the ancestors and current segment", () => {
    render(<SiteBar route="/blog/page/2" />)

    expect(screen.getByRole("link", { name: "~/fiona.sm" })).toHaveAttribute(
      "href",
      "/"
    )
    expect(screen.getByRole("link", { name: "blog" })).toHaveAttribute(
      "href",
      "/blog"
    )
    const current = screen.getByText("p2")
    expect(current.tagName.toLowerCase()).toBe("span")
    expect(current.getAttribute("aria-current")).toBe("page")
  })

  it("renders the path chip with no whitespace between segments", () => {
    render(<SiteBar route="/blog/page/2" />)

    const chip = screen.getByText("p2").closest(".chip")
    expect(chip).not.toBeNull()
    expect(chip?.textContent).toBe("~/fiona.sm/blog/p2")
    expect(chip?.textContent).not.toMatch(/\s/)
  })

  it("lists no entries, unlike /canary", () => {
    render(<SiteBar route="/blog/page/2" />)

    const nav = screen.getByRole("navigation")
    const entries = within(nav)
      .getAllByRole("link")
      .filter((entry) => entry.getAttribute("aria-label") === null)
      .filter((entry) => entry.closest(".chip") === null)
    expect(entries).toHaveLength(0)
  })

  it("points the back control at /blog", () => {
    render(<SiteBar route="/blog/page/2" />)

    const back = backLink()
    expect(back).toHaveAttribute("href", "/blog")
    expect(back).toHaveAttribute("aria-label", "up to ~/fiona.sm/blog")
  })
})

describe("SiteBar on /blog/tickerbox-cli", () => {
  it("links ~/fiona.sm and blog, and marks the post current", () => {
    render(<SiteBar route="/blog/tickerbox-cli" />)

    expect(screen.getByRole("link", { name: "~/fiona.sm" })).toHaveAttribute(
      "href",
      "/"
    )
    expect(screen.getByRole("link", { name: "blog" })).toHaveAttribute(
      "href",
      "/blog"
    )
    const current = screen.getByText("tickerbox-cli")
    expect(current.tagName.toLowerCase()).toBe("span")
    expect(current.getAttribute("aria-current")).toBe("page")
  })

  it("has no children of its own", () => {
    render(<SiteBar route="/blog/tickerbox-cli" />)

    const nav = screen.getByRole("navigation")
    const entries = within(nav)
      .getAllByRole("link")
      .filter((entry) => entry.getAttribute("aria-label") === null)
      .filter((entry) => entry.closest(".chip") === null)
    expect(entries).toHaveLength(0)
  })

  it("points the back control at /blog, naming the parent directory", () => {
    render(<SiteBar route="/blog/tickerbox-cli" />)

    const back = backLink()
    expect(back).toHaveAttribute("href", "/blog")
    expect(back).toHaveAttribute("aria-label", "up to ~/fiona.sm/blog")
  })
})

describe("SiteBar back control markup", () => {
  it("gives the back link an accessible svg with no bare glyph text", () => {
    render(<SiteBar route="/canary" />)

    const back = backLink()
    expect(back).not.toBeNull()
    expect(back?.textContent).toBe("")
    const svg = back?.querySelector("svg")
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute("aria-hidden", "true")
    expect(svg).toHaveAttribute("focusable", "false")
  })
})

describe("the back control's position", () => {
  it("anchors to the bar's top right, so a long entry list cannot drag it onto a second row", () => {
    const { container } = render(<SiteBar route="/canary" />)
    const back = container.querySelector('[aria-label^="up to"]')

    expect(back?.className).toContain("absolute")
    expect(back?.className).toContain("top-0")
    expect(back?.className).toContain("right-0")
    expect(back?.closest("nav")?.className).toContain("relative")
  })

  it("reserves room for the back control only where the entries wrap to rows", () => {
    const wrapped = render(<SiteBar route="/canary" />)
    expect(wrapped.container.querySelector("nav")?.className).toContain("pr-14")
    cleanup()

    const single = render(<SiteBar route="/blog" />)
    expect(single.container.querySelector("nav")?.className).not.toContain(
      "pr-14"
    )
  })

  it("leaves the back control in the flow while the entries fit one row", () => {
    const { container } = render(<SiteBar route="/blog" />)
    const back = container.querySelector('[aria-label^="up to"]')

    expect(back?.className).not.toContain("absolute")
  })

  it("sits outside the entry list, so a route with no entries still shows it", () => {
    const { container } = render(<SiteBar route="/blog/tickerbox-cli" />)
    const back = container.querySelector('[aria-label^="up to"]')

    expect(back).not.toBeNull()
    expect(back?.closest("div.grid")).toBeNull()
  })
})

describe("the entry list's layout", () => {
  it("lays entries on two columns, so four wrap as a block rather than a ragged row", () => {
    const { container } = render(<SiteBar route="/canary" />)
    const entries = container.querySelector(".grid")

    expect(entries?.className).toContain("grid-cols-[auto_auto]")
    expect(entries?.className).toContain("w-fit")
  })

  it("sizes its columns to their content, so a short entry leaves no gap", () => {
    const { container } = render(<SiteBar route="/canary" />)

    expect(container.querySelector(".grid")?.className).not.toContain(
      "grid-cols-2"
    )
  })
})
