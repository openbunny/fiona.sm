import { existsSync, readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import { listCanaryArchives } from "@/lib/canary/canary-history"
import { fingerprintRows } from "@/lib/canary/fingerprint"
import { daysUntil, formatLongDate, formatLongDateTime } from "@/lib/iso-date"
import { proofOfDateCommands } from "@/lib/canary/proof-of-date"
import { isRelativeAssetPath } from "@/lib/site/site"
import { verifyCommands } from "@/lib/canary/verify-commands"

const CANARY_HTML = ".next/server/app/canary.html"

function requireBuildOutput(exists: boolean): void {
  if (!exists) {
    throw new Error(
      `${CANARY_HTML} does not exist. This test asserts the no-JS content of the prerendered "/canary" page, so it has nothing to check without a production build: run \`bun run build\` first. In \`bun run check\` and in CI a build always precedes it, so a missing file is a real failure rather than a reason to skip.`
    )
  }
}

function stripForNoScript(html: string): string {
  return html
    .replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replaceAll(/<\/?noscript\b[^>]*>/gi, "")
}

const HIDDEN_ATTRIBUTE = /(?<!aria-)\bhidden[=\s>]/
const INLINE_DISPLAY_NONE = /display:\s*none/

function withoutClassValues(html: string): string {
  return html.replaceAll(/\bclass\s*=\s*("[^"]*"|'[^']*')/gi, "")
}

function unescapeHtml(html: string): string {
  return html
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#x2F;", "/")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&")
}

describe("no-JS content of /canary", () => {
  it("carries every critical string once scripts and noscript wrappers are stripped", () => {
    requireBuildOutput(existsSync(CANARY_HTML))
    const html = unescapeHtml(
      stripForNoScript(readFileSync(CANARY_HTML, "utf8"))
    )

    const archives = listCanaryArchives().filter((archive) =>
      isRelativeAssetPath(archive.href)
    )
    const hasHistory = archives.length > 0
    const rows = fingerprintRows(canary.fingerprint)
    const windowDays = daysUntil(canary.renewBy, canary.signedOn)

    const critical = [
      canary.displayName,
      canary.email,
      canary.algorithm,
      canary.fingerprint,
      rows.top,
      rows.bottom,
      formatLongDateTime(canary.signedAt),
      formatLongDate(canary.signedOn),
      formatLongDate(canary.renewBy),
      `${String(windowDays)}-day window`,
      canary.moneroBlockHash,
      String(canary.moneroBlockHeight),
      canary.statementHref,
      canary.publicKeyHref,
      ...verifyCommands(canary.siteOrigin, canary.fingerprint),
      ...proofOfDateCommands(canary.moneroBlockHeight),
    ]

    if (hasHistory) {
      critical.push(
        ...archives.map((archive) => formatLongDate(archive.signedOn))
      )
    }

    for (const text of critical) {
      expect(html, `missing without JS: ${text.slice(0, 48)}`).toContain(text)
    }
  })

  it("never hides critical content with a literal HTML attribute or inline style", () => {
    requireBuildOutput(existsSync(CANARY_HTML))
    const html = withoutClassValues(
      stripForNoScript(readFileSync(CANARY_HTML, "utf8"))
    ).replaceAll(/<div hidden="">(?:<!--\$-->|<!--\/\$-->)*<\/div>/g, "")

    expect(html).not.toMatch(HIDDEN_ATTRIBUTE)
    expect(html).not.toMatch(INLINE_DISPLAY_NONE)
  })
})
