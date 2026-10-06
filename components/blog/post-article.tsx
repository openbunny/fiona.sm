import type { ReactElement, ReactNode } from "react"

import { CiteBlock } from "@/components/blog/cite-block"
import type { CitationRegistry } from "@/components/blog/citations"
import { References, createCitationRegistry } from "@/components/blog/citations"
import { PostPlate } from "@/components/blog/post-plate"
import { PostVerifyNote } from "@/components/blog/post-verify-note"
import { PageShell } from "@openbunny/react"
import { SiteBar } from "@/components/site-bar"
import { SiteFooter } from "@/components/site-footer"
import type { Reference } from "@/lib/blog/bibliography"
import { requirePostBySlug } from "@/lib/blog/posts"
import { formatLongDate } from "@/lib/iso-date"
import {
  manifestEntryForSlug,
  readManifestLookup,
} from "@/lib/manifest/manifest-lookup"
import { manifestSignedAt } from "@/lib/manifest/manifest-signed-at"

export function Paragraph({
  children,
}: {
  readonly children: ReactNode
}): ReactElement {
  return (
    <p className="font-display text-[0.92rem] leading-[1.7] text-pretty">
      {children}
    </p>
  )
}

export async function PostArticle({
  slug,
  references,
  body,
}: {
  readonly slug: string
  readonly references: readonly Reference[]
  readonly body: (citations: CitationRegistry) => ReactNode
}): Promise<ReactElement> {
  const post = requirePostBySlug(slug)
  const citations = createCitationRegistry()
  const article = body(citations)

  return (
    <PageShell>
      <SiteBar route={post.href} />
      <main id="main" className="mt-8">
        <div>
          <h1 className="font-display text-[1.4rem] leading-none">
            {post.title}
          </h1>
          <time
            dateTime={post.date}
            className="mt-3 block font-mono text-[0.75rem] text-muted"
          >
            {formatLongDate(post.date)}
          </time>
        </div>
        {post.artwork === undefined ? null : <PostPlate slug={slug} />}
        <article className="mt-8 flex flex-col gap-5">{article}</article>
        <PostVerifyNote slug={slug} />
        <h2
          id="references"
          className="mt-14 border-t border-line pt-6 font-display text-[1.05rem] leading-none"
        >
          references
        </h2>
        <References items={references} registry={citations} />
        <CiteBlock
          id="cite"
          citation={{
            post,
            sha256: manifestEntryForSlug(slug, readManifestLookup())?.sha256,
            manifestSignedOn: (await manifestSignedAt()).slice(0, 10),
          }}
        />
      </main>
      <SiteFooter />
    </PageShell>
  )
}
