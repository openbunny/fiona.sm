import type { Metadata } from "next"
import type { ReactElement } from "react"

import { notFound } from "next/navigation"

import { BlogIndex } from "@/components/blog/blog-index"
import { blogPageCount, blogPageHref, blogPostsForPage } from "@/lib/blog/posts"
import { routeSocialMetadata } from "@/lib/site/metadata"
import { site } from "@/lib/site/site"

export const dynamicParams = false

type BlogPageParams = { readonly page: string }

export async function generateStaticParams(): Promise<BlogPageParams[]> {
  const extraPageCount = blogPageCount()
  return Array.from({ length: Math.max(0, extraPageCount) }, (_, index) => ({
    page: String(index + 1),
  }))
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<BlogPageParams>
}): Promise<Metadata> {
  const { page } = await params
  const title = `blog — page ${page}`
  const description = "posts, newest first."
  const path = blogPageHref(Number(page))

  return {
    title: { absolute: `${site.possessive} ${title}` },
    description,
    alternates: { canonical: path },
    ...routeSocialMetadata({ title, description, path, type: "website" }),
  }
}

export default async function BlogPageByNumber({
  params,
}: {
  readonly params: Promise<BlogPageParams>
}): Promise<ReactElement> {
  const { page } = await params
  const pageNumber = Number(page)
  const posts = blogPostsForPage(pageNumber)

  if (posts === null) {
    notFound()
  }

  return (
    <BlogIndex page={pageNumber} pageCount={blogPageCount()} posts={posts} />
  )
}
