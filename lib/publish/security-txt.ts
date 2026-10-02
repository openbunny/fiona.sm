import { joinOrigin } from "@/lib/publish/url"

export const securityTxtHref = "/.well-known/security.txt"

export type SecurityTxtInput = {
  readonly email: string
  readonly fingerprint: string
  readonly siteOrigin: string
  readonly publicKeyHref: string
  readonly expires: string
  readonly policyUrl: string
}

export function buildSecurityTxt(input: SecurityTxtInput): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expires)) {
    throw new Error("Expires must be an ISO date")
  }

  return [
    `Contact: mailto:${input.email}`,
    `Expires: ${input.expires}T23:59:59.000Z`,
    `Encryption: ${joinOrigin(input.siteOrigin, input.publicKeyHref)}`,
    `Encryption: openpgp4fpr:${input.fingerprint.toLowerCase()}`,
    `Policy: ${input.policyUrl}`,
    "Preferred-Languages: en",
    `Canonical: ${joinOrigin(input.siteOrigin, securityTxtHref)}`,
    "",
  ].join("\n")
}
