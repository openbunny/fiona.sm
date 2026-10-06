import { expect, test } from "@playwright/test"

for (const [source, destination] of [
  ["/plain", "/"],
  ["/blog/page/1", "/blog"],
] as const) {
  test(`redirects ${source} to ${destination}`, async ({ request }) => {
    const response = await request.get(source, { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(
      new URL(response.headers()["location"] ?? "", response.url()).pathname
    ).toBe(destination)
  })
}
