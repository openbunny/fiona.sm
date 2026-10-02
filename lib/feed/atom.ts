type AtomFeedEntry = {
  readonly id: string
  readonly title: string
  readonly href: string
  readonly updated: string
}

export type AtomFeedInput = {
  readonly id: string
  readonly title: string
  readonly href: string
  readonly selfHref: string
  readonly updated: string
  readonly authorName: string
  readonly authorEmail: string
  readonly entries: readonly AtomFeedEntry[]
}

function escapeXmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function escapeXmlAttr(value: string): string {
  return escapeXmlText(value).replaceAll('"', "&quot;")
}

function buildEntry(entry: AtomFeedEntry): string {
  return [
    "  <entry>",
    `    <id>${escapeXmlText(entry.id)}</id>`,
    `    <title>${escapeXmlText(entry.title)}</title>`,
    `    <link rel="alternate" href="${escapeXmlAttr(entry.href)}" />`,
    `    <updated>${entry.updated}</updated>`,
    "  </entry>",
  ].join("\n")
}

export function buildAtomFeed(input: AtomFeedInput): string {
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <id>${escapeXmlText(input.id)}</id>`,
    `  <title>${escapeXmlText(input.title)}</title>`,
    `  <updated>${input.updated}</updated>`,
    `  <link rel="alternate" href="${escapeXmlAttr(input.href)}" />`,
    `  <link rel="self" type="application/atom+xml" href="${escapeXmlAttr(input.selfHref)}" />`,
    "  <author>",
    `    <name>${escapeXmlText(input.authorName)}</name>`,
    `    <email>${escapeXmlText(input.authorEmail)}</email>`,
    "  </author>",
    ...input.entries.map(buildEntry),
    "</feed>",
  ]

  return `${lines.join("\n")}\n`
}
