/** @vitest-environment jsdom */

import { renderToReadableStream } from "react-dom/server"
import { describe, expect, it } from "vitest"

import Page from "@/app/canary/page"
import { canary } from "@/lib/canary/canary"
import { listCanaryArchives } from "@/lib/canary/canary-history"
import { fingerprintRows } from "@/lib/canary/fingerprint"
import { daysUntil, formatLongDate, formatLongDateTime } from "@/lib/iso-date"
import { proofOfDateCommands } from "@/lib/canary/proof-of-date"
import { siteLastChangedAt } from "@/lib/site/commit-date"
import { isRelativeAssetPath } from "@/lib/site/site"
import { verifyCommands } from "@/lib/canary/verify-commands"

function stripForNoScript(html: string): string {
  return html
    .replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replaceAll(/<\/?noscript\b[^>]*>/gi, "")
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

async function renderRawHtml(): Promise<string> {
  const stream = await renderToReadableStream(<Page />)
  await stream.allReady
  return new Response(stream).text()
}

describe("Page without JavaScript", () => {
  it("carries every critical string once scripts and noscript wrappers are stripped", async () => {
    const html = unescapeHtml(stripForNoScript(await renderRawHtml()))

    const archives = listCanaryArchives().filter((archive) =>
      isRelativeAssetPath(archive.href)
    )
    const hasHistory = archives.length > 0
    const rows = fingerprintRows(canary.fingerprint)
    const windowDays = daysUntil(canary.renewBy, canary.signedOn)

    const lastChangedAt = siteLastChangedAt()

    const critical = [
      `site last changed ${formatLongDate(lastChangedAt.slice(0, 10))}`,
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

  it("gates every copy button behind js-only", async () => {
    const html = await renderRawHtml()

    expect(html.match(/\bjs-only\b/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })
})
