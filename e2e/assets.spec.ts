import { expect, test } from "@playwright/test"

import { canary } from "@/lib/canary/canary"
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

  const svg = await request.get("/icon.svg")
  expect(svg.ok()).toBe(true)
  expect(await svg.text()).toContain("<path")
  expect(await svg.text()).not.toContain("font-family")
  expect(await svg.text()).toContain("<rect")

  const apple = await request.get("/apple-icon.png")
  expect(apple.ok()).toBe(true)
  expect(apple.headers()["content-type"]).toContain("image/png")

  const png192 = await request.get("/icon-192.png")
  expect(png192.ok()).toBe(true)

  const png512 = await request.get("/icon-512.png")
  expect(png512.ok()).toBe(true)

  const maskable = await request.get("/icon-512-maskable.png")
  expect(maskable.ok()).toBe(true)

  const safari = await request.get("/safari-pinned-tab.svg")
  expect(safari.ok()).toBe(true)
  expect(await safari.text()).toContain("<path")
  expect(await safari.text()).not.toContain("<rect")

  const manifest = await request.get("/manifest.webmanifest")
  expect(manifest.ok()).toBe(true)
  expect(await manifest.text()).toContain("/icon-512.png")
  expect(await manifest.text()).toContain("maskable")
})

test("serves every masthead plate's gif and static png", async ({
  request,
}) => {
  const plates = Object.values(allPlates).flatMap((plate) => [
    plate.gifSrc,
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
      "public, max-age=3600, must-revalidate"
    )
  }
})

test("serves the tickerbox-cli post's gif and static png", async ({
  request,
}) => {
  const postArt = [
    "post-art/tickerbox-cli.gif",
    "post-art/tickerbox-cli-static.png",
  ]

  for (const path of postArt) {
    const response = await request.get(`/${path}`)
    expect(response.ok(), `/${path} did not respond ok`).toBe(true)
    expect(response.headers()["cache-control"]).toBe(
      "public, max-age=3600, must-revalidate"
    )
  }
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
