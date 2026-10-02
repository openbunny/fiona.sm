/** @vitest-environment jsdom */

import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

import { CanaryHistory } from "@/components/canary/canary-history"
import { canary } from "@/lib/canary/canary"
import type { CanaryArchive } from "@/lib/canary/canary-history"

const archives: ReadonlyArray<CanaryArchive> = [
  {
    signedOn: "2026-06-01",
    href: "/canary/2026-06-01.asc",
    filePath: "/canary/2026-06-01.asc",
    keyPath: undefined,
  },
]

function listItemDates(markup: string): string[] {
  document.body.innerHTML = markup
  return [...document.body.querySelectorAll("li time")].map(
    (time) => time.getAttribute("dateTime") ?? ""
  )
}

afterEach(() => {
  document.body.innerHTML = ""
})

describe("CanaryHistory", () => {
  it("fills a row on hover", () => {
    const markup = renderToStaticMarkup(
      CanaryHistory({ number: "5", archives })
    )
    document.body.innerHTML = markup

    const row = document.body.querySelector("li")
    expect(row?.className).toMatch(/hover:bg-paper-deep/)
    expect(row?.className).not.toMatch(/\brounded-/)
  })

  it("lists the current statement first, above the dated archives", () => {
    const markup = renderToStaticMarkup(
      CanaryHistory({ number: "5", archives })
    )

    expect(listItemDates(markup)).toEqual([canary.signedOn, "2026-06-01"])

    const items = [...document.body.querySelectorAll("li")]
    const currentItem = items[0]
    expect(currentItem).toBeDefined()
    expect(
      currentItem?.querySelector(`a[href="${canary.statementHref}"]`)
    ).not.toBeNull()
  })

  it("shows the current statement exactly once when an archive shares its date", () => {
    const archivesWithCurrentDate: ReadonlyArray<CanaryArchive> = [
      {
        signedOn: canary.signedOn,
        href: "/canary/should-not-render.asc",
        filePath: "/canary/should-not-render.asc",
        keyPath: undefined,
      },
      ...archives,
    ]

    const markup = renderToStaticMarkup(
      CanaryHistory({
        number: "5",
        archives: archivesWithCurrentDate,
      })
    )

    expect(listItemDates(markup)).toEqual([canary.signedOn, "2026-06-01"])
    expect(markup).not.toContain("/canary/should-not-render.asc")
    expect(markup).toContain(canary.statementHref)
  })
})
