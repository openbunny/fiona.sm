import { ImageResponse } from "next/og"

import { ink, muted, paper } from "@/lib/images/icon-files"
import { loadOgArt } from "@/lib/images/og-art"
import { loadOgFonts, ogFontFamily } from "@/lib/images/og-fonts"

export const ogSize = { width: 1200, height: 630 } as const
export const ogContentType = "image/png"

const artBox = { width: 620, height: 300 } as const

export async function ogCard({
  artwork,
  title,
  note,
}: {
  readonly artwork: string
  readonly title: string
  readonly note?: string | undefined
}): Promise<ImageResponse> {
  const [fonts, art] = await Promise.all([loadOgFonts(), loadOgArt(artwork)])

  const scale = Math.min(
    artBox.height / art.height,
    artBox.width / art.width,
    1
  )

  return new ImageResponse(
    <div
      style={{
        background: paper,
        color: ink,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 44,
        fontFamily: ogFontFamily.display,
      }}
    >
      <img
        src={art.src}
        width={Math.round(art.width * scale)}
        height={Math.round(art.height * scale)}
        alt=""
      />
      <span style={{ fontSize: 56, lineHeight: 1 }}>{title}</span>
      {note === undefined ? null : (
        <span
          style={{
            fontSize: 26,
            lineHeight: 1,
            marginTop: -18,
            color: muted,
            fontFamily: ogFontFamily.mono,
          }}
        >
          {note}
        </span>
      )}
    </div>,
    { ...ogSize, fonts }
  )
}
