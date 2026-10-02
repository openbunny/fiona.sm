import type { CommandStep } from "@/lib/canary/command-step"

const v4Fingerprint = /^[0-9A-F]{40}$/

export function independentFingerprintNote(subject: string): string {
  return `these commands only prove the ${subject} was signed by the key this page publishes. compare the fingerprint with a source that is not this site: keys.openpgp.org serves the key for mail@fiona.sm, and keyoxide.org/hkp/mail@fiona.sm reads it back from there. the web key directory at this domain is this site, so it can only agree with itself. the warning from gpg --verify that the key is not certified with a trusted signature is expected.`
}

export const verifyNote = independentFingerprintNote("statement")

export function httpsOriginBase(origin: string, fingerprint: string): string {
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    throw new Error(`Invalid origin: ${origin}`)
  }

  if (
    parsed.protocol !== "https:" ||
    (parsed.pathname !== "" && parsed.pathname !== "/") ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error(`Invalid origin: ${origin}`)
  }

  if (!v4Fingerprint.test(fingerprint)) {
    throw new Error(`Invalid fingerprint: ${fingerprint}`)
  }

  return parsed.origin
}

export function verifySteps(
  origin: string,
  fingerprint: string
): ReadonlyArray<CommandStep> {
  const base = httpsOriginBase(origin, fingerprint)
  return [
    {
      command: `curl -fsSO ${base}/fiona.asc`,
      comment: "fetch the public key.",
    },
    {
      command: `curl -fsSO ${base}/canary.asc`,
      comment: "fetch the signed statement.",
    },
    {
      command: "gpg --import fiona.asc",
      comment: "add the key to your keyring.",
    },
    {
      command: `gpg --fingerprint ${fingerprint}`,
      comment:
        "print the fingerprint and compare it with the one at the top of this page and with a source that is not this site.",
    },
    {
      command: "gpg --verify canary.asc",
      comment: "check the signature. the line to look for is Good signature.",
    },
  ]
}

export function verifyCommands(
  origin: string,
  fingerprint: string
): ReadonlyArray<string> {
  return verifySteps(origin, fingerprint).map((step) => step.command)
}
