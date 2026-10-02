import { ChevronIcon, PageShell, PlateHeader } from "@openbunny/react"
import type { ReactElement } from "react"

import Link from "next/link"

import { SiteBar } from "@/components/site-bar"
import { SiteFooter } from "@/components/site-footer"
import { formatLongDate } from "@/lib/iso-date"
import { blogPageHref, type BlogPost } from "@/lib/blog/posts"
import { BLOG_PLATE } from "@/lib/images/plates"
import { linkLabel } from "@/lib/site/navigation"

export function BlogIndex({
  page,
  pageCount,
  posts,
}: {
  readonly page: number
  readonly pageCount: number
  readonly posts: readonly BlogPost[]
}): ReactElement {
  const hasPager = pageCount > 1
  const hasPrevious = page > 1
  const hasNext = page < pageCount

  return (
    <PageShell>
      <SiteBar route={blogPageHref(page)} />
      <PlateHeader asset={BLOG_PLATE} plateClassName="w-[250px]" />
      <main id="main" className="mt-8 flex flex-col gap-8">
        <h1 className="font-display text-[1.4rem] leading-none">blog</h1>
        {posts.length === 0 ? (
          <p className="font-display text-[0.92rem] leading-[1.7]">
            nothing published yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {posts.map((post) => (
              <li key={post.slug} className="flex flex-col gap-1">
                <Link
                  href={post.href}
                  className="link font-display text-[0.98rem]"
                >
                  {linkLabel(`/${post.slug}`)}
                </Link>
                <time
                  dateTime={post.date}
                  className="font-mono text-[0.75rem] text-muted"
                >
                  {formatLongDate(post.date)}
                </time>
              </li>
            ))}
          </ul>
        )}
        {hasPager ? (
          <nav
            aria-label="blog pagination"
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 font-mono text-[0.72rem] text-muted"
          >
            <p>
              page {page}/{pageCount}
            </p>
            <p className="flex gap-4">
              {hasPrevious ? (
                <Link
                  href={blogPageHref(page - 1)}
                  aria-label={`previous page ${page - 1}`}
                  className="inline-flex items-center gap-1 hover:text-ink"
                >
                  <ChevronIcon direction="left" />
                  {`p${page - 1}`}
                </Link>
              ) : null}
              {hasNext ? (
                <Link
                  href={blogPageHref(page + 1)}
                  aria-label={`next page ${page + 1}`}
                  className="inline-flex items-center gap-1 hover:text-ink"
                >
                  {`p${page + 1}`}
                  <ChevronIcon direction="right" />
                </Link>
              ) : null}
            </p>
          </nav>
        ) : null}
      </main>
      <SiteFooter />
    </PageShell>
  )
}
