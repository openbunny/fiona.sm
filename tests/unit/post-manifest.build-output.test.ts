import { existsSync } from "node:fs"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createCleartextMessage, generateKey, sign } from "openpgp"
import { describe, expect, it } from "vitest"

import { posts } from "@/lib/blog/posts"
import { evaluateManifestGate } from "@/lib/manifest/manifest-gate"
import { generateManifestText } from "@/lib/manifest/manifest-generate"
import { defaultBuildOutputDir } from "@/lib/manifest/manifest-paths"
import { parseManifestEntries } from "@/lib/manifest/manifest-text"

const buildOutputDir = defaultBuildOutputDir()

function requireBuildOutput(): void {
  if (!existsSync(buildOutputDir)) {
    throw new Error(
      `${buildOutputDir} does not exist. This test hashes the prerendered blog pages, so it has nothing to check without a production build: run \`bun run build\` first. In \`bun run check\` and in CI a build always precedes it, so a missing directory is a real failure rather than a reason to skip.`
    )
  }
}

describe("the post manifest generated from the real build output", () => {
  it("carries exactly one entry per post registered in lib/blog/posts.ts", () => {
    requireBuildOutput()

    const text = generateManifestText({
      fingerprint: "4820FA938BA2573DE08E4FAD45B4B5460D72A034",
    })
    const entries = parseManifestEntries(text)
    const slugs = entries.map((entry) => entry.slug)

    expect(slugs).toEqual([...posts.map((post) => post.slug)].sort())
    for (const entry of entries) {
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it("verifies as matching for every post once clearsigned", async () => {
    requireBuildOutput()

    const signer = await generateKey({
      type: "curve25519",
      userIDs: [{ name: "test", email: "test@example.invalid" }],
      format: "object",
    })
    const fingerprint = signer.publicKey.getFingerprint().toUpperCase()

    const text = generateManifestText({ fingerprint })
    const signed = await sign({
      message: await createCleartextMessage({ text }),
      signingKeys: signer.privateKey,
    })

    const dir = await mkdtemp(join(tmpdir(), "fiona-manifest-build-test-"))
    const manifestPath = join(dir, "posts.asc")
    await writeFile(manifestPath, signed, { encoding: "utf8" })

    try {
      const state = await evaluateManifestGate({
        manifestPath,
        publicKeyArmor: signer.publicKey.armor(),
        expectedFingerprint: fingerprint,
        buildOutputDir,
      })

      if (state.kind !== "verified") {
        throw new Error(`Expected a verified state, got "${state.kind}"`)
      }

      expect(state.drift).toHaveLength(posts.length)
      expect(state.drift.map((entry) => entry.state)).toEqual(
        posts.map(() => "matching")
      )
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
