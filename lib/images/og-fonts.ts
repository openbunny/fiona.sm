import { readFile } from "node:fs/promises"

import { fontFiles } from "@/lib/images/font-files"

export const ogFontFamily = {
  display: "Courier Prime",
  mono: "JetBrains Mono",
} as const

type OgFont = {
  name: string
  data: ArrayBuffer
  weight: 400
  style: "normal"
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = bytes
  if (!(buffer instanceof ArrayBuffer)) {
    throw new Error("Font bytes must view an ArrayBuffer")
  }

  return buffer.slice(byteOffset, byteOffset + byteLength)
}

export async function loadOgFonts(): Promise<OgFont[]> {
  const [courierPrime, jetbrainsMono] = await Promise.all([
    readFile(fontFiles.courierPrime),
    readFile(fontFiles.jetbrainsMono),
  ])

  return [
    {
      name: ogFontFamily.display,
      data: toArrayBuffer(courierPrime),
      weight: 400,
      style: "normal",
    },
    {
      name: ogFontFamily.mono,
      data: toArrayBuffer(jetbrainsMono),
      weight: 400,
      style: "normal",
    },
  ]
}
