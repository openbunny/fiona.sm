export function blockHashPrefix(hash: string): string {
  const clean = hash.trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error("monero block hash must be 64 hex characters")
  }

  return `${clean.slice(0, 8)}…`
}
