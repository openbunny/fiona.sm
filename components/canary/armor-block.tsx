import type { ReactElement } from "react"

import { CopyButton } from "@/components/copy-button"
import { PageSection } from "@/components/page-section"
import { SectionHeading } from "@/components/section-heading"
import { canary } from "@/lib/canary/canary"
import {
  verifiedClearsignedArmor,
  verifiedPublicKeyArmor,
} from "@/lib/openpgp-armor"
import { isRelativeAssetPath } from "@/lib/site/site"

type ArmorBlockProps = {
  readonly id: string
  readonly number: string
  readonly title: string
  readonly armor: "clearsigned" | "public-key"
  readonly text: string
  readonly downloadHref?: string
}

export async function ArmorBlock({
  id,
  number,
  title,
  armor,
  text,
  downloadHref,
}: ArmorBlockProps): Promise<ReactElement> {
  const verified =
    armor === "clearsigned"
      ? await verifiedClearsignedArmor(text, canary.publicKey)
      : await verifiedPublicKeyArmor(text)

  const linked =
    downloadHref !== undefined && isRelativeAssetPath(downloadHref)
      ? downloadHref
      : undefined

  return (
    <PageSection id={id}>
      <div className="flex items-baseline justify-between gap-4">
        <SectionHeading number={number}>{title}</SectionHeading>
        <div className="flex items-center gap-3">
          <CopyButton
            text={verified}
            label={`copy ${title}`}
            failureHint="use the download link beside this button."
          />
          {linked === undefined ? null : (
            <a
              href={linked}
              download
              aria-label={`download ${title}`}
              className="link font-sc text-[0.7rem]"
            >
              download
            </a>
          )}
        </div>
      </div>
      {linked === undefined ? null : (
        <p
          aria-hidden="true"
          className="-mb-2 font-mono text-[0.7rem] text-muted"
        >
          {linked.split("/").at(-1)}
        </p>
      )}
      <pre className="border border-line bg-paper-inset p-4 font-mono text-[0.68rem] leading-[1.65] [overflow-wrap:anywhere] whitespace-pre-wrap">
        {verified}
      </pre>
    </PageSection>
  )
}
