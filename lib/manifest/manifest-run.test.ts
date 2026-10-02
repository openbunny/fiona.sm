import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createCleartextMessage, generateKey, sign } from "openpgp"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { hashArticleText } from "@/lib/manifest/article-hash"
import { buildManifestText } from "@/lib/manifest/manifest-text"
import { manifestEnforcementEnabled } from "@/lib/manifest/manifest-policy"
import { manifestExitCode } from "@/lib/manifest/manifest-report"
import { runManifestGate } from "@/lib/manifest/manifest-run"

const fingerprint = "4820FA938BA2573DE08E4FAD45B4B5460D72A034"

const signer = await generateKey({
  type: "curve25519",
  userIDs: [{ name: "fiona", email: "mail@fiona.sm" }],
  format: "object",
})
const signerPublicKey = signer.publicKey.armor()

function page(text: string): string {
  return `<!DOCTYPE html><html><body><article><p>${text}</p></article></body></html>`
}

describe("runManifestGate", () => {
  let dir: string
  let manifestPath: string
  let articleTextDir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fiona-manifest-test-"))
    manifestPath = join(dir, "posts.asc")
    articleTextDir = join(dir, "posts")
    await writeFile(join(dir, "alpha.html"), page("alpha content"), {
      encoding: "utf8",
    })
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("exits 0 and never fails when not enforced, even on a missing manifest", async () => {
    const result = await runManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha"],
      enforced: false,
    })

    expect(result.exitCode).toBe(manifestExitCode.clean)
    expect(result.messages[0]).toContain("public/posts.asc is missing")
  })

  it("exits non-zero when enforced and the manifest is missing", async () => {
    const result = await runManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha"],
      enforced: true,
    })

    expect(result.exitCode).toBe(manifestExitCode.manifestMissing)
    expect(result.messages[0]).toContain("public/posts.asc is missing")
  })

  it("exits non-zero when enforced and a post's built hash drifted from the signed manifest", async () => {
    const wrongHash = "0".repeat(64)
    const signed = await sign({
      message: await createCleartextMessage({
        text: buildManifestText({
          fingerprint,
          entries: [{ slug: "alpha", sha256: wrongHash }],
        }),
      }),
      signingKeys: signer.privateKey,
    })
    await writeFile(manifestPath, signed, { encoding: "utf8" })

    const result = await runManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha"],
      enforced: true,
    })

    expect(result.exitCode).toBe(
      manifestExitCode.differing |
        manifestExitCode.articleTextMissing |
        manifestExitCode.archiveMissing
    )
    expect(result.messages[0]).toContain('"alpha"')
  })

  it("exits 0 when enforced and every post matches a validly signed manifest with its committed article text", async () => {
    const signed = await sign({
      message: await createCleartextMessage({
        text: buildManifestText({
          fingerprint,
          entries: [
            { slug: "alpha", sha256: hashArticleText("alpha content") },
          ],
        }),
      }),
      signingKeys: signer.privateKey,
    })
    await writeFile(manifestPath, signed, { encoding: "utf8" })
    await mkdir(join(articleTextDir, "alpha"), { recursive: true })
    await writeFile(join(articleTextDir, "alpha.txt"), "alpha content", {
      encoding: "utf8",
    })
    await writeFile(
      join(articleTextDir, "alpha", `${hashArticleText("alpha content")}.txt`),
      "alpha content",
      { encoding: "utf8" }
    )

    const result = await runManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha"],
      enforced: true,
    })

    expect(result.exitCode).toBe(manifestExitCode.clean)
    expect(result.messages).toEqual([])
  })

  it("defaults manifestEnforcementEnabled to true, so the gate above is live by default", () => {
    expect(manifestEnforcementEnabled).toBe(true)
  })
})
