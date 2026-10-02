import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const ogArtFiles = {
  home: join(process.cwd(), "app/og-bunny.png"),
  canary: join(process.cwd(), "public/canary-static.png"),
  blog: join(process.cwd(), "public/blog-static.png"),
  homebrewTap: join(process.cwd(), "public/post-art/homebrew-tap-static.png"),
  tickerboxCli: join(process.cwd(), "public/post-art/tickerbox-cli-static.png"),
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
