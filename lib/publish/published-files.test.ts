import { readFileSync } from "node:fs"
import { join } from "node:path"
import { readSignature } from "openpgp"
import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import { listCanaryArchives } from "@/lib/canary/canary-history"
import {
  buildEmailSignatureHtml,
  buildEmailSignatureText,
  emailSignatureHtmlPath,
  emailSignatureTextPath,
} from "@/lib/publish/email-signature"
import { fingerprintRows } from "@/lib/canary/fingerprint"
import { formatLongDateTime } from "@/lib/iso-date"
import { buildLlmsTxt } from "@/lib/publish/llms-txt"
import {
  binaryFromPublicKey,
  verifiedClearsignedArmor,
  verifyClearsigned,
} from "@/lib/openpgp-armor"
import {
  buildSecurityPolicy,
  securityPolicyHref,
} from "@/lib/publish/security-policy"
import { buildSecurityTxt } from "@/lib/publish/security-txt"
import { buildWkdPolicy, wkdKeyHref, wkdPolicyHref } from "@/lib/publish/wkd"

const root = process.cwd()
const isoInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
const signatureBegin = "-----BEGIN PGP SIGNATURE-----"

function asOfLines(statement: string): (string | undefined)[] {
  return [...statement.matchAll(/^as of (.+):$/gm)].map((match) => match[1])
}

async function signatureCreatedAt(path: string): Promise<Date> {
  const publicKey = readFileSync(join(root, "public/fiona.asc"), "utf8")
  const armored = await verifiedClearsignedArmor(
    readFileSync(join(root, path), "utf8"),
    publicKey
  )
  const begin = armored.indexOf(signatureBegin)

  if (begin === -1) {
    throw new Error(`No signature block in ${path}`)
  }

  const signature = await readSignature({
    armoredSignature: armored.slice(begin),
  })
  const created = signature.packets.at(0)?.created

  if (!(created instanceof Date)) {
    throw new Error(`No signature creation time in ${path}`)
  }

  return created
}

async function cleartextOf(path: string): Promise<string> {
  const raw = readFileSync(join(root, path), "utf8")
  if (!raw.startsWith("-----BEGIN PGP SIGNED MESSAGE-----")) {
    return raw
  }

  const publicKey = readFileSync(join(root, "public/fiona.asc"), "utf8")
  return await verifyClearsigned(raw, publicKey)
}

describe("published files track lib/canary/canary.ts", () => {
  it("canary.asc asserts the signing instant published in lib/canary/canary.ts", async () => {
    const served = await cleartextOf("public/canary.asc")

    expect(canary.signedAt).toMatch(isoInstant)
    expect(Number.isNaN(new Date(canary.signedAt).getTime())).toBe(false)
    expect(new Date(canary.signedAt).toISOString()).toBe(
      `${canary.signedAt.slice(0, 19)}.000Z`
    )
    expect(canary.signedOn).toBe(canary.signedAt.slice(0, 10))
    expect(asOfLines(served)).toEqual([formatLongDateTime(canary.signedAt)])
  })

  it("canary.asc signature packet matches the exact instant it claims", async () => {
    const created = await signatureCreatedAt("public/canary.asc")

    expect(created.toISOString()).toBe(`${canary.signedAt.slice(0, 19)}.000Z`)
  })

  it("security.txt matches the canary and does not expire before renew-by", async () => {
    const served = await cleartextOf("public/.well-known/security.txt")
    expect(served.trimEnd()).toBe(
      buildSecurityTxt({
        email: canary.email,
        fingerprint: canary.fingerprint,
        siteOrigin: canary.siteOrigin,
        publicKeyHref: canary.publicKeyHref,
        expires: canary.renewBy,
        policyUrl: `${canary.siteOrigin}${securityPolicyHref}`,
      }).trimEnd()
    )
    expect(served).toContain(`Expires: ${canary.renewBy}T23:59:59.000Z`)
  })

  it("security-policy.txt matches the canary", () => {
    const served = readFileSync(
      join(root, `public${securityPolicyHref}`),
      "utf8"
    )
    expect(served.trimEnd()).toBe(
      buildSecurityPolicy({
        name: canary.name,
        email: canary.email,
        fingerprint: canary.fingerprint,
        siteOrigin: canary.siteOrigin,
        publicKeyHref: canary.publicKeyHref,
        statementHref: canary.statementHref,
      }).trimEnd()
    )
  })

  it("llms.txt matches the canary and the archive list", () => {
    const served = readFileSync(join(root, "public/llms.txt"), "utf8")
    expect(served.trimEnd()).toBe(
      buildLlmsTxt({
        name: canary.displayName,
        email: canary.email,
        fingerprint: canary.fingerprint,
        algorithm: canary.algorithm,
        siteOrigin: canary.siteOrigin,
        publicKeyHref: canary.publicKeyHref,
        statementHref: canary.statementHref,
        archiveHrefs: listCanaryArchives().map((archive) => archive.href),
      }).trimEnd()
    )
  })

  it("the pasteable signature files match the canary", () => {
    const input = {
      fingerprint: canary.fingerprint,
      siteOrigin: canary.siteOrigin,
    }

    expect(readFileSync(join(root, emailSignatureTextPath), "utf8")).toBe(
      buildEmailSignatureText(input)
    )
    expect(readFileSync(join(root, emailSignatureHtmlPath), "utf8")).toBe(
      buildEmailSignatureHtml(input)
    )
  })

  it("humans.txt names the identity published in lib/canary/canary.ts", () => {
    const served = readFileSync(join(root, "public/humans.txt"), "utf8")

    expect(served).toContain(`Name: ${canary.displayName}`)
    expect(served).toContain(`Contact: ${canary.email}`)
    expect(served).toContain(`Site: ${canary.siteOrigin}`)
    expect(served).toContain(`Key: ${canary.algorithm}`)
    expect(served).toContain(canary.statementHref)
    expect(served).toContain(canary.publicKeyHref)
    expect(served).toContain(securityPolicyHref)
    expect(served).toContain(`gpg --locate-keys ${canary.email}`)
  })

  it("humans.txt stays free of the fingerprint and dates nothing tests", () => {
    const served = readFileSync(join(root, "public/humans.txt"), "utf8")

    expect(served).not.toContain(canary.fingerprint)
    expect(served).not.toContain(fingerprintRows(canary.fingerprint).top)
    expect(served).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it("the wkd key is the binary form of the published key", async () => {
    const served = readFileSync(join(root, `public${wkdKeyHref(canary.email)}`))
    expect(new Uint8Array(served)).toStrictEqual(
      await binaryFromPublicKey(canary.publicKey)
    )
  })

  it("the wkd policy file names the canary mail domain", () => {
    const served = readFileSync(join(root, `public${wkdPolicyHref}`), "utf8")
    expect(served).toBe(buildWkdPolicy(canary.email))
  })
})
