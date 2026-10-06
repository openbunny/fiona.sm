import { existsSync } from "node:fs"

import { describe, expect, it } from "vitest"

import manifest from "@/app/manifest"
import { icoPath, ink } from "@/lib/images/icon-files"
import { iconUrls } from "@/lib/images/icon-urls"
import { metadata } from "@/lib/site/metadata"
import { canary } from "@/lib/canary/canary"
import { site } from "@/lib/site/site"

function filePathFor(url: string): string {
  return url === "/favicon.ico" ? icoPath : `public${url}`
}

describe("manifest icons", () => {
  it("lists svg, png, and maskable png icons", () => {
    const icons = manifest().icons
    expect(icons).toEqual(
      expect.arrayContaining([
        { src: iconUrls.svg, sizes: "any", type: "image/svg+xml" },
        {
          src: iconUrls.png192,
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: iconUrls.png512,
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: iconUrls.maskable192,
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: iconUrls.maskable512,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ])
    )
  })
})

describe("metadata title", () => {
  it("defaults to the home title and templates a child title with the site name", () => {
    const title = metadata.title as Extract<
      typeof metadata.title,
      { default: string }
    >

    expect(title.default).toBe(site.homeTitle)
    expect(title.template).toBe(`%s · ${site.name}`)
    expect(site.title).toBe(canary.displayName)
  })
})

describe("metadata icons", () => {
  it("declares favicon, apple-touch, and safari mask icons", () => {
    expect(metadata.icons).toEqual({
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: iconUrls.svg, type: "image/svg+xml" },
      ],
      apple: [{ url: iconUrls.apple, sizes: "180x180" }],
      other: [
        {
          rel: "mask-icon",
          url: iconUrls.safari,
          color: ink,
        },
      ],
    })
  })
})

describe("icon references resolve to real files", () => {
  it("has an on-disk file for every manifest icon src", () => {
    for (const icon of manifest().icons ?? []) {
      expect(existsSync(filePathFor(icon.src))).toBe(true)
    }
  })

  it("has an on-disk file for every metadata icon url", () => {
    const icons = metadata.icons as {
      icon: ReadonlyArray<{ url: string }>
      apple: ReadonlyArray<{ url: string }>
      other: ReadonlyArray<{ url: string }>
    }
    const urls = [...icons.icon, ...icons.apple, ...icons.other].map(
      (entry) => entry.url
    )
    for (const url of urls) {
      expect(existsSync(filePathFor(url))).toBe(true)
    }
  })
})
