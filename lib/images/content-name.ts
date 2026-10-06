import { createHash } from "node:crypto"

export const imageExtensions = [
  "avif",
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
] as const

export function contentHash(bytes: Uint8Array): string {
  return createHash("sha512").update(bytes).digest("hex")
}

export function contentName(bytes: Uint8Array, extension: string): string {
  return `${contentHash(bytes)}.${extension}`
}

export function contentUrl(bytes: Uint8Array, extension: string): string {
  return `/img/${contentName(bytes, extension)}`
}
