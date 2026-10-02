import { JSDOM } from "jsdom"

const ELEMENT_NODE = 1
const TEXT_NODE = 3

const blockTags = new Set([
  "p",
  "div",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "dt",
  "dd",
  "tr",
  "caption",
  "figcaption",
  "table",
  "ul",
  "ol",
  "section",
  "header",
  "footer",
])

const droppedTags = new Set(["script", "style", "annotation"])

function appendVisibleText(node: ParentNode, parts: string[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === TEXT_NODE) {
      parts.push((child.textContent ?? "").replaceAll(/\s+/g, " "))
      continue
    }

    if (child.nodeType !== ELEMENT_NODE) {
      continue
    }

    const element = child as Element
    const tag = element.tagName.toLowerCase()
    if (
      droppedTags.has(tag) ||
      element.classList.contains("sr-only") ||
      element.getAttribute("aria-hidden") === "true"
    ) {
      continue
    }

    const isBlock = blockTags.has(tag)
    if (isBlock) {
      parts.push("\n")
    }
    appendVisibleText(element, parts)
    if (isBlock) {
      parts.push("\n")
    }
  }
}

export function extractArticleText(pageHtml: string): string {
  const dom = new JSDOM(pageHtml)
  const articles = dom.window.document.querySelectorAll("article")

  if (articles.length !== 1) {
    throw new Error(
      `Page carries ${String(articles.length)} <article> elements, expected exactly 1.`
    )
  }

  const article = articles[0]
  if (article === undefined) {
    throw new Error("Page carries 0 <article> elements, expected exactly 1.")
  }

  const parts: string[] = []
  appendVisibleText(article, parts)

  const lines = parts
    .join("")
    .split("\n")
    .map((line) => line.replaceAll(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)

  return lines.join("\n").normalize("NFC")
}
