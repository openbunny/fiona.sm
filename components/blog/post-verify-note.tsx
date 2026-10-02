import Link from "next/link"
import type { ReactElement } from "react"

import {
  manifestEntryForSlug,
  readManifestLookup,
} from "@/lib/manifest/manifest-lookup"

export function PostVerifyNote({
  slug,
}: {
  readonly slug: string
}): ReactElement {
  const entry = manifestEntryForSlug(slug, readManifestLookup())

  return (
    <aside className="mt-10 flex flex-col gap-2 border border-line bg-paper-inset px-4 py-3 font-mono text-[0.68rem] leading-[1.6] text-muted">
      {entry === undefined ? (
        <p>
          not in the manifest.{" "}
          <Link href="/blog/verify-posts" className="link">
            /blog/verify-posts
          </Link>
        </p>
      ) : (
        <>
          <p>sha-256</p>
          <p className="[overflow-wrap:anywhere] text-foreground">
            {entry.sha256}
          </p>
          <p>
            <Link href="/blog/verify-posts" className="link">
              /blog/verify-posts
            </Link>{" "}
            ·{" "}
            <Link href="/posts.asc" className="link">
              /posts.asc
            </Link>
          </p>
        </>
      )}
    </aside>
  )
}
