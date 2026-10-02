import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const builtApp = ".next/server/app"

function builtPages(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return builtPages(path)
    }

    return entry.name.endsWith(".html") ? [path] : []
  })
}

function pages(): string[] {
  try {
    return builtPages(builtApp)
  } catch {
    throw new Error(
      `${builtApp} has no built pages. This test reads the rendered html, so it has nothing to check without a production build: run \`bun run build\` first. In \`bun run check\` and in CI a build always precedes it, so a missing directory is a real failure rather than a reason to skip.`
    )
  }
}

const imageTag = /<img\b[^>]*>/g
const altAttribute = /\salt=(?:"[^"]*"|'[^']*')/

describe("every rendered image states an alt", () => {
  const found = pages().map((page) => ({
    page,
    images: readFileSync(page, "utf8").match(imageTag) ?? [],
  }))

  it("reads a build that contains pages and images, so a pass means something", () => {
    expect(found.length, "no built page was found").toBeGreaterThan(0)
    expect(
      found.reduce((total, entry) => total + entry.images.length, 0),
      "no rendered image was found, so the check below would pass having inspected nothing"
    ).toBeGreaterThan(0)
  })

  it.each(found.filter((entry) => entry.images.length > 0))(
    "states an alt on every image in $page",
    ({ page, images }) => {
      const missing = images.filter((tag) => !altAttribute.test(tag))

      expect(
        missing,
        `${page} renders an image with no alt attribute. Decorative artwork takes alt="" beside aria-hidden; anything a reader needs takes a description.`
      ).toEqual([])
    }
  )
})
