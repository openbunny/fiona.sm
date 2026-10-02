/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SiteFooter } from "@/components/site-footer"
import { canary } from "@/lib/canary/canary"
import { commitHash } from "@/lib/site/commit-hash"

afterEach(() => {
  cleanup()
})

describe("SiteFooter", () => {
  it("renders the privacy link as a path, on the left", () => {
    render(<SiteFooter />)

    const links = screen.getAllByRole("link")
    const privacy = screen.getByRole("link", { name: "/privacy" })

    expect(privacy.getAttribute("href")).toBe("/privacy")
    expect(links.indexOf(privacy)).toBe(0)
  })

  it("carries the mail address on the right", () => {
    render(<SiteFooter />)

    const links = screen.getAllByRole("link")
    const mail = screen.getByRole("link", { name: canary.email })

    expect(mail.getAttribute("href")).toBe(`mailto:${canary.email}`)
    expect(links.indexOf(mail)).toBe(links.length - 1)
  })

  it("shows the build-time commit hash between the two links, not a literal", () => {
    render(<SiteFooter />)

    const hash = commitHash()
    const footer = screen.getByRole("contentinfo")
    const children = [...footer.children]

    expect(children).toHaveLength(3)
    const [privacy, middle, mail] = children

    expect(privacy?.textContent).toBe("/privacy")
    expect(mail?.textContent).toBe(canary.email)
    expect(middle?.tagName).toBe("SPAN")
    expect(middle?.querySelector("a")).toBeNull()
    expect(middle?.querySelector('[aria-hidden="true"]')?.textContent).toBe(
      hash
    )
    expect(middle?.querySelector(".sr-only")?.textContent).toBe(`build ${hash}`)
  })
})
