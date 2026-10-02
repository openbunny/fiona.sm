import { expect, test } from "@playwright/test"

import { canary } from "@/lib/canary/canary"
import { fingerprintLine } from "@/lib/canary/fingerprint"
import { formatLongDateTime } from "@/lib/iso-date"
import { site } from "@/lib/site/site"

test("serves identity, key material, and SEO landmarks", async ({ page }) => {
  const response = await page.goto("/canary")
  expect(response?.ok()).toBe(true)

  await expect(page).toHaveTitle(`${site.possessive} canary`)
  await expect(page.locator("h1")).toHaveText("key canary")
  await expect(page.getByText(canary.email).first()).toBeVisible()
  const line = fingerprintLine(canary.fingerprint)
  await expect(
    page.getByText(`openpgp fingerprint, in ten groups of four: ${line}`)
  ).toBeAttached()
  await expect(page.getByText(line, { exact: true })).toBeVisible()
  await expect(page.getByText(/must be replaced by/)).toBeVisible()
  await expect(
    page.locator(`time[datetime='${canary.signedAt}']`).first()
  ).toHaveText(formatLongDateTime(canary.signedAt))
  await expect(page.locator(`time[datetime='${canary.renewBy}']`)).toHaveCount(
    1
  )
  await expect(page.locator("script[type='application/ld+json']")).toHaveCount(
    0
  )

  const description = page.locator('meta[name="description"]')
  await expect(description).toHaveAttribute("content", /\S/)
  await expect(
    description,
    "the canary route fell back to the site-wide description instead of carrying its own"
  ).not.toHaveAttribute("content", site.description)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${canary.siteOrigin}/canary`
  )
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow, nocache"
  )
  await expect(page.locator('meta[name="googlebot"]')).toHaveAttribute(
    "content",
    /^noindex, nofollow,/
  )
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    /apple-icon/
  )
  await expect(page.locator('link[rel="mask-icon"]')).toHaveAttribute(
    "href",
    /safari-pinned-tab\.svg/
  )
})

test("preloads the two woff2 faces as real head links", async ({ page }) => {
  await page.goto("/")

  const fontPreloads = page.locator('head link[rel="preload"][as="font"]')
  await expect(fontPreloads).not.toHaveCount(0)

  const hrefs: string[] = []
  for (const preload of await fontPreloads.all()) {
    await expect(preload).toHaveAttribute("type", "font/woff2")
    await expect(preload).toHaveAttribute("crossorigin", "anonymous")
    hrefs.push((await preload.getAttribute("href")) ?? "")
  }

  const faces = [
    "courier-prime-latin-400-normal",
    "jetbrains-mono-latin-400-normal",
  ]
  const distinct = [...new Set(hrefs)]
  expect(distinct).toHaveLength(faces.length)
  for (const face of faces) {
    expect(distinct.filter((href) => href.includes(face))).toHaveLength(1)
  }
})
