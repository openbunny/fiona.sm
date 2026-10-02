import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import type { GenerateManifestOptions } from "@/lib/manifest/manifest-generate"
import {
  asClearsignedBody,
  signManifest,
  type SignManifestDeps,
} from "@/lib/manifest/manifest-sign"

const publishedPublicKey = "-----BEGIN PGP PUBLIC KEY BLOCK-----\npublished\n"
const cardPublicKey = "-----BEGIN PGP PUBLIC KEY BLOCK-----\ncard\n"
const plaintext = "post content manifest for fiona\nkey fingerprint: ...\n"
const otherFingerprint = "1111111111111111111111111111111111111111"

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

function fixtureRoot(): { manifestPath: string; publicKeyPath: string } {
  const root = mkdtempSync(join(tmpdir(), "manifest-sign-"))
  roots.push(root)
  const publicKeyPath = join(root, "fiona.asc")
  writeFileSync(publicKeyPath, publishedPublicKey, "utf8")
  return { manifestPath: join(root, "posts.asc"), publicKeyPath }
}

function stubDeps(overrides: Partial<SignManifestDeps> = {}): {
  deps: SignManifestDeps
  signed: string[]
  cardQueries: string[]
  generateCalls: GenerateManifestOptions[]
} {
  const signed: string[] = []
  const cardQueries: string[] = []
  const generateCalls: GenerateManifestOptions[] = []

  const deps: SignManifestDeps = {
    generateManifestText: (options) => {
      generateCalls.push(options)
      return plaintext
    },
    cardSigningKey: async () => {
      cardQueries.push(canary.fingerprint)
      return canary.fingerprint
    },
    exportPublicKey: async () => cardPublicKey,
    clearsignWithCard: async (text, _key, label) => {
      signed.push(label)
      return `signed:${text}`
    },
    fingerprintFromPublicKey: async () => canary.fingerprint,
    verifyClearsigned: async (clearsigned, publicKey) => {
      if (publicKey !== publishedPublicKey) {
        throw new Error("verified against the wrong public key")
      }
      if (!clearsigned.startsWith("signed:")) {
        throw new Error("not a signature this stub recognizes")
      }
      return clearsigned.slice("signed:".length)
    },
    ...overrides,
  }

  return { deps, signed, cardQueries, generateCalls }
}

describe("signManifest", () => {
  it("generates and clearsigns the manifest with a fake signer", async () => {
    const { manifestPath, publicKeyPath } = fixtureRoot()
    const { deps, signed, cardQueries, generateCalls } = stubDeps()

    const output = await signManifest(
      {
        manifestPath,
        buildOutputDir: ".next/server/app/blog",
        publicKeyPath,
        dryRun: false,
      },
      deps
    )

    expect(cardQueries).toEqual([canary.fingerprint])
    expect(signed).toEqual(["public/posts.asc"])
    expect(generateCalls).toEqual([
      {
        fingerprint: canary.fingerprint,
        buildOutputDir: ".next/server/app/blog",
      },
    ])
    expect(readFileSync(manifestPath, "utf8")).toBe(`signed:${plaintext}`)
    expect(existsSync(`${manifestPath}.tmp`)).toBe(false)
    expect(output).toContain(`Wrote ${manifestPath}`)
    expect(output).toContain(`Fingerprint ${canary.fingerprint}`)
    expect(output).toContain("bun run manifest verify")
  })

  it("returns the generated text without touching the card on a dry run", async () => {
    const { manifestPath, publicKeyPath } = fixtureRoot()
    const { deps, signed, cardQueries } = stubDeps()

    const output = await signManifest(
      {
        manifestPath,
        buildOutputDir: ".next/server/app/blog",
        publicKeyPath,
        dryRun: true,
      },
      deps
    )

    expect(output).toBe(plaintext)
    expect(cardQueries).toEqual([])
    expect(signed).toEqual([])
    expect(existsSync(manifestPath)).toBe(false)
  })

  it("refuses to sign when the card's key does not match the canary's fingerprint", async () => {
    const { manifestPath, publicKeyPath } = fixtureRoot()
    const { deps, signed, cardQueries } = stubDeps({
      fingerprintFromPublicKey: async () => otherFingerprint,
    })

    await expect(
      signManifest(
        {
          manifestPath,
          buildOutputDir: ".next/server/app/blog",
          publicKeyPath,
          dryRun: false,
        },
        deps
      )
    ).rejects.toThrow(
      /does not match the fingerprint lib\/canary\/canary\.ts names/
    )

    expect(cardQueries).toEqual([canary.fingerprint])
    expect(signed).toEqual([])
    expect(existsSync(manifestPath)).toBe(false)
  })

  it("names the expected and actual fingerprint and refuses before any write", async () => {
    const { manifestPath, publicKeyPath } = fixtureRoot()
    const { deps } = stubDeps({
      fingerprintFromPublicKey: async () => otherFingerprint,
    })

    let message = ""
    try {
      await signManifest(
        {
          manifestPath,
          buildOutputDir: ".next/server/app/blog",
          publicKeyPath,
          dryRun: false,
        },
        deps
      )
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }

    expect(message).toContain(`Expected ${canary.fingerprint}`)
    expect(message).toContain(`Card     ${otherFingerprint}`)
    expect(message).toContain("--rotate")
    expect(message).toContain("Nothing has been signed.")
  })

  it("propagates a signer failure and writes nothing", async () => {
    const { manifestPath, publicKeyPath } = fixtureRoot()
    const { deps, cardQueries } = stubDeps({
      clearsignWithCard: async () => {
        throw new Error("card removed mid-signature")
      },
    })

    await expect(
      signManifest(
        {
          manifestPath,
          buildOutputDir: ".next/server/app/blog",
          publicKeyPath,
          dryRun: false,
        },
        deps
      )
    ).rejects.toThrow(/card removed mid-signature/)

    expect(cardQueries).toEqual([canary.fingerprint])
    expect(existsSync(manifestPath)).toBe(false)
  })

  it("refuses to write when the signed file fails to verify against the published key", async () => {
    const { manifestPath, publicKeyPath } = fixtureRoot()
    writeFileSync(manifestPath, "existing signed manifest\n", "utf8")
    const { deps, signed } = stubDeps({
      verifyClearsigned: async () => {
        throw new Error("signature does not verify")
      },
    })

    await expect(
      signManifest(
        {
          manifestPath,
          buildOutputDir: ".next/server/app/blog",
          publicKeyPath,
          dryRun: false,
        },
        deps
      )
    ).rejects.toThrow(/does not clearsign-verify/)

    expect(signed).toEqual(["public/posts.asc"])
    expect(readFileSync(manifestPath, "utf8")).toBe(
      "existing signed manifest\n"
    )
    expect(existsSync(`${manifestPath}.tmp`)).toBe(false)
  })

  it("refuses to write when the verified body is not the manifest that was generated", async () => {
    const { manifestPath, publicKeyPath } = fixtureRoot()
    const { deps } = stubDeps({
      verifyClearsigned: async () => "a different body entirely\n",
    })

    await expect(
      signManifest(
        {
          manifestPath,
          buildOutputDir: ".next/server/app/blog",
          publicKeyPath,
          dryRun: false,
        },
        deps
      )
    ).rejects.toThrow(/is not the manifest that was generated/)

    expect(existsSync(manifestPath)).toBe(false)
    expect(existsSync(`${manifestPath}.tmp`)).toBe(false)
  })

  it("refuses before touching the card when the published public key is unreadable", async () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-sign-"))
    roots.push(root)
    const manifestPath = join(root, "posts.asc")
    const publicKeyPath = join(root, "missing.asc")
    const { deps, cardQueries, signed } = stubDeps()

    await expect(
      signManifest(
        {
          manifestPath,
          buildOutputDir: ".next/server/app/blog",
          publicKeyPath,
          dryRun: false,
        },
        deps
      )
    ).rejects.toThrow(/Cannot read the published public key/)

    expect(cardQueries).toEqual([])
    expect(signed).toEqual([])
  })
})

describe("asClearsignedBody", () => {
  it("ignores the line separator clearsigning treats as framing", () => {
    expect(asClearsignedBody("a\nb\n")).toBe(asClearsignedBody("a\nb"))
  })

  it("ignores trailing whitespace clearsigning strips from each line", () => {
    expect(asClearsignedBody("a  \nb\t\n")).toBe(asClearsignedBody("a\nb"))
  })

  it("ignores the line ending clearsigning normalises", () => {
    expect(asClearsignedBody("a\r\nb")).toBe(asClearsignedBody("a\nb"))
  })

  it("still reports a body whose content differs", () => {
    expect(asClearsignedBody("a\nb\n")).not.toBe(asClearsignedBody("a\nc\n"))
  })

  it("still reports a body with a line removed", () => {
    expect(asClearsignedBody("a\nb\n")).not.toBe(asClearsignedBody("a\n"))
  })
})
