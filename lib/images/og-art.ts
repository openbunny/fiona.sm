import { readFile } from "node:fs/promises"
import { join } from "node:path"

import {
  BLOG_PLATE,
  CANARY_PLATE,
  HOMEBREW_TAP_PLATE,
  OPENBUNNY_BULK_RELEASE_PLATE,
  TICKERBOX_CLI_PLATE,
  WORMS_WMD_PLATE,
} from "@/lib/images/plates"

const publicFile = (src: string): string => join(process.cwd(), "public", src)

export const ogArtFiles = {
  home: join(
    process.cwd(),
    "lib/images/art/d4b49e453be07af728a8b3f217c000f7b5f0dbab0fb0dd8efce064a8e064b2368b4eb85f19f23e673a48de4c7d7f0c76008815a3f3f6a3f2a7feb62a5ba7b1b8.png"
  ),
  canary: publicFile(CANARY_PLATE.staticSrc),
  blog: publicFile(BLOG_PLATE.staticSrc),
  openbunnyBulkRelease: publicFile(OPENBUNNY_BULK_RELEASE_PLATE.staticSrc),
  homebrewTap: publicFile(HOMEBREW_TAP_PLATE.staticSrc),
  tickerboxCli: publicFile(TICKERBOX_CLI_PLATE.staticSrc),
  wormsWmd: publicFile(WORMS_WMD_PLATE.staticSrc),
} as const

export type OgArt = {
  readonly src: string
  readonly width: number
  readonly height: number
}

const pngSignature = "89504e470d0a1a0a"

export async function loadOgArt(file: string): Promise<OgArt> {
  const bytes = await readFile(file)

  if (bytes.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(
      `${file} is not a png, so the share card has nothing a renderer can decode. Regenerate it, or point the entry in ogArtFiles at the file that replaced it.`
    )
  }

  return {
    src: `data:image/png;base64,${bytes.toString("base64")}`,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  }
}
