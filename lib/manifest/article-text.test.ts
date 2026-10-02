import { describe, expect, it } from "vitest"

import { extractArticleText } from "@/lib/manifest/article-text"

function page(articleInner: string): string {
  return `<!DOCTYPE html><html><body><main><article class="mt-8 flex flex-col gap-5">${articleInner}</article></main></body></html>`
}

describe("extractArticleText", () => {
  it("joins paragraph text with no separator between adjacent tags", () => {
    const html = page("<p>first paragraph.</p><p>second paragraph.</p>")
    expect(extractArticleText(html)).toBe("first paragraph.\nsecond paragraph.")
  })

  it("collapses internal whitespace runs to a single space", () => {
    const html = page("<p>a   b\tc\n  d</p>")
    expect(extractArticleText(html)).toBe("a b c d")
  })

  it("trims leading and trailing whitespace from each line", () => {
    const html = page("<p>\n  padded text  \n</p>")
    expect(extractArticleText(html)).toBe("padded text")
  })

  it("drops react's empty text-separator comments", () => {
    const html = page('<p>before<!-- --> <a href="#x">[1]</a>.</p>')
    expect(extractArticleText(html)).toBe("before [1].")
  })

  it("strips a MathML annotation carrying the raw TeX source", () => {
    const html = page(
      '<p>wants <math><semantics><mrow><mi>P</mi></mrow><annotation encoding="application/x-tex">P(C)</annotation></semantics></math>.</p>'
    )
    expect(extractArticleText(html)).toBe("wants P.")
  })

  it("strips an element hidden from assistive technology", () => {
    const html = page(
      '<p>visible <span aria-hidden="true">decoration</span>text</p>'
    )
    expect(extractArticleText(html)).toBe("visible text")
  })

  it("keeps a copy control's caption and a shell prompt out of the text", () => {
    const html = page(
      '<pre><span aria-hidden="true" class="select-none">$</span>brew install tickerbox-cli<button><span aria-hidden="true">copy</span></button></pre>'
    )
    expect(extractArticleText(html)).toBe("brew install tickerbox-cli")
  })

  it("keeps an element whose aria-hidden is not the string true", () => {
    const html = page('<p>kept <span aria-hidden="false">visible</span></p>')
    expect(extractArticleText(html)).toBe("kept visible")
  })

  it("strips an element carrying the sr-only class", () => {
    const html = page(
      '<p>visible <span class="sr-only">hidden from sighted readers</span>text</p>'
    )
    expect(extractArticleText(html)).toBe("visible text")
  })

  it("drops a decorative aria-hidden glyph", () => {
    const html = page('<p>back<span aria-hidden="true">^</span></p>')
    expect(extractArticleText(html)).toBe("back")
  })

  it("separates list items onto their own lines", () => {
    const html = page("<ul><li>one</li><li>two</li></ul>")
    expect(extractArticleText(html)).toBe("one\ntwo")
  })

  it("separates a display equation's wrapping div from surrounding prose", () => {
    const html = page(
      '<p>before</p><div tabindex="0"><math><mrow><mi>x</mi></mrow></math></div><p>after</p>'
    )
    expect(extractArticleText(html)).toBe("before\nx\nafter")
  })

  it("normalises combining-character text to NFC", () => {
    const precomposed = "café"
    const decomposed = "café"
    expect(decomposed).not.toBe(precomposed)
    expect(extractArticleText(page(`<p>${decomposed}</p>`))).toBe(precomposed)
  })

  it("throws when the page has no <article> element", () => {
    const html = "<!DOCTYPE html><html><body><main></main></body></html>"
    expect(() => extractArticleText(html)).toThrow(
      /carries 0 <article> elements, expected exactly 1/
    )
  })

  it("throws when the page has more than one <article> element", () => {
    const html =
      "<!DOCTYPE html><html><body><article>a</article><article>b</article></body></html>"
    expect(() => extractArticleText(html)).toThrow(
      /carries 2 <article> elements, expected exactly 1/
    )
  })

  it("drops an empty line left by stripped or whitespace-only content", () => {
    const html = page('<p>kept</p><p><span class="sr-only">gone</span></p>')
    expect(extractArticleText(html)).toBe("kept")
  })
})
