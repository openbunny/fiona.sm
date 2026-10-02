import { describe, expect, it } from "vitest"

import { buildSecurityTxt } from "@/lib/publish/security-txt"

const input = {
  email: "mail@fiona.sm",
  fingerprint: "4820FA938BA2573DE08E4FAD45B4B5460D72A034",
  siteOrigin: "https://fiona.sm",
  publicKeyHref: "/fiona.asc",
  expires: "2026-11-23",
  policyUrl: "https://fiona.sm/security-policy.txt",
}

describe("buildSecurityTxt", () => {
  it("emits the RFC 9116 fields, with Expires as an instant", () => {
    expect(buildSecurityTxt(input)).toBe(
      [
        "Contact: mailto:mail@fiona.sm",
        "Expires: 2026-11-23T23:59:59.000Z",
        "Encryption: https://fiona.sm/fiona.asc",
        "Encryption: openpgp4fpr:4820fa938ba2573de08e4fad45b4b5460d72a034",
        "Policy: https://fiona.sm/security-policy.txt",
        "Preferred-Languages: en",
        "Canonical: https://fiona.sm/.well-known/security.txt",
        "",
      ].join("\n")
    )
  })

  it.each([
    ["an empty string", ""],
    ["an instant rather than a date", "2026-11-23T00:00:00Z"],
    ["a two digit year", "26-11-23"],
    ["a slashed date", "2026/11/23"],
    ["a date with trailing text", "2026-11-23 and a bit"],
    ["prose", "next November"],
  ])("refuses %s as Expires", (_label, expires) => {
    expect(() => buildSecurityTxt({ ...input, expires })).toThrow(
      "Expires must be an ISO date"
    )
  })
})
