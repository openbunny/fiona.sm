import type { ReactElement } from "react"

import { CopyButton } from "@/components/copy-button"
import type { Citation } from "@/lib/blog/citation"
import { bibtexCitation, plainCitation } from "@/lib/blog/citation"

function CitationForm({
  label,
  text,
}: {
  readonly label: string
  readonly text: string
}): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-sc text-[0.7rem] text-muted">{label}</span>
        <CopyButton text={text} label={`copy ${label} citation`} />
      </div>
      <pre className="border border-line bg-paper-inset px-4 py-2 font-mono text-[0.68rem] leading-[1.65] [overflow-wrap:anywhere] whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  )
}

export function CiteBlock({
  id,
  citation,
}: {
  readonly id: string
  readonly citation: Citation
}): ReactElement {
  return (
    <details id={id} className="mt-14 border-t border-line pt-6">
      <summary className="cursor-pointer font-display text-[1.05rem] leading-none">
        cite this post
      </summary>
      <div className="mt-6 flex flex-col gap-3">
        <p className="font-display text-[0.92rem] leading-[1.7] text-pretty">
          each form carries the sha-256 above and the date the manifest holding
          it was signed. every revision stays published at{" "}
          <code className="font-mono text-[0.85em]">
            /posts/{citation.post.slug}/&lt;sha-256&gt;.txt
          </code>
          , named by its own digest, so a citation keeps resolving after the
          post is revised and the reader can confirm the file is the text that
          was cited by hashing it.
        </p>
        <CitationForm label="plain" text={plainCitation(citation)} />
        <CitationForm label="bibtex" text={bibtexCitation(citation)} />
      </div>
    </details>
  )
}
