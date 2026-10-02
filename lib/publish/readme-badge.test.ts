import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import { formatLongDate } from "@/lib/iso-date"
import { buildRenewByBadge, patchReadmeBadge } from "@/lib/publish/readme-badge"

const input = {
  renewBy: "2026-11-23",
  siteOrigin: "https://fiona.sm",
  statementHref: "/canary.asc",
}

const badgeDate = formatLongDate(input.renewBy)
const badge = `[![renew by ${badgeDate}](https://img.shields.io/badge/renew%20by-${encodeURIComponent(badgeDate)}-000000)](https://fiona.sm/canary.asc)`

describe("buildRenewByBadge", () => {
  it("states the renew-by date in long form and links the signed statement", () => {
    expect(buildRenewByBadge(input)).toBe(badge)
  })

  it("is a static shields url that never reads this private repository", () => {
    const built = buildRenewByBadge(input)
    const date = formatLongDate(input.renewBy)

    const [, altText, image, href] =
      /^\[!\[([^\]]*)\]\(([^)]*)\)\]\(([^)]*)\)$/.exec(built) ?? []

    expect(altText).toBe(`renew by ${date}`)
    expect(image).toBe(
      `https://img.shields.io/badge/renew%20by-${encodeURIComponent(date)}-000000`
    )
    expect(href).toBe(`${input.siteOrigin}${input.statementHref}`)
  })

  it("does not bake in a days-remaining count that would freeze at build time", () => {
    expect(buildRenewByBadge(input)).not.toMatch(/days?/i)
  })

  it("rejects a renew-by that is not an iso date", () => {
    expect(() =>
      buildRenewByBadge({ ...input, renewBy: "23 November 2026" })
    ).toThrow(/Invalid ISO date/)
  })
})

describe("patchReadmeBadge", () => {
  const source = [
    "# fiona.sm",
    "",
    "[![ci](https://ci)](https://ci)",
    badge,
    "",
    "prose",
  ].join("\n")

  it("rewrites the badge line in place and leaves the rest alone", () => {
    const nextRenewBy = "2027-02-21"
    const next = patchReadmeBadge(
      source,
      buildRenewByBadge({ ...input, renewBy: nextRenewBy })
    )

    expect(next).toContain(
      `renew%20by-${encodeURIComponent(formatLongDate(nextRenewBy))}`
    )
    expect(next).not.toContain(encodeURIComponent(badgeDate))
    expect(next).toContain("[![ci](https://ci)](https://ci)")
    expect(next.split("\n")).toHaveLength(source.split("\n").length)
  })

  it("refuses a readme with no badge to rewrite", () => {
    expect(() => patchReadmeBadge("# fiona.sm\n", badge)).toThrow(
      /Missing renew-by badge/
    )
  })

  it("refuses a badge line that never ends", () => {
    expect(() => patchReadmeBadge(badge, badge)).toThrow(
      /Unterminated renew-by badge/
    )
  })
})

describe("README.md", () => {
  it("carries the badge for the renew-by date published in lib/canary/canary.ts", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8")

    expect(readme).toContain(
      buildRenewByBadge({
        renewBy: canary.renewBy,
        siteOrigin: canary.siteOrigin,
        statementHref: canary.statementHref,
      })
    )
  })

  it("carries the proof-of-date values published in lib/canary/canary.ts", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8")

    expect(readme).toContain(
      `Proof of date: Monero block ${canary.moneroBlockHeight}`
    )
    expect(readme).toContain(canary.moneroBlockHash)
    expect(readme).toContain(`"height":${canary.moneroBlockHeight}`)
    expect(readme).toContain(
      `https://xmrchain.net/block/${canary.moneroBlockHeight}`
    )
  })
})
