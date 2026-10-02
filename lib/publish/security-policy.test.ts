import { describe, expect, it } from "vitest"

import {
  buildSecurityPolicy,
  securityPolicyHref,
} from "@/lib/publish/security-policy"

const input = {
  name: "fiona",
  email: "mail@fiona.sm",
  fingerprint: "4820FA938BA2573DE08E4FAD45B4B5460D72A034",
  siteOrigin: "https://fiona.sm",
  publicKeyHref: "/fiona.asc",
  statementHref: "/canary.asc",
}

function section(text: string, heading: string): string {
  const start = text.indexOf(`## ${heading}\n`)

  if (start === -1) {
    throw new Error(`No "${heading}" section in the policy`)
  }

  const body = text.slice(start + heading.length + 4)
  const end = body.indexOf("\n## ")

  return end === -1 ? body : body.slice(0, end)
}

describe("securityPolicyHref", () => {
  it("is a same-origin relative path", () => {
    expect(securityPolicyHref).toBe("/security-policy.txt")
  })
})

describe("buildSecurityPolicy", () => {
  it("names the contact address and the published key", () => {
    const text = buildSecurityPolicy(input)

    expect(text).toContain("mailto:mail@fiona.sm")
    expect(text).toContain("https://fiona.sm/fiona.asc")
    expect(text).toContain("4820 FA93 8BA2 573D E08E  4FAD 45B4 B546 0D72 A034")
  })

  it("points readers at the signed statement, not the page", () => {
    expect(buildSecurityPolicy(input)).toContain("https://fiona.sm/canary.asc")
  })

  it("rejects a fingerprint that is not forty hex characters", () => {
    expect(() =>
      buildSecurityPolicy({ ...input, fingerprint: "AE1B" })
    ).toThrow(/fingerprint/)
  })

  it("ends with a single trailing newline", () => {
    const text = buildSecurityPolicy(input)

    expect(text.endsWith("\n")).toBe(true)
    expect(text.endsWith("\n\n")).toBe(false)
  })
})

describe("the monitoring disclaimer", () => {
  it("says that no third party monitors the canary", () => {
    const watchers = section(
      buildSecurityPolicy(input),
      "who checks this canary"
    )

    expect(watchers).toContain("no third party monitors this canary")
    expect(watchers).toContain("your own check is the only check")
  })

  it("says the site is the only place the statement is published", () => {
    const watchers = section(
      buildSecurityPolicy(input),
      "who checks this canary"
    )

    expect(watchers).toContain(
      "https://fiona.sm is also the only place this statement is published."
    )
  })

  it("names the origin it was built for rather than a fixed host", () => {
    const watchers = section(
      buildSecurityPolicy({
        ...input,
        siteOrigin: "https://example.test",
        statementHref: "/statement.asc",
      }),
      "who checks this canary"
    )

    expect(watchers).toContain("https://example.test/statement.asc")
    expect(watchers).toContain("https://example.test is also the only place")
    expect(watchers).not.toContain("fiona.sm")
  })
})
