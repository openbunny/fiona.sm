import type { Metadata } from "next"

import { requirePostBySlug } from "@/lib/blog/posts"
import { citationMetadata, routeSocialMetadata } from "@/lib/site/metadata"

export function postMetadata({
  slug,
  description,
}: {
  readonly slug: string
  readonly description: string
}): Metadata {
  const post = requirePostBySlug(slug)

  return {
    title: post.title,
    description,
    alternates: { canonical: post.href },
    ...routeSocialMetadata({
      title: post.title,
      description,
      path: post.href,
      type: "article",
    }),
    other: citationMetadata({
      title: post.title,
      path: post.href,
      publishedOn: post.date,
    }),
  }
}
