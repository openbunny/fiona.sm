import type { ReactElement } from "react"

import { ArmorBlock } from "@/components/canary/armor-block"
import { CanaryFacts } from "@/components/canary/canary-facts"
import { CanaryHeader } from "@/components/canary/canary-header"
import { CanaryIntro } from "@/components/canary/canary-intro"
import { CanaryHistory } from "@/components/canary/canary-history"
import { CanaryStatus } from "@/components/canary/canary-status"
import { Fingerprint } from "@/components/canary/fingerprint"
import { ProofOfDateChain } from "@/components/canary/proof-of-date-chain"
import { RenewalWindow } from "@/components/canary/renewal-window"
import { CommandBlock } from "@/components/command-block"
import { PageShell } from "@/components/page-shell"
import { SiteFooter } from "@/components/site-footer"
import { canary } from "@/lib/canary/canary"
import { listCanaryArchives } from "@/lib/canary/canary-history"
import { proofOfDateSteps } from "@/lib/canary/proof-of-date"
import { verifySteps } from "@/lib/canary/verify-commands"
import { isRelativeAssetPath } from "@/lib/site/site"

const STATEMENT_TITLE = "statement"
const PUBLIC_KEY_TITLE = "public key"
const VERIFY_TITLE = "verify"
const PROOF_OF_DATE_TITLE = "proof of date"
const STATUS_HEADING = "canary status"
const ABOUT_HEADING = "about this canary"

function CanaryStatusSection(): ReactElement {
  return (
    <section>
      <h2 className="sr-only">{STATUS_HEADING}</h2>
      <CanaryStatus
        signedOn={canary.signedOn}
        renewBy={canary.renewBy}
        fingerprint={<Fingerprint />}
      />
    </section>
  )
}

function outline(hasHistory: boolean): ReadonlyArray<string> {
  return [
    "statement",
    "public-key",
    "verify",
    "proof-of-date",
    ...(hasHistory ? ["history"] : []),
  ]
}

export function CanaryPage(): ReactElement {
  const archives = listCanaryArchives().filter((archive) =>
    isRelativeAssetPath(archive.href)
  )
  const hasHistory = archives.length > 0
  const ids = outline(hasHistory)
  const number = (id: string): string => String(ids.indexOf(id) + 1)

  return (
    <PageShell>
      <CanaryHeader />
      <main id="main" className="mt-10">
        <CanaryStatusSection />
        <section>
          <h2 className="sr-only">{ABOUT_HEADING}</h2>
          <CanaryFacts signedAt={canary.signedAt} renewBy={canary.renewBy} />
          <RenewalWindow signedOn={canary.signedOn} renewBy={canary.renewBy} />
          <CanaryIntro />
        </section>
        <ArmorBlock
          id="statement"
          number={number("statement")}
          title={STATEMENT_TITLE}
          armor="clearsigned"
          text={canary.signedStatement}
          downloadHref={canary.statementHref}
        />
        <ArmorBlock
          id="public-key"
          number={number("public-key")}
          title={PUBLIC_KEY_TITLE}
          armor="public-key"
          text={canary.publicKey}
          downloadHref={canary.publicKeyHref}
        />
        <CommandBlock
          id="verify"
          number={number("verify")}
          title={VERIFY_TITLE}
          steps={verifySteps(canary.siteOrigin, canary.fingerprint)}
          copyAll
        />
        <CommandBlock
          id="proof-of-date"
          number={number("proof-of-date")}
          title={PROOF_OF_DATE_TITLE}
          steps={proofOfDateSteps(canary.moneroBlockHeight)}
          lead={
            <ProofOfDateChain
              blockHeight={canary.moneroBlockHeight}
              blockHash={canary.moneroBlockHash}
              signedAt={canary.signedAt}
            />
          }
        />
        {hasHistory ? (
          <CanaryHistory number={number("history")} archives={archives} />
        ) : null}
      </main>
      <SiteFooter />
    </PageShell>
  )
}
