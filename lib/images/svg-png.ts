import sharp from "sharp"

export async function svgToPng(svg: string, size: number): Promise<Uint8Array> {
  const png = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer()
  return new Uint8Array(png)
}
