import type { Metadata } from "next"
import type { ReactElement } from "react"

import { BlogIndex } from "@/components/blog/blog-index"
import { blogPageCount, blogPostsForPage } from "@/lib/blog/posts"
import { routeSocialMetadata } from "@/lib/site/metadata"
import { site } from "@/lib/site/site"

const title = "blog"
const description = "posts, newest first."

export const metadata: Metadata = {
  title: { absolute: `${site.possessive} ${title}` },
  description,
  alternates: { canonical: "/blog" },
  ...routeSocialMetadata({
    title,
    description,
    path: "/blog",
    type: "website",
  }),
}

const PAGE = 1

export default function BlogPage(): ReactElement {
  const pageCount = blogPageCount()
  const posts = blogPostsForPage(PAGE) ?? []

  return <BlogIndex page={PAGE} pageCount={pageCount} posts={posts} />
}
