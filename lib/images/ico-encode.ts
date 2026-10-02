export type IcoImage = {
  size: number
  png: Uint8Array
}

export function pngsToIco(images: ReadonlyArray<IcoImage>): Uint8Array {
  if (images.length === 0) {
    throw new Error("ICO requires at least one PNG")
  }

  const directorySize = 6 + 16 * images.length
  const total = images.reduce(
    (sum, image) => sum + image.png.byteLength,
    directorySize
  )
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, images.length, true)

  let offset = directorySize
  for (const [index, image] of images.entries()) {
    const entry = 6 + index * 16
    const stored = image.size >= 256 ? 0 : image.size
    out[entry] = stored
    out[entry + 1] = stored
    out[entry + 2] = 0
    out[entry + 3] = 0
    view.setUint16(entry + 4, 1, true)
    view.setUint16(entry + 6, 32, true)
    view.setUint32(entry + 8, image.png.byteLength, true)
    view.setUint32(entry + 12, offset, true)
    out.set(image.png, offset)
    offset += image.png.byteLength
  }

  return out
}
