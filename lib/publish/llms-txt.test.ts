import { describe, expect, it } from "vitest"

import { buildLlmsTxt } from "@/lib/publish/llms-txt"

const input = {
  name: "fiona",
  email: "mail@fiona.sm",
  fingerprint: "4820FA938BA2573DE08E4FAD45B4B5460D72A034",
  algorithm: "Ed25519",
  siteOrigin: "https://fiona.sm",
  publicKeyHref: "/fiona.asc",
  statementHref: "/canary.asc",
  archiveHrefs: [],
}

function pages(text: string): string {
  const start = text.indexOf("## pages")
  return text.slice(start)
}

describe("buildLlmsTxt", () => {
  it("lists every document the site publishes", () => {
    const listed = pages(buildLlmsTxt(input))

    expect(listed).toContain("https://fiona.sm/")
    expect(listed).toContain("https://fiona.sm/fiona.asc")
    expect(listed).toContain("https://fiona.sm/canary.asc")
    expect(listed).toContain("https://fiona.sm/security-policy.txt")
    expect(listed).toContain("https://fiona.sm/.well-known/security.txt")
    expect(listed).toContain(
      "https://fiona.sm/.well-known/openpgpkey/hu/dizb37aqa5h4skgu7jf1xjr4q71w4paq"
    )
    expect(listed).toContain("https://fiona.sm/.well-known/openpgpkey/policy")
    expect(listed).toContain("https://fiona.sm/feed.xml")
    expect(listed).toContain("https://fiona.sm/posts.asc")
  })

  it("points a machine reader at the post manifest and its verification page", () => {
    const listed = pages(buildLlmsTxt(input))

    expect(listed).toContain("https://fiona.sm/blog/verify-posts")
    expect(listed).toContain("https://fiona.sm/posts.asc")
  })

  it("tells a machine reader that the policy is where a disclosure goes", () => {
    const policyLine = buildLlmsTxt(input)
      .split("\n")
      .find((line) => line.includes("/security-policy.txt"))

    expect(policyLine).toMatch(/disclosure/i)
  })

  it("derives the web key directory path from the canary address", () => {
    const listed = buildLlmsTxt({ ...input, email: "joe.doe@example.test" })

    expect(listed).toContain(
      "/.well-known/openpgpkey/hu/iy9q119eutrkn8s1mk4r39qejnbu3n5q"
    )
  })

  it("lists previous statements when the archive is not empty", () => {
    const listed = buildLlmsTxt({
      ...input,
      archiveHrefs: ["/canary/2026-05-27.asc"],
    })

    expect(listed).toContain("## previous statements")
    expect(listed).toContain(
      "- [2026-05-27](https://fiona.sm/canary/2026-05-27.asc): statement signed on 2026-05-27"
    )
  })

  it("ends with a single trailing newline", () => {
    const listed = buildLlmsTxt(input)

    expect(listed.endsWith("\n")).toBe(true)
    expect(listed.endsWith("\n\n")).toBe(false)
  })
})
