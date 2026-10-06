import type { Metadata } from "next"
import type { ReactElement } from "react"

import { Cite, type Reference } from "@openbunny/react"

import { Paragraph, PostArticle } from "@/components/blog/post-article"
import { CommandLine } from "@/components/command-line"
import { postMetadata } from "@/lib/blog/post-metadata"

const slug = "homebrew-tap"

export const metadata: Metadata = postMetadata({
  slug,
  description: "a curated homebrew tap for tools the default taps omit.",
})

const references: readonly Reference[] = [
  {
    id: "proton-cli",
    authors: "roman-16",
    year: 2026,
    title: "proton-cli",
    venue: "github.com/roman-16/proton-cli",
    url: "https://github.com/roman-16/proton-cli",
  },
  {
    id: "vencord",
    authors: "Vencord",
    year: 2026,
    title: "vencord installer",
    venue: "github.com/Vencord/Installer",
    url: "https://github.com/Vencord/Installer",
  },
  {
    id: "blacksmith",
    authors: "blacksmith",
    year: 2026,
    title: "blacksmith",
    venue: "blacksmith.sh",
    url: "https://www.blacksmith.sh",
  },
  {
    id: "pgrun",
    authors: "pgrun",
    year: 2026,
    title: "pgrun",
    venue: "pgrun.dev",
    url: "https://pgrun.dev",
  },
  {
    id: "buskill",
    authors: "buskill",
    year: 2026,
    title: "buskill",
    venue: "buskill.in",
    url: "https://www.buskill.in",
  },
  {
    id: "kraken-desktop",
    authors: "kraken",
    year: 2026,
    title: "kraken desktop",
    venue: "kraken.com/desktop",
    url: "https://www.kraken.com/desktop",
  },
  {
    id: "homebrew",
    authors: "homebrew",
    year: 2026,
    title: "homebrew",
    venue: "brew.sh",
    url: "https://brew.sh/",
  },
]

export default async function HomebrewTapPage(): Promise<ReactElement> {
  return PostArticle({
    slug,
    references,
    body: (citations) => (
      <>
        <Paragraph>
          if you use cli tools like the proton-cli{" "}
          <Cite id="proton-cli" registry={citations} />, vencord{" "}
          <Cite id="vencord" registry={citations} />, blacksmith{" "}
          <Cite id="blacksmith" registry={citations} />, pgrun{" "}
          <Cite id="pgrun" registry={citations} />, or desktop applications like
          buskill <Cite id="buskill" registry={citations} /> or kraken desktop{" "}
          <Cite id="kraken-desktop" registry={citations} />, you may have
          noticed that theyre not available via the default homebrew{" "}
          <Cite id="homebrew" registry={citations} /> taps.
        </Paragraph>
        <Paragraph>
          for this purpose, i have created a curated and maintained homebrew tap
          for these and more applications to allow for cleaner declarative
          management of dependencies by reducing the volume of applications not
          managed by homebrew.
        </Paragraph>
        <Paragraph>to use the tap, you have to tap it.</Paragraph>
        <CommandLine command="brew tap oa/tap" />
        <Paragraph>
          then, you can install the applications you need from the tap.
        </Paragraph>
        <CommandLine command="brew install oa/tap/tickerbox-cli" />
        <Paragraph>-f</Paragraph>
      </>
    ),
  })
}
