import type { Metadata } from "next"
import type { ReactElement } from "react"

import { Cite, Screenshot, type Reference } from "@openbunny/react"

import { Paragraph, PostArticle } from "@/components/blog/post-article"
import { CommandLine } from "@/components/command-line"
import { postMetadata } from "@/lib/blog/post-metadata"

const slug = "worms-wmd"

export const metadata: Metadata = postMetadata({
  slug,
  description:
    "getting worms wmd past a black screen on macos 26 and later with a cli tool.",
})

const references: readonly Reference[] = [
  {
    id: "worms-wmd",
    authors: "team17",
    year: 2016,
    title: "worms w.m.d",
    venue: "store.steampowered.com",
    url: "https://store.steampowered.com/app/327030/Worms_WMD/",
  },
  {
    id: "macos-26-release-notes",
    authors: "apple",
    year: 2025,
    title: "macos tahoe 26 release notes",
    venue: "developer.apple.com",
    url: "https://developer.apple.com/documentation/macos-release-notes/macos-26-release-notes",
  },
  {
    id: "wormswmd-macos-fix",
    authors: "cboyd0319",
    year: 2025,
    title: "wormswmd-macos-fix",
    venue: "github.com/cboyd0319/WormsWMD-macOS-Fix",
    url: "https://github.com/cboyd0319/WormsWMD-macOS-Fix",
  },
  {
    id: "wormswmd",
    authors: "openbunny",
    year: 2026,
    title: "wormswmd",
    venue: "github.com/openbunny/wormswmd",
    url: "https://github.com/openbunny/wormswmd",
  },
]

export default async function WormsWmdPage(): Promise<ReactElement> {
  return PostArticle({
    slug,
    references,
    body: (citations) => (
      <>
        <Paragraph>
          when trying to drop into a game of worms wmd{" "}
          <Cite id="worms-wmd" registry={citations} /> on my macbook, i ran into
          issues running the game, since all that was produced was a black
          screen.
        </Paragraph>
        <Paragraph>
          some googling later, i learned about the issue being apples legacy
          opengl framework, agl, which isnt shipped by macos 26 and 27{" "}
          <Cite id="macos-26-release-notes" registry={citations} />.
        </Paragraph>
        <Paragraph>
          based on an existing fix{" "}
          <Cite id="wormswmd-macos-fix" registry={citations} />, which i found
          to be rather clunky and unstable in execution, but fully functional as
          a concept, i tasked a few agents to write a cli tool{" "}
          <Cite id="wormswmd" registry={citations} /> to apply the fixes brought
          to you by the authors of the original project{" "}
          <Cite id="wormswmd-macos-fix" registry={citations} />, in a more
          stable and secure manner.
        </Paragraph>
        <Paragraph>
          you can install it via homebrew and play worms on your arm mac too!
        </Paragraph>
        <CommandLine command="brew install oa/tap/wormswmd" />
        <Paragraph>
          finally, nothing stood between my friends and i blasting each other
          off the island!
        </Paragraph>
        <Screenshot
          src="/img/18b57a57bcbefbae09c768845e08fcf75ea2ddda63249e2fe3bc9415a894facee2a4527de0c0344093c646791384375263f36451b0cf7afd803f4de308d1af23.webp"
          alt='the worms wmd results screen after a round: "kevin was worm of the round", "lordy lordy wins the cockroach award", "lordy lordy was hiding under the bed sheets", "lordy lordy was a total burden" and "enhanced interrogation technique team was most precise".'
          width={1440}
          height={810}
          caption="old screenshot, i didnt win this time"
        />
        <Paragraph>-f</Paragraph>
      </>
    ),
  })
}
