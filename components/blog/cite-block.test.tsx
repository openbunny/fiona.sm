/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { CiteBlock } from "@/components/blog/cite-block"
import type { BlogPost } from "@/lib/blog/posts"

const post: BlogPost = {
  slug: "tickerbox-cli",
  title: "tickerbox-cli",
  date: "2026-10-01",
  href: "/blog/tickerbox-cli",
}

const sha256 =
  "29efa55531a77a83159976258a3c03e19dabf6996ae35e2f2c58b6eb3ffaed72"

afterEach(cleanup)

describe("CiteBlock", () => {
  it("offers both citation forms, each with its own copy control", () => {
    render(
      <CiteBlock
        id="cite"
        citation={{ post, sha256, manifestSignedOn: "2026-10-01" }}
      />
    )

    expect(
      screen.getByRole("button", { name: "copy plain citation" })
    ).toBeDefined()
    expect(
      screen.getByRole("button", { name: "copy bibtex citation" })
    ).toBeDefined()
  })

  it("prints the digest a reader would compare against the manifest", () => {
    const { container } = render(
      <CiteBlock
        id="cite"
        citation={{ post, sha256, manifestSignedOn: "2026-10-01" }}
      />
    )

    expect(container.textContent).toContain(sha256)
  })

  it("renders both forms without a digest, rather than printing undefined", () => {
    const { container } = render(<CiteBlock id="cite" citation={{ post }} />)

    expect(container.textContent).not.toContain("undefined")
    expect(container.querySelectorAll("pre")).toHaveLength(2)
  })
})

describe("CiteBlock disclosure", () => {
  it("shows only its heading until a reader opens it", () => {
    const { container } = render(
      <CiteBlock id="cite" citation={{ post, sha256 }} />
    )
    const details = container.querySelector("details")

    expect(details).not.toBeNull()
    expect(details?.hasAttribute("open")).toBe(false)
    expect(details?.querySelector("summary")?.textContent).toBe(
      "cite this post"
    )
  })

  it("keeps both citation forms in the markup, so no-JS and search still reach them", () => {
    const { container } = render(
      <CiteBlock
        id="cite"
        citation={{ post, sha256, manifestSignedOn: "2026-10-01" }}
      />
    )

    expect(container.querySelectorAll("pre")).toHaveLength(2)
    expect(container.textContent).toContain(sha256)
  })
})
