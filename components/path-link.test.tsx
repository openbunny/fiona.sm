/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { PathTrail, pathSegments, splitPath } from "@/components/path-link"

afterEach(() => {
  cleanup()
})

describe("splitPath", () => {
  it("splits a home path at the last separator, leaving the ~/ prefix", () => {
    expect(splitPath("~/fiona.sm")).toEqual({
      prefix: "~/",
      name: "fiona.sm",
    })
  })

  it("splits a deep path at the last separator, leaving the directory prefix", () => {
    expect(splitPath("/blog/worms-wmd")).toEqual({
      prefix: "/blog/",
      name: "worms-wmd",
    })
  })

  it("splits a single-segment path at its leading separator", () => {
    expect(splitPath("/canary")).toEqual({ prefix: "/", name: "canary" })
  })

  it("leaves a label with no separator whole", () => {
    expect(splitPath("blog")).toEqual({ prefix: null, name: "blog" })
  })
})

describe("pathSegments", () => {
  it("links each directory segment at its own cumulative path", () => {
    expect(pathSegments("/blog/worms-wmd")).toEqual([
      { label: "blog", href: "/blog" },
      { label: "worms-wmd", href: "/blog/worms-wmd" },
    ])
  })

  it("yields a single segment for a one-level path", () => {
    expect(pathSegments("/canary")).toEqual([
      { label: "canary", href: "/canary" },
    ])
  })

  it("yields no segments for the bare root", () => {
    expect(pathSegments("/")).toEqual([])
  })
})

describe("PathTrail", () => {
  it("links every segment at its cumulative path, separated by /", () => {
    render(
      <PathTrail
        segments={[
          { label: "blog", href: "/blog" },
          { label: "worms-wmd", href: "/blog/worms-wmd" },
        ]}
      />
    )

    expect(screen.getByRole("link", { name: "blog" })).toHaveAttribute(
      "href",
      "/blog"
    )
    expect(screen.getByRole("link", { name: "worms-wmd" })).toHaveAttribute(
      "href",
      "/blog/worms-wmd"
    )
  })

  it("renders a segment with a null href as the current page, not a link", () => {
    render(
      <PathTrail
        segments={[
          { label: "~/fiona.sm", href: "/" },
          { label: "blog", href: "/blog" },
          { label: "p2", href: null },
        ]}
      />
    )

    const current = screen.getByText("p2")
    expect(current.getAttribute("aria-current")).toBe("page")
    expect(screen.queryByRole("link", { name: "p2" })).toBeNull()
  })

  it("leaves the ~/ prefix of a home segment as plain text", () => {
    render(<PathTrail segments={[{ label: "~/fiona.sm", href: "/" }]} />)

    expect(screen.getByRole("link", { name: "fiona.sm" })).toHaveAttribute(
      "href",
      "/"
    )
    expect(screen.queryByRole("link", { name: "~/fiona.sm" })).toBeNull()
  })

  it("forwards linkClassName to every link segment", () => {
    render(
      <PathTrail
        segments={[{ label: "canary", href: "/canary" }]}
        linkClassName="link no-underline hover:underline"
      />
    )

    expect(screen.getByRole("link", { name: "canary" })).toHaveClass(
      "link",
      "no-underline",
      "hover:underline"
    )
  })
})
