import type { CommandStep } from "@/lib/canary/command-step"
import {
  httpsOriginBase,
  independentFingerprintNote,
} from "@/lib/canary/verify-commands"

const slugPattern = /^[a-z0-9-]+$/

export const manifestVerifyNote = independentFingerprintNote("manifest")

export function manifestVerifySteps(
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
      command: `curl -fsSO ${base}/posts.asc`,
      comment: "fetch the post content manifest.",
    },
    {
      command: "gpg --import fiona.asc",
      comment: "add the key to your keyring.",
    },
    {
      command: `gpg --fingerprint ${fingerprint}`,
      comment:
        "print the fingerprint and compare it with the key fingerprint line the manifest itself prints, and with a source that is not this site.",
    },
    {
      command: "gpg --verify posts.asc",
      comment: "check the signature. the line to look for is Good signature.",
    },
  ]
}

export function manifestVerifyCommands(
  origin: string,
  fingerprint: string
): ReadonlyArray<string> {
  return manifestVerifySteps(origin, fingerprint).map((step) => step.command)
}

export function articleTextVerifySteps(
  origin: string,
  fingerprint: string,
  slug: string
): ReadonlyArray<CommandStep> {
  const base = httpsOriginBase(origin, fingerprint)
  if (!slugPattern.test(slug)) {
    throw new Error(`Invalid slug: ${slug}`)
  }

  return [
    {
      command: `curl -fsS ${base}/posts/${slug}.txt | sha256sum`,
      comment: `fetch "${slug}"'s published article text and hash it; compare the digest with its line in /posts.asc.`,
    },
  ]
}
