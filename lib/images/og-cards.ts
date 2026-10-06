import { requirePostBySlug } from "@/lib/blog/posts"
import { canary } from "@/lib/canary/canary"
import { formatLongDate } from "@/lib/iso-date"
import { ogArtFiles } from "@/lib/images/og-art"
import { ogCard, ogContentType, ogSize } from "@/lib/images/og-card"
import { contentHash } from "@/lib/images/content-name"
import { site } from "@/lib/site/site"

type OgCardSpec = {
  readonly artwork: string
  readonly title: string
  readonly note?: string
  readonly alt: string
}

const canaryNote = `signed ${formatLongDate(canary.signedOn)} · renew by ${formatLongDate(canary.renewBy)}`

const postTitle = (slug: string): string => requirePostBySlug(slug).title

export const ogCards = {
  home: {
    artwork: ogArtFiles.home,
    title: site.homeTitle,
    alt: 'a white rabbit with its ears flopped over its eyes, captioned "fiona\'s website".',
  },
  blog: {
    artwork: ogArtFiles.blog,
    title: "blog",
    alt: 'a white cat dozing under a pink heart, captioned "blog".',
  },
  canary: {
    artwork: ogArtFiles.canary,
    title: "key canary",
    note: canaryNote,
    alt: `a white cat stretched out asleep, captioned "key canary", above the line "${canaryNote}".`,
  },
  "worms-wmd": {
    artwork: ogArtFiles.wormsWmd,
    title: postTitle("worms-wmd"),
    alt: `a red and white pixel-art rocket with a blue exhaust flame, captioned "${postTitle("worms-wmd")}".`,
  },
  "openbunny-bulk-release": {
    artwork: ogArtFiles.openbunnyBulkRelease,
    title: postTitle("openbunny-bulk-release"),
    alt: `a puppy swimming happily, captioned "${postTitle("openbunny-bulk-release")}".`,
  },
  "homebrew-tap": {
    artwork: ogArtFiles.homebrewTap,
    title: postTitle("homebrew-tap"),
    alt: `a pixel-art cat, captioned "${postTitle("homebrew-tap")}".`,
  },
  "tickerbox-cli": {
    artwork: ogArtFiles.tickerboxCli,
    title: postTitle("tickerbox-cli"),
    alt: `a brown lop-eared rabbit lying flat, captioned "${postTitle("tickerbox-cli")}".`,
  },
} as const satisfies Record<string, OgCardSpec>

export type OgCardKey = keyof typeof ogCards

export function isOgCardKey(key: string): key is OgCardKey {
  return Object.hasOwn(ogCards, key)
}

const rendered = new Map<OgCardKey, Promise<Uint8Array>>()

export function renderOgCard(key: OgCardKey): Promise<Uint8Array> {
  const cached = rendered.get(key)
  if (cached !== undefined) return cached
  const bytes = ogCard(ogCards[key]).then(
    async (response) => new Uint8Array(await response.arrayBuffer())
  )
  rendered.set(key, bytes)
  return bytes
}

export async function ogCardImageMetadata(key: OgCardKey): Promise<
  {
    readonly id: string
    readonly alt: string
    readonly size: typeof ogSize
    readonly contentType: typeof ogContentType
  }[]
> {
  const bytes = await renderOgCard(key)
  return [
    {
      id: contentHash(bytes),
      alt: ogCards[key].alt,
      size: ogSize,
      contentType: ogContentType,
    },
  ]
}

export async function ogCardResponse(key: OgCardKey): Promise<Response> {
  const bytes = await renderOgCard(key)
  return new Response(bytes.slice().buffer, {
    headers: { "Content-Type": ogContentType },
  })
}
