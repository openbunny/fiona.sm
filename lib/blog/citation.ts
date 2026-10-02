import type { BlogPost } from "@/lib/blog/posts"
import { absoluteUrl, site } from "@/lib/site/site"

export type Citation = {
  readonly post: BlogPost
  readonly sha256?: string | undefined
  readonly manifestSignedOn?: string | undefined
}

export function citationUrl(post: BlogPost): string {
  return absoluteUrl(post.href)
}

export function citationYear(post: BlogPost): string {
  return post.date.slice(0, 4)
}

export function citationKey(post: BlogPost): string {
  return `${site.name}${citationYear(post)}${post.slug.replaceAll(/[^a-z0-9]/g, "")}`
}

function integrityNote(citation: Citation): string | undefined {
  const { sha256, manifestSignedOn } = citation
  if (sha256 === undefined || manifestSignedOn === undefined) {
    return undefined
  }

  return `sha-256 ${sha256}, signed ${manifestSignedOn} in ${absoluteUrl("/posts.asc")}`
}

export function plainCitation(citation: Citation): string {
  const { post } = citation
  const note = integrityNote(citation)
  const base = `${site.name}. ${post.date}. "${post.title}". ${citationUrl(post)}.`

  return note === undefined ? base : `${base} ${note}.`
}

export function bibtexCitation(citation: Citation): string {
  const { post } = citation
  const note = integrityNote(citation)
  const fields = [
    ["author", site.name],
    ["title", post.title],
    ["year", citationYear(post)],
    ["howpublished", citationUrl(post)],
    ["url", citationUrl(post)],
    ["urldate", post.date],
    ...(note === undefined ? [] : [["note", note]]),
  ] as const

  const body = fields
    .map(([name, value]) => `  ${name.padEnd(12)} = {${value}}`)
    .join(",\n")

  return `@misc{${citationKey(post)},\n${body}\n}`
}
