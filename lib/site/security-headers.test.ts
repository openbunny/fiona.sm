import { afterEach, describe, expect, it, vi } from "vitest"

import { securityHeaders } from "@/lib/site/security-headers"

const headerValue = (key: string): string =>
  securityHeaders.find((header) => header.key === key)?.value ?? ""

const directives = (value: string): ReadonlyArray<string> =>
  value.split("; ").map((directive) => directive.trim())

const csp = headerValue("Content-Security-Policy")

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("securityHeaders", () => {
  it("declares every header exactly once", () => {
    const keys = securityHeaders.map((header) => header.key)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it("carries the transport and isolation headers", () => {
    expect(headerValue("X-Content-Type-Options")).toBe("nosniff")
    expect(headerValue("X-Frame-Options")).toBe("DENY")
    expect(headerValue("Referrer-Policy")).toBe("no-referrer")
    expect(headerValue("Cross-Origin-Opener-Policy")).toBe("same-origin")
    expect(headerValue("Cross-Origin-Embedder-Policy")).toBe("credentialless")
    expect(headerValue("Cross-Origin-Resource-Policy")).toBe("same-origin")
    expect(headerValue("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload"
    )
  })
})

describe("X-Robots-Tag", () => {
  it("marks every route noindex, so search engines drop each one once they crawl it", () => {
    expect(headerValue("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive, nosnippet, noimageindex"
    )
  })
})

describe("content security policy", () => {
  it("is exactly the assessed directive set", () => {
    expect(directives(csp)).toEqual([
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "script-src-attr 'none'",
      "style-src 'self'",
      "style-src-attr 'none'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "media-src 'none'",
      "object-src 'none'",
      "frame-src 'none'",
      "child-src 'none'",
      "worker-src 'none'",
      "manifest-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ])
  })

  it("closes connect-src to this origin alone", () => {
    const connectSrc = directives(csp).find((directive) =>
      directive.startsWith("connect-src ")
    )

    expect(connectSrc?.split(" ")).toEqual(["connect-src", "'self'"])
  })

  it("names no off-origin host anywhere in the policy", () => {
    expect(csp).not.toContain("//")
    expect(csp).not.toContain("http")
    expect(csp).not.toContain("*")
  })

  it("bounds an injection to this origin", () => {
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'none'")
    expect(csp).toContain("form-action 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it("keeps unsafe-inline for scripts only, and never unsafe-eval", () => {
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain("style-src 'self'")
    expect(csp).not.toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).not.toContain("unsafe-eval")
  })

  it("sends no violation report, because none can be received on this origin", () => {
    expect(csp).not.toContain("report-uri")
    expect(csp).not.toContain("report-to")
    expect(headerValue("Reporting-Endpoints")).toBe("")
    expect(headerValue("Report-To")).toBe("")
  })

  it("requires no trusted type, because the first-party analytics loaders set script.src", () => {
    expect(csp).not.toContain("require-trusted-types-for")
    expect(csp).not.toContain("trusted-types")
  })

  it("relaxes script-src for the dev bundler only", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.resetModules()

    const development = await import("@/lib/site/security-headers")
    const developmentCsp =
      development.securityHeaders.find(
        (header) => header.key === "Content-Security-Policy"
      )?.value ?? ""

    expect(developmentCsp).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    )
    expect(developmentCsp).not.toContain("style-src 'self' 'unsafe-inline'")
  })
})
