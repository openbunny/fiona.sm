import type { Metadata } from "next"
import type { ReactElement } from "react"

import { Cite, type Reference } from "@openbunny/react"

import { Paragraph, PostArticle } from "@/components/blog/post-article"
import { CommandLine } from "@/components/command-line"
import { postMetadata } from "@/lib/blog/post-metadata"
import { absoluteUrl, site } from "@/lib/site/site"

const slug = "tickerbox-cli"

export const metadata: Metadata = postMetadata({
  slug,
  description: "a cli tool for the tickerbox.",
})

const references: readonly Reference[] = [
  {
    id: "tickerbox",
    authors: "tickerbox",
    year: 2026,
    title: "tickerbox",
    venue: "tickerbox.eu",
    url: "https://tickerbox.eu",
  },
  {
    id: "tickerbox-cli",
    authors: "openbunny",
    year: 2026,
    title: "tickerbox-cli",
    venue: "github.com/openbunny/tickerbox-cli",
    url: "https://github.com/openbunny/tickerbox-cli",
  },
  {
    id: "openbunny",
    authors: "openbunny",
    year: 2026,
    title: "openbunny",
    venue: "github.com/openbunny",
    url: "https://github.com/openbunny/",
  },
  {
    id: "feed",
    authors: site.name,
    year: 2026,
    title: "blog feed",
    venue: new URL(site.url).host,
    url: absoluteUrl(site.feedPath),
  },
]

export default async function TickerboxCliPage(): Promise<ReactElement> {
  return PostArticle({
    slug,
    references,
    body: (citations) => (
      <>
        <Paragraph>
          ive been personally using a tickerbox{" "}
          <Cite id="tickerbox" registry={citations} /> in my office for a while
          now. for most of the time, it has been connected to the logic of my
          investment operation to show current portfolio (or underlying) assets.
        </Paragraph>
        <Paragraph>
          now, while introducing a friend to the device, and setting it up to
          run in her office, i needed an easier way to interact with it and
          bypass its limits to her needs so i developed a cli tool for
          interaction with the box.{" "}
          <Cite id="tickerbox-cli" registry={citations} />
        </Paragraph>
        <Paragraph>
          its open source and compatible with linux and macos, both arm and x86
          thanks to golang.
        </Paragraph>
        <Paragraph>you can install it via homebrew</Paragraph>
        <CommandLine command="brew install oa/tap/tickerbox-cli" />
        <Paragraph>or golang directly</Paragraph>
        <CommandLine command="go install github.com/openbunny/tickerbox-cli@latest" />
        <Paragraph>feedback, bug reports and pull requests welcome.</Paragraph>
        <Paragraph>
          i am also in the process of building a fully open source version of
          the device with better hardware, broader data source and asset class
          support, a fully open source firmware and cli as well as an extension
          system.
        </Paragraph>
        <Paragraph>
          keep an eye on the openbunny github organization{" "}
          <Cite id="openbunny" registry={citations} /> or subscribe to the atom
          feed of this blog <Cite id="feed" registry={citations} /> to stay up
          to date.
        </Paragraph>
        <Paragraph>-f</Paragraph>
      </>
    ),
  })
}
