import { expect, it, vi } from "vitest"

const files = vi.hoisted(() => ({ write: vi.fn() }))

vi.mock("node:fs", () => ({
  readdirSync: () => ["index.html", "_headers", "_next/static/chunks/app.js"],
  statSync: () => ({ isFile: () => true }),
  writeFileSync: files.write,
}))

it("writes Cloudflare headers for exported assets and omits control files", async () => {
  await import("@/scripts/build-cloudflare-headers")

  expect(files.write).toHaveBeenCalledOnce()
  const [path, contents] = files.write.mock.calls[0] as [string, string]
  expect(path).toBe("out/_headers")
  expect(contents).toContain("/*\n")
  expect(contents).toContain("/_next/static/*\n")
  expect(contents).not.toContain("/_headers\n")
})
