import { describe, expect, it } from "vitest"

import { metadata } from "@/app/not-found"
import { site } from "@/lib/site/site"

describe("not found metadata", () => {
  it("titles itself rather than inheriting the site title", () => {
    expect(metadata.title).toBe("not found")
    expect(metadata.title).not.toBe(site.title)
  })

  it("stays out of the index", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  it("claims no canonical, so a missing path is not declared a copy of the canary", () => {
    expect(metadata.alternates).toEqual({ canonical: null })
  })

  it("carries no card image, so a dead link cannot unfurl the canary", () => {
    expect(metadata.openGraph?.images).toEqual([])
    expect(metadata.twitter?.images).toEqual([])
  })

  it("describes the missing path rather than the site", () => {
    expect(metadata.description).toBe("that path does not exist on this site.")
    expect(metadata.description).not.toBe(site.description)
  })

  it("keeps the site-wide openGraph fields an object override must not drop", () => {
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      siteName: site.name,
      locale: site.locale,
    })
    expect(metadata.openGraph?.url).toBeTruthy()
  })
})
