import { fingerprintRows } from "@/lib/canary/fingerprint"
import { joinOrigin } from "@/lib/publish/url"

export const securityPolicyHref = "/security-policy.txt"

export type SecurityPolicyInput = {
  readonly name: string
  readonly email: string
  readonly fingerprint: string
  readonly siteOrigin: string
  readonly publicKeyHref: string
  readonly statementHref: string
}

export function buildSecurityPolicy(input: SecurityPolicyInput): string {
  const rows = fingerprintRows(input.fingerprint)
  const url = (href: string): string => joinOrigin(input.siteOrigin, href)

  return [
    "vulnerability disclosure policy",
    "",
    `Contact: mailto:${input.email}`,
    `Encryption: ${url(input.publicKeyHref)}`,
    `Fingerprint: ${rows.top}  ${rows.bottom}`,
    "",
    "## what this site is",
    "",
    `${input.siteOrigin} is a personal site that includes a static pgp key`,
    `canary at ${url("/canary")}. there is no account system, no database, no`,
    "user data, and no production secrets. the live document is the",
    `clearsigned statement at ${url(input.statementHref)}, not the rendered`,
    "page.",
    "",
    "## who checks this canary",
    "",
    "nobody does on your behalf. no third party monitors this canary, and no",
    "watchdog anywhere will announce that it stopped renewing. the automated",
    "checks that exist report privately to the person who runs this site,",
    "who is the one party unable to answer in the situation a canary exists",
    "for. your own check is the only check.",
    "",
    "it is not much work. the page marks itself expired against your own",
    "device's clock, so a deployment nobody has touched turns its own warning",
    `on, and the statement at ${url(input.statementHref)} names the renew-by`,
    "date to read. keep a copy of the last statement you verified, so a later",
    "silence has something to be measured against.",
    "",
    `${input.siteOrigin} is also the only place this statement is published.`,
    "if the domain lapses or the deployment goes away, the expired notice",
    "goes with it, and a name that no longer resolves looks nothing like a",
    "canary that went stale. treat an unreachable site as no signal rather",
    "than as a good one.",
    "",
    "## reporting",
    "",
    `email ${input.email}. encrypt anything sensitive to the key above.`,
    "say what you did, what you saw, and how to reproduce it. reports are",
    "read by one person; expect a reply within seven days.",
    "",
    "## in scope",
    "",
    "- the published files: the statement, the public key, the signed",
    "  security.txt, and the statement archive",
    "- transport security and response headers on those paths",
    "- anything that would let a third party publish a statement, a key, or",
    "  a fingerprint under this identity",
    "",
    "## out of scope",
    "",
    "- a statement that no longer verifies because it expired. silence is",
    "  the signal; that is the canary working as designed",
    "- denial of service, volumetric testing, and scanner output with no",
    "  demonstrated impact",
    "- findings in the hosting platform itself. report those to the host",
    "",
    "## rules",
    "",
    "do not modify or destroy data, do not access accounts that are not",
    "yours, and do not degrade availability for other readers. testing your",
    "own requests against public endpoints is fine.",
    "",
    "## rewards",
    "",
    "there is no bug bounty. credit is offered on request.",
    "",
    "## disclosure",
    "",
    "coordinated. ninety days before publishing, or sooner by agreement.",
    "",
  ].join("\n")
}
