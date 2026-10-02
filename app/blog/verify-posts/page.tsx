import {
  PageSection,
  PageShell,
  PlateHeader,
  SectionHeading,
} from "@openbunny/react"
import type { Metadata } from "next"
import type { ReactElement } from "react"

import Link from "next/link"

import { CommandBlock } from "@/components/command-block"
import { PageTitle } from "@/components/page-title"
import { SiteBar } from "@/components/site-bar"
import { SiteFooter } from "@/components/site-footer"
import { postsByNewest } from "@/lib/blog/posts"
import { canary } from "@/lib/canary/canary"
import { formatLongDate } from "@/lib/iso-date"
import { VERIFY_PLATE } from "@/lib/images/plates"
import { readManifestLookup } from "@/lib/manifest/manifest-lookup"
import { manifestSignedAt } from "@/lib/manifest/manifest-signed-at"
import { manifestStatusText } from "@/lib/manifest/manifest-status-text"
import {
  articleTextVerifySteps,
  manifestVerifyNote,
  manifestVerifySteps,
} from "@/lib/manifest/verify-commands"
import { siteLastChangedAt } from "@/lib/site/commit-date"
import { routeSocialMetadata } from "@/lib/site/metadata"

const title = "verify blog posts"
const description = "how to check a post against the signed manifest."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog/verify-posts" },
  ...routeSocialMetadata({
    title,
    description,
    path: "/blog/verify-posts",
    type: "website",
  }),
}

const sections = ["attests", "verify-manifest", "verify-post"] as const

function number(id: (typeof sections)[number]): string {
  return String(sections.indexOf(id) + 1)
}

export default async function VerifyPage(): Promise<ReactElement> {
  const lookup = readManifestLookup()
  const signedAt = await manifestSignedAt()
  const lastChangedAt = siteLastChangedAt()
  const examplePost = postsByNewest()[0]
  if (examplePost === undefined) {
    throw new Error(
      "lib/blog/posts.ts publishes no posts, so /blog/verify-posts has no post to demonstrate the per-post check with."
    )
  }

  return (
    <PageShell>
      <SiteBar route="/blog/verify-posts" />
      <PlateHeader asset={VERIFY_PLATE} plateClassName="w-[180px]" />
      <main id="main" className="mt-8">
        <PageTitle title="verify blog posts" lastChangedAt={lastChangedAt} />
        <PageSection id="attests" className="border-t-0">
          <SectionHeading number={number("attests")}>
            what the manifest attests
          </SectionHeading>
          <p className="font-display text-[0.92rem] leading-[1.7] text-pretty">
            <Link href="/posts.asc" className="link">
              /posts.asc
            </Link>{" "}
            pairs the sha-256 of each published post&apos;s normalised article
            text with its slug. normalisation keeps the article&apos;s visible
            text only: scripts, styles, and screen-reader-only content are
            dropped, whitespace collapses to single spaces, and each block
            element — paragraph, heading, list item, and similar — ends its own
            line. signed, it carries a pgp clearsign wrapper with the key{" "}
            <Link href="/canary" className="link">
              canary
            </Link>{" "}
            verifies.
          </p>
          <p className="font-display text-[0.92rem] leading-[1.7] text-pretty">
            {manifestStatusText(lookup)}
          </p>
          <p className="font-display text-[0.92rem] leading-[1.7] text-pretty">
            {"manifest signed "}
            <time dateTime={signedAt}>
              {formatLongDate(signedAt.slice(0, 10))}
            </time>
            {"."}
          </p>
          <p className="font-display text-[0.92rem] leading-[1.7] text-pretty">
            it does not attest to source history — git log and commit signing
            already cover who wrote what.
          </p>
          <p className="font-display text-[0.92rem] leading-[1.7] text-pretty">
            a manifest signed before a post changed proves only what it said at
            signing, and none of this proves anything to a reader who skips the
            checks below.
          </p>
        </PageSection>
        <CommandBlock
          id="verify-manifest"
          number={number("verify-manifest")}
          title="verify the manifest is fiona's"
          steps={manifestVerifySteps(canary.siteOrigin, canary.fingerprint)}
          note={manifestVerifyNote}
          copyAll
        />
        <CommandBlock
          id="verify-post"
          number={number("verify-post")}
          title="verify a post's text"
          steps={articleTextVerifySteps(
            canary.siteOrigin,
            canary.fingerprint,
            examplePost.slug
          )}
          lead={
            <>
              <p className="font-display text-[0.92rem] leading-[1.7] text-pretty">
                <code className="font-mono text-[0.85em]">
                  /posts/{examplePost.slug}.txt
                </code>{" "}
                is the exact text the manifest hashed. hashing the live page
                instead, with{" "}
                <code className="font-mono text-[0.85em]">
                  curl &lt;post-url&gt; | sha256sum
                </code>
                , hashes different bytes — markup, scripts, styling, and
                anything outside{" "}
                <code className="font-mono text-[0.85em]">&lt;article&gt;</code>{" "}
                — so a mismatch there is not evidence of tampering.
              </p>
              <p className="font-display text-[0.92rem] leading-[1.7] text-pretty">
                the .txt file keeps the post&apos;s visible text only: scripts,
                styles, and screen-reader-only content dropped, whitespace
                collapsed, each block element — paragraph, heading, list item,
                and similar — on its own line. read it against the post to
                confirm it is a faithful rendering of what the page says. a
                matching digest means the published .txt agrees with the signed
                manifest entry for this slug; it proves nothing beyond that, and
                nothing at all to a reader who skips step 2.
              </p>
            </>
          }
        />
      </main>
      <SiteFooter />
    </PageShell>
  )
}
