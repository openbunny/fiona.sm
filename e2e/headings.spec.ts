import { expect, test, type Page } from "@playwright/test"

type HeadingScope = {
  readonly text: string
  readonly level: number
  readonly hasSection: boolean
  readonly scopeIsBounded: boolean
  readonly skippedTags: readonly string[]
  readonly scopeText: string
}

async function outlineOf(page: Page): Promise<HeadingScope[]> {
  return page.evaluate(() => {
    const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]

    return headings.map((heading, index) => {
      const section = heading.closest("section")
      const next = headings[index + 1]

      const scope: Element[] = []
      const walker = document.createTreeWalker(
        heading.closest("main") ?? document.body,
        NodeFilter.SHOW_ELEMENT
      )
      walker.currentNode = heading
      let node = walker.nextNode()
      while (
        node !== null &&
        !(node === next || (next !== undefined && node.contains(next)))
      ) {
        scope.push(node as Element)
        node = walker.nextNode()
      }

      const carriesText = (element: Element): boolean =>
        (element.textContent ?? "").trim() !== ""

      return {
        text: (heading.textContent ?? "").trim(),
        level: Number(heading.tagName.slice(1)),
        hasSection: section !== null,
        scopeIsBounded:
          section !== null &&
          scope
            .filter((element) => carriesText(element))
            .every((element) => section.contains(element)),
        skippedTags: [
          ...new Set(
            scope
              .filter((element) => !carriesText(element))
              .filter((element) => !section?.contains(element))
              .map((element) => element.tagName.toLowerCase())
          ),
        ],
        scopeText: scope
          .map((element) => (element.textContent ?? "").trim())
          .filter((value) => value !== "")
          .join(" "),
      }
    })
  })
}

test("bounds every h2's scope with the section it heads", async ({ page }) => {
  await page.goto("/canary")

  const headings = await outlineOf(page)
  const subheadings = headings.filter((heading) => heading.level === 2)

  expect(subheadings.length).toBeGreaterThan(3)
  for (const heading of subheadings) {
    expect(
      heading.hasSection,
      `the h2 "${heading.text}" is not inside a section, so its scope runs to the next heading`
    ).toBe(true)
    expect(
      heading.scopeIsBounded,
      `the h2 "${heading.text}" covers content outside its own section: ${heading.scopeText.slice(0, 200)}`
    ).toBe(true)

    expect(
      heading.skippedTags,
      `the h2 "${heading.text}" skipped a textless element that is not a separator`
    ).toEqual(expect.arrayContaining([]))
    for (const tag of heading.skippedTags) {
      expect(["hr"]).toContain(tag)
    }
  }
})

test("files the fingerprint under key fingerprint and nothing else", async ({
  page,
}) => {
  await page.goto("/canary")

  const headings = await outlineOf(page)
  const fingerprint = headings.find(
    (heading) => heading.text === "key fingerprint"
  )

  expect(fingerprint).toBeDefined()
  expect(fingerprint?.scopeText).toContain(
    "openpgp fingerprint, in ten groups of four"
  )
  expect(fingerprint?.scopeText).not.toContain(
    "this page is a cryptographic canary"
  )
  expect(fingerprint?.scopeText).not.toContain("renew by")
})

test("gives the canary explanation a heading a reader can reach", async ({
  page,
}) => {
  await page.goto("/canary")

  const headings = await outlineOf(page)
  const explanation = headings.find((heading) =>
    heading.scopeText.includes("this page is a cryptographic canary")
  )

  expect(
    explanation,
    "no heading leads to the page's own explanation of itself"
  ).toBeDefined()
  expect(explanation?.level).toBe(2)
  expect(explanation?.text).toBe("about this canary")
  expect(explanation?.scopeText).toContain("renew by")
})
