import { expect, test } from "@playwright/test"

import { canary } from "@/lib/canary/canary"
import { wkdKeyHref, wkdPolicyHref } from "@/lib/publish/wkd"

const everyPath = [
  "/",
  "/privacy",
  "/blog",
  "/blog/tickerbox-cli",
  "/fiona.asc",
  "/canary.asc",
  "/posts.asc",
  "/posts/tickerbox-cli.txt",
  "/feed.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/.well-known/security.txt",
  "/llms.txt",
  "/humans.txt",
  "/icon-192.png",
  wkdKeyHref(canary.email),
  wkdPolicyHref,
]

test("sets security headers", async ({ request }) => {
  const response = await request.get("/")
  const headers = response.headers()
  expect(headers["x-content-type-options"]).toBe("nosniff")
  expect(headers["x-frame-options"]).toBe("DENY")
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'")
  expect(headers["referrer-policy"]).toBe("no-referrer")
  expect(headers["x-robots-tag"]).toBe(
    "noindex, nofollow, noarchive, nosnippet, noimageindex"
  )
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin")
  expect(headers["cross-origin-resource-policy"]).toBe("same-origin")
  expect(headers["content-security-policy"]).toContain("object-src 'none'")
  expect(headers["content-security-policy"]).toContain("connect-src 'self'")
  expect(headers["content-security-policy"]).toContain(
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com/beacon.min.js"
  )
  expect(headers["content-security-policy"]).toContain("style-src 'self'")
  expect(headers["content-security-policy"]).toContain("base-uri 'none'")
  expect(headers["content-security-policy"]).toContain("form-action 'none'")
  expect(headers["content-security-policy"]).toContain("default-src 'self'")
  expect(headers["content-security-policy"]).toContain("script-src-attr 'none'")
  expect(headers["content-security-policy"]).toContain("style-src-attr 'none'")
  expect(headers["content-security-policy"]).toContain("worker-src 'none'")
  expect(headers["content-security-policy"]).toContain("frame-src 'none'")
  expect(headers["content-security-policy"]).toContain(
    "upgrade-insecure-requests"
  )
  expect(headers["content-security-policy"]).not.toContain(
    "style-src 'self' 'unsafe-inline'"
  )
  expect(headers["content-security-policy"]).not.toContain("unsafe-eval")
  expect(headers["strict-transport-security"]).toContain("max-age=63072000")
  expect(headers["cross-origin-embedder-policy"]).toBe("credentialless")
  expect(headers["cache-control"]).toContain("must-revalidate")
})

for (const path of everyPath) {
  test(`carries the security headers on ${path}`, async ({ request }) => {
    const headers = (await request.get(path)).headers()
    expect(headers["x-content-type-options"]).toBe("nosniff")
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'"
    )
    expect(headers["strict-transport-security"]).toContain("max-age=63072000")
  })

  test(`carries the X-Robots-Tag noindex header on ${path}`, async ({
    request,
  }) => {
    const headers = (await request.get(path)).headers()
    expect(headers["x-robots-tag"]).toBe(
      "noindex, nofollow, noarchive, nosnippet, noimageindex"
    )
  })

  test(`bounds an injection to this origin on ${path}`, async ({ request }) => {
    const policy = (await request.get(path)).headers()[
      "content-security-policy"
    ]
    expect(policy).toContain("default-src 'self'")
    expect(policy).toContain("connect-src 'self'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("base-uri 'none'")
    expect(policy).toContain("form-action 'none'")
  })

  test(`permits only the Cloudflare analytics beacon off origin on ${path}`, async ({
    request,
  }) => {
    const policy =
      (await request.get(path)).headers()["content-security-policy"] ?? ""
    expect(policy.match(/https?:\/\/[^\s;]+/g)).toEqual([
      "https://static.cloudflareinsights.com/beacon.min.js",
    ])
    expect(policy).not.toContain("*")
  })

  test(`reports nowhere and requires no trusted type on ${path}`, async ({
    request,
  }) => {
    const headers = (await request.get(path)).headers()
    expect(headers["content-security-policy"]).not.toContain("report-uri")
    expect(headers["content-security-policy"]).not.toContain("report-to")
    expect(headers["content-security-policy"]).not.toContain(
      "require-trusted-types-for"
    )
    expect(headers["content-security-policy"]).not.toContain("trusted-types")
    expect(headers["reporting-endpoints"]).toBeUndefined()
    expect(headers["report-to"]).toBeUndefined()
    expect(headers["content-security-policy-report-only"]).toBeUndefined()
  })
}

test("caches immutable icon assets", async ({ request }) => {
  const headers = (await request.get("/icon-512.png")).headers()
  expect(headers["cache-control"]).toContain("max-age=86400")
  expect(headers["cache-control"]).toContain("stale-while-revalidate")
})

for (const path of ["/canary", "/privacy", "/blog", "/blog/tickerbox-cli"]) {
  test(`never serves ${path} from a stale cache`, async ({ request }) => {
    const headers = (await request.get(path)).headers()
    expect(headers["cache-control"]).toBe(
      "public, max-age=0, s-maxage=60, must-revalidate"
    )
    expect(headers["cache-control"]).not.toContain("stale-while-revalidate")
  })
}

for (const path of ["/does-not-exist", "/canary/2020-01-01.asc"]) {
  test(`answers ${path} from the framework's not-found route`, async ({
    request,
  }) => {
    const response = await request.get(path)
    expect(response.status()).toBe(404)

    const cacheControl = response.headers()["cache-control"] ?? ""
    expect(cacheControl).toContain("max-age=0")
    expect(cacheControl).toContain("must-revalidate")
    expect(cacheControl).not.toContain("stale-while-revalidate")
    expect(cacheControl).not.toMatch(/\bs-maxage=[1-9]/)
  })
}

test("labels the unpublished archive 404 as html", async ({ request }) => {
  const response = await request.get("/canary/2020-01-01.asc")
  expect(response.status()).toBe(404)
  expect(response.headers()["content-type"]).toBe("text/html; charset=utf-8")
  expect(await response.text()).toContain("<html")
})

test("renders with no content security policy violations", async ({ page }) => {
  const violations: string[] = []
  const blocked = /content security policy|requires 'trusted/i
  page.on("console", (message) => {
    if (blocked.test(message.text())) {
      violations.push(message.text())
    }
  })
  page.on("pageerror", (error) => {
    if (blocked.test(error.message)) {
      violations.push(error.message)
    }
  })
  await page.goto("/")
  await expect.poll(() => violations).toEqual([])
})

test("serves social image URLs without file extensions as png", async ({
  request,
}) => {
  const response = await request.get("/opengraph-image")
  expect(response.status()).toBe(200)
  expect(response.headers()["content-type"]).toBe("image/png")
})

test("revalidates an unpublished post archive", async ({ request }) => {
  const response = await request.get("/posts/tickerbox-cli/missing.txt")
  expect(response.status()).toBe(404)
  expect(response.headers()["cache-control"]).toBe(
    "public, max-age=0, must-revalidate"
  )
})
