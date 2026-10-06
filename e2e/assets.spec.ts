import { expect, test } from "@playwright/test"

import { canary } from "@/lib/canary/canary"
import { iconUrls } from "@/lib/images/icon-urls"
import * as allPlates from "@/lib/images/plates"
import { wkdKeyHref, wkdPolicyHref } from "@/lib/publish/wkd"

test("exposes robots, key, and security files, and no sitemap", async ({
  request,
}) => {
  const robots = await request.get("/robots.txt")
  expect(robots.ok()).toBe(true)
  const robotsText = await robots.text()
  expect(robotsText).toContain("User-Agent: *\nAllow: /")
  expect(robotsText).toContain("User-Agent: GPTBot")
  expect(robotsText).toContain("Disallow: /")
  expect(robotsText).not.toContain("Sitemap:")

  const sitemap = await request.get("/sitemap.xml")
  expect(sitemap.status()).toBe(404)

  const key = await request.get("/fiona.asc")
  expect(key.ok()).toBe(true)
  expect(key.headers()["content-type"]).toContain("application/pgp-keys")
  expect(await key.text()).toContain("BEGIN PGP PUBLIC KEY BLOCK")

  const canary = await request.get("/canary.asc")
  expect(canary.ok()).toBe(true)
  expect(await canary.text()).toContain("BEGIN PGP SIGNED MESSAGE")

  const security = await request.get("/.well-known/security.txt")
  expect(security.ok()).toBe(true)
  expect(await security.text()).toContain("Contact: mailto:mail@fiona.sm")

  const policy = await request.get("/security-policy.txt")
  expect(policy.ok()).toBe(true)
  expect(await policy.text()).toContain("vulnerability disclosure policy")

  const llms = await request.get("/llms.txt")
  expect(llms.ok()).toBe(true)
  expect(await llms.text()).toContain("fiona")
})

test("serves favicon, apple, manifest, and safari mask icons", async ({
  request,
}) => {
  const favicon = await request.get("/favicon.ico")
  expect(favicon.ok()).toBe(true)

  const svg = await request.get(iconUrls.svg)
  expect(svg.ok()).toBe(true)
  expect(await svg.text()).toContain("<path")
  expect(await svg.text()).not.toContain("font-family")
  expect(await svg.text()).toContain("<rect")

  const apple = await request.get(iconUrls.apple)
  expect(apple.ok()).toBe(true)
  expect(apple.headers()["content-type"]).toContain("image/png")

  const png192 = await request.get(iconUrls.png192)
  expect(png192.ok()).toBe(true)

  const png512 = await request.get(iconUrls.png512)
  expect(png512.ok()).toBe(true)

  const maskable = await request.get(iconUrls.maskable512)
  expect(maskable.ok()).toBe(true)

  const safari = await request.get(iconUrls.safari)
  expect(safari.ok()).toBe(true)
  expect(await safari.text()).toContain("<path")
  expect(await safari.text()).not.toContain("<rect")

  const manifest = await request.get("/manifest.webmanifest")
  expect(manifest.ok()).toBe(true)
  expect(await manifest.text()).toContain(iconUrls.png512)
  expect(await manifest.text()).toContain("maskable")
})

test("serves every masthead plate's animation and static png", async ({
  request,
}) => {
  const plates = Object.values(allPlates).flatMap((plate) => [
    plate.animatedSrc,
    plate.staticSrc,
  ])

  expect(
    plates.length,
    "no plate was discovered, so this test would pass having checked nothing"
  ).toBeGreaterThanOrEqual(16)

  for (const name of plates) {
    const response = await request.get(name)
    expect(response.ok(), `${name} did not respond ok`).toBe(true)
    expect(response.headers()["cache-control"]).toBe(
      "public, max-age=31536000, immutable"
    )
  }
})

test("never caches a missing /img path as immutable", async ({ request }) => {
  const response = await request.get(`/img/${"0".repeat(128)}.png`)
  expect(response.status()).toBe(404)
  expect(response.headers()["cache-control"]).toBe(
    "public, max-age=0, must-revalidate"
  )
})

test("serves the web key directory for fiona's contact address", async ({
  request,
}) => {
  const keyHref = wkdKeyHref(canary.email)
  const key = await request.get(`${keyHref}?l=mail`)
  expect(key.ok()).toBe(true)
  expect(key.headers()["content-type"]).toContain("application/octet-stream")
  expect(key.headers()["access-control-allow-origin"]).toBe("*")
  expect(key.headers()["cross-origin-resource-policy"]).toBe("cross-origin")

  const body = await key.body()
  expect(body.length).toBeGreaterThan(0)
  expect(body.toString("utf8")).not.toContain("BEGIN PGP PUBLIC KEY BLOCK")
  expect((body[0] ?? 0) & 0x80).toBe(0x80)

  const head = await request.head(keyHref)
  expect(head.ok()).toBe(true)

  const policy = await request.get(wkdPolicyHref)
  expect(policy.ok()).toBe(true)
  expect(policy.headers()["access-control-allow-origin"]).toBe("*")
  expect(await policy.text()).toContain("fiona.sm")
})

for (const [motion, expected] of [
  ["no-preference", allPlates.HOME_PLATE.animatedSrc],
  ["reduce", allPlates.HOME_PLATE.staticSrc],
] as const) {
  test(`shows and fetches only the ${motion === "reduce" ? "still" : "animated"} home plate when motion is ${motion}`, async ({
    page,
  }) => {
    const plateFiles: readonly string[] = [
      allPlates.HOME_PLATE.animatedSrc,
      allPlates.HOME_PLATE.staticSrc,
    ]
    const fetched: string[] = []
    page.on("request", (request) => {
      const { pathname } = new URL(request.url())
      if (plateFiles.includes(pathname)) fetched.push(pathname)
    })
    await page.emulateMedia({ reducedMotion: motion })
    await page.goto("/")

    const plate = page.locator("picture > img").first()
    await expect
      .poll(() => plate.evaluate((image: HTMLImageElement) => image.currentSrc))
      .toContain(expected)
    expect(fetched).toEqual([expected])
  })
}
