import type { Metadata } from "next"
import type { ReactElement } from "react"

import { Cite, CiteGroup, type Reference } from "@openbunny/react"

import { Paragraph, PostArticle } from "@/components/blog/post-article"
import { postMetadata } from "@/lib/blog/post-metadata"

const slug = "openbunny-bulk-release"

export const metadata: Metadata = postMetadata({
  slug,
  description: "seven repositories published under the openbunny organisation.",
})

const references: readonly Reference[] = [
  {
    id: "openbunny",
    authors: "openbunny",
    year: 2026,
    title: "openbunny",
    venue: "github.com/openbunny",
    url: "https://github.com/openbunny/",
  },
  {
    id: "glyphmark",
    authors: "openbunny",
    year: 2026,
    title: "glyphmark",
    venue: "github.com/openbunny/glyphmark",
    url: "https://github.com/openbunny/glyphmark",
  },
  {
    id: "material-icons",
    authors: "material extensions",
    year: 2026,
    title: "material icons browser extension",
    venue: "github.com/material-extensions/material-icons-browser-extension",
    url: "https://github.com/material-extensions/material-icons-browser-extension",
  },
  {
    id: "scrollmark",
    authors: "openbunny",
    year: 2026,
    title: "scrollmark",
    venue: "github.com/openbunny/scrollmark",
    url: "https://github.com/openbunny/scrollmark",
  },
  {
    id: "control-panel-for-twitter",
    authors: "j buchanan & l.j buchanan",
    year: 2026,
    title: "control panel for twitter",
    venue: "mac app store",
    url: "https://apps.apple.com/us/app/control-panel-for-twitter/id1668516167",
  },
  {
    id: "dotgithub",
    authors: "openbunny",
    year: 2026,
    title: ".github",
    venue: "github.com/openbunny/.github",
    url: "https://github.com/openbunny/.github",
  },
  {
    id: "react",
    authors: "openbunny",
    year: 2026,
    title: "react",
    venue: "github.com/openbunny/react",
    url: "https://github.com/openbunny/react",
  },
  {
    id: "theme",
    authors: "openbunny",
    year: 2026,
    title: "theme",
    venue: "github.com/openbunny/theme",
    url: "https://github.com/openbunny/theme",
  },
  {
    id: "fiona-sm",
    authors: "openbunny",
    year: 2026,
    title: "fiona.sm",
    venue: "github.com/openbunny/fiona.sm",
    url: "https://github.com/openbunny/fiona.sm",
  },
]

export default async function OpenbunnyBulkReleasePage(): Promise<ReactElement> {
  return PostArticle({
    slug,
    references,
    body: (citations) => (
      <>
        <Paragraph>
          today i released a couple of projects that i had been developing
          privately to the openbunny organisation{" "}
          <Cite id="openbunny" registry={citations} />.
        </Paragraph>
        <Paragraph>
          glyphmark <Cite id="glyphmark" registry={citations} /> is the apple
          native version of the commonly used material design icons{" "}
          <Cite id="material-icons" registry={citations} /> for git frontends.
        </Paragraph>
        <Paragraph>
          scrollmark <Cite id="scrollmark" registry={citations} /> lets you pick
          off where you left scrolling on someones twitter page instead of
          having to scroll down all the way. it was only tested with the control
          panel for twitter safari extension{" "}
          <Cite id="control-panel-for-twitter" registry={citations} />.
        </Paragraph>
        <Paragraph>
          the other releases are merely for ease of development{" "}
          <Cite id="dotgithub" registry={citations} />, centralized component
          and style libraries{" "}
          <CiteGroup ids={["react", "theme"]} registry={citations} /> and the
          source code of this site <Cite id="fiona-sm" registry={citations} />.
        </Paragraph>
        <Paragraph>
          <img
            src="/img/29b9bdaae2e942a116e934fbddd964e0823f23eaa1a643a5a5e9685f0fc092a16e46686a52282a14daae2cbc0317bacbb0d912acd782200a19c527ed295dbf2f.webp"
            alt=""
            width={155}
            height={155}
          />
        </Paragraph>
        <Paragraph>
          i want to thank my boyfriend <strong>john</strong> and my best friend{" "}
          <strong>sasha</strong> for their exceptional continued support!
        </Paragraph>
        <Paragraph>-f</Paragraph>
      </>
    ),
  })
}
