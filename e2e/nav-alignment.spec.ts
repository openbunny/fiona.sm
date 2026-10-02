import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

type Edges = {
  readonly navRight: number
  readonly gridRight: number
  readonly backRight: number | null
  readonly backLeft: number | null
}

async function edgesOf(page: Page, route: string): Promise<Edges> {
  await page.goto(route)

  const edges = await page.evaluate(() => {
    const nav = document.querySelector(
      'nav[aria-label="path and directory listing"]'
    )
    if (nav === null) {
      return null
    }

    const right = (selector: string): number | null => {
      const found = nav.querySelector(selector)
      return found === null ? null : found.getBoundingClientRect().right
    }

    const back = nav.querySelector('[aria-label^="up to"]')

    return {
      navRight: nav.getBoundingClientRect().right,
      gridRight: right("div.grid, div.flex.w-fit"),
      backRight: back === null ? null : back.getBoundingClientRect().right,
      backLeft: back === null ? null : back.getBoundingClientRect().left,
    }
  })

  expect(edges, `${route} renders no path and directory bar`).not.toBeNull()
  expect(
    edges?.gridRight,
    `${route} renders no entry list, so this check has nothing to align`
  ).not.toBeNull()

  return edges as Edges
}

const NAV_GAP = 24

for (const route of ["/canary", "/blog"]) {
  test(`keeps the back control on the bar's right edge on ${route}`, async ({
    page,
  }) => {
    const edges = await edgesOf(page, route)

    expect(edges.backRight).toBeCloseTo(edges.navRight, 0)
  })

  test(`ends the entry list clear of the back control on ${route}`, async ({
    page,
  }) => {
    const edges = await edgesOf(page, route)
    const gap = (edges.backLeft ?? 0) - edges.gridRight

    expect(gap).toBeGreaterThanOrEqual(NAV_GAP)
    expect(gap).toBeLessThan(64)
  })
}

test("runs the entry list to the bar's right edge where there is no back control", async ({
  page,
}) => {
  const edges = await edgesOf(page, "/")

  expect(edges.backRight, "/ is the root and has nothing above it").toBeNull()
  expect(edges.gridRight).toBeCloseTo(edges.navRight, 0)
})

test("spaces a one-row entry list by the bar's own gap, with nothing reserved", async ({
  page,
}) => {
  const edges = await edgesOf(page, "/blog")

  expect((edges.backLeft ?? 0) - edges.gridRight).toBeCloseTo(NAV_GAP, 0)
})

test("clears a wrapped entry list by more than the bar's own gap", async ({
  page,
}) => {
  const edges = await edgesOf(page, "/canary")

  expect((edges.backLeft ?? 0) - edges.gridRight).toBeGreaterThan(NAV_GAP)
})
