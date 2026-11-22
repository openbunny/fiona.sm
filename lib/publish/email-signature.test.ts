/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest"

import {
  buildEmailSignatureHtml,
  buildEmailSignatureText,
  emailSignatureHtmlPath,
  emailSignatureTextPath,
} from "@/lib/publish/email-signature"

const input = {
  fingerprint: "4820FA938BA2573DE08E4FAD45B4B5460D72A034",
  siteOrigin: "https://fiona.sm",
}

const rotated = {
  fingerprint: "1a2b3c4d5e6f708192a3b4c5d6e7f80912233445",
  siteOrigin: "https://fiona.sm",
}

const approved = [
  "---",
  "",
  "Please find my PGP key attached. Other attachments may include signatures for transmitted files.",
  "Fingerprint: 4820 FA93 8BA2 573D E08E  4FAD 45B4 B546 0D72 A034",
  "Key and signed canary: https://fiona.sm/canary",
  "",
  "This email contains confidential information. Unauthorized disclosure or distribution is prohibited. Opinions expressed are for informational purposes only and do not constitute investment, financial, tax, legal, or medical advice.",
  "",
].join("\n")

function parsed(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html")
}

describe("buildEmailSignatureText", () => {
  it("reproduces the approved wording exactly", () => {
    expect(buildEmailSignatureText(input)).toBe(approved)
  })

  it("opens with the approved three-hyphen separator", () => {
    const lines = buildEmailSignatureText(input).split("\n")

    expect(lines[0]).toBe("---")
    expect(lines[1]).toBe("")
  })

  it("ends with a single trailing newline", () => {
    const text = buildEmailSignatureText(input)

    expect(text.endsWith("\n")).toBe(true)
    expect(text.endsWith("\n\n")).toBe(false)
  })

  it("groups the fingerprint five and five with a double space", () => {
    expect(buildEmailSignatureText(rotated)).toContain(
      "Fingerprint: 1A2B 3C4D 5E6F 7081 92A3  B4C5 D6E7 F809 1223 3445"
    )
  })

  it("carries no fingerprint the input did not give it", () => {
    expect(buildEmailSignatureText(rotated)).not.toContain("4820")
  })

  it("rejects a fingerprint that is not forty hex characters", () => {
    expect(() =>
      buildEmailSignatureText({ ...input, fingerprint: "4820FA93" })
    ).toThrow(/40 hex/)
  })
})

describe("buildEmailSignatureHtml", () => {
  it("carries the approved sentences unedited", () => {
    const html = parsed(buildEmailSignatureHtml(input))
    const read = html.body.textContent ?? ""

    expect(read).toContain(
      "please find my pgp key attached. other attachments may include signatures for transmitted files."
    )
    expect(read).toContain(
      "this email contains confidential information. unauthorised disclosure or distribution is prohibited. opinions expressed are for informational purposes only and do not constitute investment, financial, tax, legal, or medical advice."
    )
    expect(read.trimStart().startsWith("--")).toBe(true)
  })

  it("prints the same grouped fingerprint the text form prints", () => {
    const read = parsed(buildEmailSignatureHtml(rotated)).body.textContent ?? ""

    expect(read.replaceAll("\u00a0", " ")).toContain(
      "1A2B 3C4D 5E6F 7081 92A3  B4C5 D6E7 F809 1223 3445"
    )
  })

  it("survives a parse unchanged, so no tag is malformed or badly nested", () => {
    const html = buildEmailSignatureHtml(input)

    expect(parsed(html).body.innerHTML).toBe(html)
  })

  it("styles every element inline, with no stylesheet to strip", () => {
    const html = buildEmailSignatureHtml(input)
    const elements = [...parsed(html).body.querySelectorAll("*")]

    expect(elements.length).toBeGreaterThan(0)
    expect(html).not.toContain("<style")
    expect(html).not.toContain("<link")
    expect(html).not.toContain("<script")
    expect(html).not.toContain("class=")
    expect(html).not.toContain("id=")
    for (const element of elements) {
      if (element.tagName === "A") {
        continue
      }
      expect(element.getAttribute("style")).toBeTruthy()
    }
  })

  it("asks for no font, image, or origin it cannot be sure of", () => {
    const html = buildEmailSignatureHtml(input)

    expect(html).not.toContain("@font-face")
    expect(html).not.toContain("url(")
    expect(html).not.toContain("<img")
    expect(html).not.toContain("Playfair")
    expect(html).not.toContain("JetBrains")
    expect(html.match(/https?:\/\/[^\s"<]+/g)).toStrictEqual([
      input.siteOrigin,
      input.siteOrigin,
    ])
  })

  it("links the canary at the origin the canary publishes", () => {
    const link = parsed(buildEmailSignatureHtml(input)).body.querySelector("a")

    expect(link?.getAttribute("href")).toBe(input.siteOrigin)
    expect(link?.textContent).toBe(input.siteOrigin)
  })

  it("keeps each half of the fingerprint unbreakable", () => {
    const halves = [
      ...parsed(buildEmailSignatureHtml(input)).body.querySelectorAll("span"),
    ]

    expect(halves).toHaveLength(2)
    for (const half of halves) {
      const style = half.getAttribute("style") ?? ""
      expect(style).toContain("white-space: nowrap")
      expect(style).toContain("ui-monospace, SFMono-Regular, Menlo, monospace")
    }
    expect(halves[0]?.textContent).toBe("4820 FA93 8BA2 573D E08E")
    expect(halves[1]?.textContent).toBe("4FAD 45B4 B546 0D72 A034")
  })

  it("sets no colour, so a client that inverts for dark mode stays readable", () => {
    expect(buildEmailSignatureHtml(input)).not.toMatch(/(?:^|[^-])color:/)
  })

  it("ends with a single trailing newline", () => {
    const html = buildEmailSignatureHtml(input)

    expect(html.endsWith(">\n")).toBe(true)
  })

  it("refuses an origin that is not a plain https origin", () => {
    expect(() =>
      buildEmailSignatureHtml({
        ...input,
        siteOrigin: 'https://fiona.sm/"><script>',
      })
    ).toThrow(/https/)
    expect(() =>
      buildEmailSignatureText({ ...input, siteOrigin: "http://fiona.sm" })
    ).toThrow(/https/)
  })
})

describe("the disclaimer", () => {
  it("preserves the approved US spelling in plain text", () => {
    expect(buildEmailSignatureText(input)).toContain("Unauthorized disclosure")
    expect(buildEmailSignatureText(input)).not.toContain(
      "unauthorised disclosure"
    )
  })

  it("preserves the original British spelling in HTML", () => {
    expect(parsed(buildEmailSignatureHtml(input)).body.textContent).toContain(
      "unauthorised disclosure"
    )
    expect(buildEmailSignatureHtml(input)).not.toContain("Unauthorized")
  })
})

describe("the signature files", () => {
  it("sit at the repository root, not under public/", () => {
    expect(emailSignatureTextPath).toBe("signature.txt")
    expect(emailSignatureHtmlPath).toBe("signature.html")
  })
})
