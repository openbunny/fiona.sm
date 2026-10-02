function fingerprintGroups(fingerprint: string): ReadonlyArray<string> {
  const clean = fingerprint.replaceAll(/\s/g, "").toUpperCase()
  if (!/^[0-9A-F]{40}$/.test(clean)) {
    throw new Error("OpenPGP v4 fingerprint must be 40 hex characters")
  }

  const groups = clean.match(/.{4}/g)
  if (!groups || groups.length !== 10) {
    throw new Error("OpenPGP v4 fingerprint must be 40 hex characters")
  }

  return groups
}

export function fingerprintRows(fingerprint: string): {
  readonly top: string
  readonly bottom: string
} {
  const groups = fingerprintGroups(fingerprint)
  return {
    top: groups.slice(0, 5).join(" "),
    bottom: groups.slice(5).join(" "),
  }
}

export function fingerprintLine(fingerprint: string): string {
  return fingerprintGroups(fingerprint).join(" ")
}
