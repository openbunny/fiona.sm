import type { Metadata } from "next"
import type { ReactElement, ReactNode } from "react"

import { MailLink } from "@/components/mail-link"
import { PageSection } from "@/components/page-section"
import { PageShell } from "@/components/page-shell"
import { PageTitle } from "@/components/page-title"
import { PlateHeader } from "@/components/plate-header"
import { SectionHeading } from "@/components/section-heading"
import { SiteBar } from "@/components/site-bar"
import { SiteFooter } from "@/components/site-footer"
import { PRIVACY_PLATE } from "@/lib/images/plates"
import { siteLastChangedAt } from "@/lib/site/commit-date"
import { routeSocialMetadata } from "@/lib/site/metadata"

const title = "privacy"
const description = "what this site records about a visit."

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/privacy" },
  ...routeSocialMetadata({
    title,
    description,
    path: "/privacy",
    type: "website",
  }),
}

const sections = [
  "tracking",
  "hosting",
  "device",
  "contact",
  "javascript",
] as const

function number(id: (typeof sections)[number]): string {
  return String(sections.indexOf(id) + 1)
}

function PolicyParagraph({
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

function VendorLink({
  href,
  children,
}: {
  readonly href: string
  readonly children: ReactNode
}): ReactElement {
  return (
    <a href={href} rel="noopener noreferrer" className="link">
      {children}
    </a>
  )
}

export default function PrivacyPage(): ReactElement {
  const lastChangedAt = siteLastChangedAt()

  return (
    <>
      <PageShell>
        <SiteBar route="/privacy" />
        <PlateHeader asset={PRIVACY_PLATE} plateClassName="w-[245px]" />
        <main id="main" className="mt-8">
          <PageTitle title="privacy" lastChangedAt={lastChangedAt} />
          <PageSection id="tracking" className="border-t-0">
            <SectionHeading number={number("tracking")}>
              tracking
            </SectionHeading>
            <PolicyParagraph>
              measurement scripts run in production only. with javascript
              running, they record a page view on every page load and report two
              categories of event: one triggered by something the reader does,
              such as pressing a copy button, and one triggered by nothing more
              than reaching a point in the page, with no action from the reader
              required; what is captured about a visit beyond that is
              vendor-operated — see the{" "}
              <VendorLink href="https://vercel.com/docs/analytics">
                vercel analytics documentation
              </VendorLink>
              .
            </PolicyParagraph>
            <PolicyParagraph>
              these scripts are injected by client-side code only: no script tag
              is present in the html this site sends, so a visitor with
              javascript disabled receives no reference to any of them, not
              merely a script that fails to run.
            </PolicyParagraph>
          </PageSection>
          <PageSection id="hosting">
            <SectionHeading number={number("hosting")}>
              hosting and transport
            </SectionHeading>
            <PolicyParagraph>
              this site is a next.js application hosted on vercel. responses
              carry a strict transport and framing policy: hsts with subdomains
              and preload, framing denied, and a content policy that loads
              scripts, styles, and fonts from this origin only. connections are
              allowed to this origin and nowhere else. static artifacts carry
              public cache lifetimes. what the platform logs about the requests
              it serves, and how long it keeps those logs, is vendor-operated;
              see the{" "}
              <VendorLink href="https://vercel.com/docs">
                vercel documentation
              </VendorLink>
              .
            </PolicyParagraph>
          </PageSection>
          <PageSection id="device">
            <SectionHeading number={number("device")}>
              on this device
            </SectionHeading>
            <PolicyParagraph>
              copy buttons place the visible text on the clipboard through the
              browser clipboard call and keep nothing afterwards; that call runs
              only while javascript is executing. nothing is stored in this
              browser, and these pages are drawn in one light scheme rather than
              following the system setting. no page here asks this browser to
              contact any other host: the monero node and block explorer named
              in the verification steps are addresses to run commands against by
              hand, and this site never requests them.
            </PolicyParagraph>
          </PageSection>
          <PageSection id="contact">
            <SectionHeading number={number("contact")}>contact</SectionHeading>
            <PolicyParagraph>
              writing to this address opens the reader&apos;s own mail client;
              nothing on this site sees the message. the address is:{" "}
              <MailLink />
            </PolicyParagraph>
          </PageSection>
          <PageSection id="javascript">
            <SectionHeading number={number("javascript")}>
              with javascript blocked
            </SectionHeading>
            <PolicyParagraph>
              visitors who block javascript, such as tor browser&apos;s safest
              mode, are served the same document as everyone else; it has no
              separate no-script version, and renders complete without any
              script. none of the tracking section&apos;s events fire, since
              each needs javascript to run, and nothing is stored.
            </PolicyParagraph>
          </PageSection>
        </main>
        <SiteFooter />
      </PageShell>
    </>
  )
}
