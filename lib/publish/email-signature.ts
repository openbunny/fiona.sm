import { fingerprintRows } from "@/lib/canary/fingerprint"

export const emailSignatureTextPath = "signature.txt"
export const emailSignatureHtmlPath = "signature.html"

export type EmailSignatureInput = {
  readonly fingerprint: string
  readonly siteOrigin: string
}

const attachmentLine =
  "please find my pgp key attached. other attachments may include signatures for transmitted files."

const canaryLabel = "Key and signed canary: "

const disclaimer =
  "this email contains confidential information. unauthorised disclosure or distribution is prohibited. opinions expressed are for informational purposes only and do not constitute investment, financial, tax, legal, or medical advice."

const proseStyle =
  "font-family: Georgia, 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.5"

const fingerprintStyle =
  "font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap"

function assertOrigin(siteOrigin: string): string {
  if (!/^https:\/\/[a-z0-9.-]+$/.test(siteOrigin)) {
    throw new Error("Site origin must be an https origin with no path")
  }

  return siteOrigin
}

export function buildEmailSignatureText(input: EmailSignatureInput): string {
  const rows = fingerprintRows(input.fingerprint)

  return [
    "--",
    "",
    attachmentLine,
    `Fingerprint: ${rows.top}  ${rows.bottom}`,
    `${canaryLabel}${assertOrigin(input.siteOrigin)}`,
    "",
    disclaimer,
    "",
  ].join("\n")
}

export function buildEmailSignatureHtml(input: EmailSignatureInput): string {
  const rows = fingerprintRows(input.fingerprint)
  const origin = assertOrigin(input.siteOrigin)
  const half = (group: string): string =>
    `<span style="${fingerprintStyle}">${group}</span>`

  return [
    `<div style="${proseStyle}">`,
    `  <p style="margin: 0 0 14px">--</p>`,
    `  <p style="margin: 0 0 3px">${attachmentLine}</p>`,
    `  <p style="margin: 0 0 3px">Fingerprint: ${half(rows.top)}&nbsp; ${half(rows.bottom)}</p>`,
    `  <p style="margin: 0 0 14px">${canaryLabel}<a href="${origin}">${origin}</a></p>`,
    `  <p style="margin: 0; font-size: 12px">${disclaimer}</p>`,
    "</div>",
    "",
  ].join("\n")
}
