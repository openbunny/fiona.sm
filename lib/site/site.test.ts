import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import { absoluteUrl, isRelativeAssetPath, site } from "@/lib/site/site"

describe("absoluteUrl", () => {
  it("joins a path onto the site origin", () => {
    expect(absoluteUrl("/fiona.asc")).toBe("https://fiona.sm/fiona.asc")
  })

  it("treats a missing path as the homepage", () => {
    expect(absoluteUrl()).toBe("https://fiona.sm/")
  })
})

describe("isRelativeAssetPath", () => {
  it("accepts a same-origin filename path", () => {
    expect(isRelativeAssetPath("/fiona.asc")).toBe(true)
  })

  it("accepts a nested same-origin archive path", () => {
    expect(isRelativeAssetPath("/canary/2026-08-25.asc")).toBe(true)
  })

  it("rejects protocol-relative and external URLs", () => {
    expect(isRelativeAssetPath("//evil.example/fiona.asc")).toBe(false)
    expect(isRelativeAssetPath("https://evil.example/fiona.asc")).toBe(false)
    expect(isRelativeAssetPath("/../secret")).toBe(false)
  })
})

describe("site", () => {
  it("uses https and takes its title from the site name", () => {
    expect(site.url.startsWith("https://")).toBe(true)
    expect(site.title).toBe(canary.displayName)
  })

  it("gives the home route its own title, lowercase, distinct from the site name", () => {
    expect(site.homeTitle).toBe("fiona's website")
    expect(site.homeTitle).not.toBe(site.name)
    expect(site.homeTitle).toBe(site.homeTitle.toLowerCase())
  })
})
