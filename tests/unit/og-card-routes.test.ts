import { readdirSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { contentHash } from "@/lib/images/content-name"

const routes = readdirSync("app", { recursive: true, encoding: "utf8" })
  .filter((path) => path.endsWith("opengraph-image.tsx"))
  .sort()

describe("share card routes", () => {
  it("finds a route for the home page, the blog, the canary and the posts", () => {
    expect(routes).toEqual(
      expect.arrayContaining([
        "opengraph-image.tsx",
        "blog/opengraph-image.tsx",
        "canary/opengraph-image.tsx",
      ])
    )
  })

  it.each(routes)(
    "serves app/%s under the sha-512 of the png it responds with",
    async (route) => {
      const cardRoute = (await import(`@/app/${route}`)) as {
        readonly dynamicParams: boolean
        readonly generateImageMetadata: () => Promise<
          readonly { readonly id: string }[]
        >
        readonly default: () => Promise<Response>
      }
      const [metadata, ...rest] = await cardRoute.generateImageMetadata()
      const bytes = new Uint8Array(
        await (await cardRoute.default()).arrayBuffer()
      )

      expect(rest).toEqual([])
      expect(metadata?.id).toBe(contentHash(bytes))
      expect(cardRoute.dynamicParams).toBe(false)
    }
  )
})
