import { formatLongDate, formatLongDateTime } from "@/lib/iso-date"

const moneroBlockHashPattern = /^[0-9a-f]{64}$/

export type CanaryPlaintextInput = {
  readonly name: string
  readonly email: string
  readonly signedAt: string
  readonly renewBy: string
  readonly moneroBlockHeight: number
  readonly moneroBlockHash: string
  readonly previousStatementHash?: string
}

export function buildCanaryPlaintext(input: CanaryPlaintextInput): string {
  if (!moneroBlockHashPattern.test(input.moneroBlockHash)) {
    throw new Error("Monero block hash must be 64 hex characters")
  }

  if (
    input.previousStatementHash !== undefined &&
    !moneroBlockHashPattern.test(input.previousStatementHash)
  ) {
    throw new Error("Previous statement hash must be 64 hex characters")
  }

  if (
    !Number.isInteger(input.moneroBlockHeight) ||
    input.moneroBlockHeight < 0
  ) {
    throw new Error("Monero block height must be a non-negative integer")
  }

  const signed = formatLongDateTime(input.signedAt)
  const renew = formatLongDate(input.renewBy)
  const previousStatementLine =
    input.previousStatementHash === undefined
      ? []
      : [`previous statement: sha256:${input.previousStatementHash}`]

  return [
    `i am ${input.name} <${input.email}>.`,
    "",
    "this is a pgp key canary.",
    "",
    `as of ${signed}:`,
    "",
    "1. i have sole control of the private key matching the fingerprint published on this page.",
    "2. i have not disclosed that private key to any third party.",
    "3. i have not been compelled to produce cryptographic keys or plaintext.",
    "4. i have not been served with a secret warrant, gag order, or national security letter.",
    "5. i am not under duress.",
    "",
    "if the signature fails to verify against the published key, what you are reading is not what i signed: treat it as tampered with.",
    "",
    `if this page is not renewed with a freshly signed statement by ${renew}, this statement no longer speaks for today. a missed renewal alone is not proof that the key is compromised.`,
    "",
    `proof of date: monero block ${input.moneroBlockHeight}`,
    input.moneroBlockHash,
    ...previousStatementLine,
    "",
  ].join("\n")
}
