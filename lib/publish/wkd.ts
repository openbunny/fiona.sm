import { createHash } from "node:crypto"

const zBase32Alphabet = "ybndrfg8ejkmcpqxot1uwisza345h769"

export const wkdPolicyHref = "/.well-known/openpgpkey/policy"

export function zBase32(bytes: Uint8Array): string {
  let value = 0
  let bits = 0
  let encoded = ""

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      encoded += zBase32Alphabet.charAt((value >>> bits) & 31)
    }
    value &= (1 << bits) - 1
  }

  if (bits > 0) {
    encoded += zBase32Alphabet.charAt((value << (5 - bits)) & 31)
  }

  return encoded
}

export function wkdHash(localPart: string): string {
  const lowered = localPart.replaceAll(/[A-Z]/g, (letter) =>
    letter.toLowerCase()
  )
  return zBase32(createHash("sha1").update(lowered, "utf8").digest())
}

export function wkdKeyHref(email: string): string {
  return `/.well-known/openpgpkey/hu/${wkdHash(splitAddress(email).localPart)}`
}

export function buildWkdPolicy(email: string): string {
  return `# policy flags for ${splitAddress(email).domain}\n`
}

function splitAddress(email: string): {
  readonly localPart: string
  readonly domain: string
} {
  const at = email.lastIndexOf("@")
  if (at < 1 || at === email.length - 1) {
    throw new Error(`${email} is not an addr-spec`)
  }

  return { localPart: email.slice(0, at), domain: email.slice(at + 1) }
}
