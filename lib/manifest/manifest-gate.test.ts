import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createCleartextMessage, generateKey, sign } from "openpgp"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { hashArticleText } from "@/lib/manifest/article-hash"
import { evaluateManifestGate } from "@/lib/manifest/manifest-gate"
import {
  buildManifestText,
  type ManifestEntry,
} from "@/lib/manifest/manifest-text"

const fingerprint = "4820FA938BA2573DE08E4FAD45B4B5460D72A034"

const signer = await generateKey({
  type: "curve25519",
  userIDs: [{ name: "fiona", email: "mail@fiona.sm" }],
  format: "object",
})
const signerPublicKey = signer.publicKey.armor()

const impostor = await generateKey({
  type: "curve25519",
  userIDs: [{ name: "impostor", email: "impostor@example.invalid" }],
  format: "object",
})
const impostorPublicKey = impostor.publicKey.armor()

async function clearsign(text: string): Promise<string> {
  return sign({
    message: await createCleartextMessage({ text }),
    signingKeys: signer.privateKey,
  })
}

async function signedManifest(
  entries: readonly ManifestEntry[]
): Promise<string> {
  return clearsign(buildManifestText({ fingerprint, entries }))
}

function page(text: string): string {
  return `<!DOCTYPE html><html><body><article><p>${text}</p></article></body></html>`
}

const alphaText = "alpha content"
const betaText = "beta content"
const alphaHash = hashArticleText(alphaText)
const betaHash = hashArticleText(betaText)

describe("evaluateManifestGate", () => {
  let dir: string
  let manifestPath: string
  let articleTextDir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fiona-manifest-test-"))
    manifestPath = join(dir, "posts.asc")
    articleTextDir = join(dir, "posts")
    await writeFile(join(dir, "alpha.html"), page(alphaText), {
      encoding: "utf8",
    })
    await writeFile(join(dir, "beta.html"), page(betaText), {
      encoding: "utf8",
    })
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("reports manifestMissing when the manifest file does not exist", async () => {
    const state = await evaluateManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha"],
    })

    expect(state).toEqual({ kind: "manifestMissing" })
  })

  it("reports manifestUnsigned when the file is plain, unsigned manifest text", async () => {
    const entries = [{ slug: "alpha", sha256: alphaHash }]
    await writeFile(manifestPath, buildManifestText({ fingerprint, entries }), {
      encoding: "utf8",
    })

    const state = await evaluateManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha"],
    })

    expect(state).toEqual({ kind: "manifestUnsigned" })
  })

  it("reports signatureInvalid when a different key signed the manifest", async () => {
    const entries = [{ slug: "alpha", sha256: alphaHash }]
    await writeFile(manifestPath, await signedManifest(entries), {
      encoding: "utf8",
    })

    const state = await evaluateManifestGate({
      manifestPath,
      publicKeyArmor: impostorPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha"],
    })

    expect(state.kind).toBe("signatureInvalid")
  })

  it("reports signatureInvalid when the signed body was altered after signing", async () => {
    const entries = [{ slug: "alpha", sha256: alphaHash }]
    const signed = await signedManifest(entries)
    const tampered = signed.replace(
      "post content manifest",
      "post CONTENT manifest"
    )
    expect(tampered).not.toBe(signed)
    await writeFile(manifestPath, tampered, { encoding: "utf8" })

    const state = await evaluateManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha"],
    })

    expect(state.kind).toBe("signatureInvalid")
  })

  it("reports signatureInvalid when the manifest's declared fingerprint is not the expected one", async () => {
    const entries = [{ slug: "alpha", sha256: alphaHash }]
    await writeFile(manifestPath, await signedManifest(entries), {
      encoding: "utf8",
    })

    const state = await evaluateManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: "0".repeat(40),
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha"],
    })

    expect(state.kind).toBe("signatureInvalid")
    if (state.kind === "signatureInvalid") {
      expect(state.detail).toContain("declares fingerprint")
    }
  })

  it("reports noPublishedPosts, not a vacuous pass, when the published post set is empty", async () => {
    await writeFile(manifestPath, await signedManifest([]), {
      encoding: "utf8",
    })

    const state = await evaluateManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: [],
    })

    expect(state).toEqual({ kind: "noPublishedPosts" })
  })

  it("reports matching for every post whose built hash agrees with the manifest", async () => {
    const entries = [
      { slug: "alpha", sha256: alphaHash },
      { slug: "beta", sha256: betaHash },
    ]
    await writeFile(manifestPath, await signedManifest(entries), {
      encoding: "utf8",
    })

    const state = await evaluateManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha", "beta"],
    })

    expect(state).toEqual({
      kind: "verified",
      drift: [
        {
          slug: "alpha",
          state: "matching",
          manifestHash: alphaHash,
          builtHash: alphaHash,
          articleText: "missing",
          archive: "missing",
        },
        {
          slug: "beta",
          state: "matching",
          manifestHash: betaHash,
          builtHash: betaHash,
          articleText: "missing",
          archive: "missing",
        },
      ],
      orphanArticleTextFiles: [],
      corruptArchiveFiles: [],
    })
  })

  it("reports differing when the manifest hash does not match the built hash", async () => {
    const wrongHash = "0".repeat(64)
    const entries = [{ slug: "alpha", sha256: wrongHash }]
    await writeFile(manifestPath, await signedManifest(entries), {
      encoding: "utf8",
    })

    const state = await evaluateManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha"],
    })

    expect(state).toEqual({
      kind: "verified",
      drift: [
        {
          slug: "alpha",
          state: "differing",
          manifestHash: wrongHash,
          builtHash: alphaHash,
          articleText: "missing",
          archive: "missing",
        },
      ],
      orphanArticleTextFiles: [],
      corruptArchiveFiles: [],
    })
  })

  it("reports missingFromManifest for a published post with no manifest entry", async () => {
    const entries = [{ slug: "alpha", sha256: alphaHash }]
    await writeFile(manifestPath, await signedManifest(entries), {
      encoding: "utf8",
    })

    const state = await evaluateManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha", "beta"],
    })

    expect(state).toEqual({
      kind: "verified",
      drift: [
        {
          slug: "alpha",
          state: "matching",
          manifestHash: alphaHash,
          builtHash: alphaHash,
          articleText: "missing",
          archive: "missing",
        },
        { slug: "beta", state: "missingFromManifest" },
      ],
      orphanArticleTextFiles: [],
      corruptArchiveFiles: [],
    })
  })

  it("reports orphanInManifest for a manifest entry no longer published", async () => {
    const entries = [
      { slug: "alpha", sha256: alphaHash },
      { slug: "beta", sha256: betaHash },
    ]
    await writeFile(manifestPath, await signedManifest(entries), {
      encoding: "utf8",
    })

    const state = await evaluateManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha"],
    })

    expect(state).toEqual({
      kind: "verified",
      drift: [
        {
          slug: "alpha",
          state: "matching",
          manifestHash: alphaHash,
          builtHash: alphaHash,
          articleText: "missing",
          archive: "missing",
        },
        { slug: "beta", state: "orphanInManifest", manifestHash: betaHash },
      ],
      orphanArticleTextFiles: [],
      corruptArchiveFiles: [],
    })
  })

  describe("the committed article text file", () => {
    async function writeSignedAlpha(): Promise<void> {
      const entries = [{ slug: "alpha", sha256: alphaHash }]
      await writeFile(manifestPath, await signedManifest(entries), {
        encoding: "utf8",
      })
    }

    it("reports ok when the committed .txt is byte-identical to the fresh build and hashes to the manifest entry", async () => {
      await writeSignedAlpha()
      await mkdir(articleTextDir, { recursive: true })
      await writeFile(join(articleTextDir, "alpha.txt"), alphaText, {
        encoding: "utf8",
      })

      const state = await evaluateManifestGate({
        manifestPath,
        publicKeyArmor: signerPublicKey,
        expectedFingerprint: fingerprint,
        buildOutputDir: dir,
        articleTextDir,
        publishedSlugs: ["alpha"],
      })

      if (state.kind !== "verified") {
        throw new Error(`expected a verified state, got "${state.kind}"`)
      }
      expect(state.drift[0]?.articleText).toBe("ok")
    })

    it("reports missing when no .txt file is committed for a published, manifested post", async () => {
      await writeSignedAlpha()

      const state = await evaluateManifestGate({
        manifestPath,
        publicKeyArmor: signerPublicKey,
        expectedFingerprint: fingerprint,
        buildOutputDir: dir,
        articleTextDir,
        publishedSlugs: ["alpha"],
      })

      if (state.kind !== "verified") {
        throw new Error(`expected a verified state, got "${state.kind}"`)
      }
      expect(state.drift[0]?.articleText).toBe("missing")
    })

    it("reports stale when the committed .txt was mutated after being written", async () => {
      await writeSignedAlpha()
      await mkdir(articleTextDir, { recursive: true })
      await writeFile(
        join(articleTextDir, "alpha.txt"),
        `${alphaText} tampered`,
        { encoding: "utf8" }
      )

      const state = await evaluateManifestGate({
        manifestPath,
        publicKeyArmor: signerPublicKey,
        expectedFingerprint: fingerprint,
        buildOutputDir: dir,
        articleTextDir,
        publishedSlugs: ["alpha"],
      })

      if (state.kind !== "verified") {
        throw new Error(`expected a verified state, got "${state.kind}"`)
      }
      expect(state.drift[0]?.articleText).toBe("stale")
    })

    it("reports stale when the committed .txt no longer matches the freshly built page", async () => {
      await writeSignedAlpha()
      await mkdir(articleTextDir, { recursive: true })
      await writeFile(join(articleTextDir, "alpha.txt"), alphaText, {
        encoding: "utf8",
      })

      await writeFile(join(dir, "alpha.html"), page("alpha content, edited"), {
        encoding: "utf8",
      })

      const state = await evaluateManifestGate({
        manifestPath,
        publicKeyArmor: signerPublicKey,
        expectedFingerprint: fingerprint,
        buildOutputDir: dir,
        articleTextDir,
        publishedSlugs: ["alpha"],
      })

      if (state.kind !== "verified") {
        throw new Error(`expected a verified state, got "${state.kind}"`)
      }
      expect(state.drift[0]?.state).toBe("differing")
      expect(state.drift[0]?.articleText).toBe("stale")
    })

    it("reports an orphan article text file for a post that is no longer published", async () => {
      await writeSignedAlpha()
      await mkdir(articleTextDir, { recursive: true })
      await writeFile(join(articleTextDir, "alpha.txt"), alphaText, {
        encoding: "utf8",
      })
      await writeFile(join(articleTextDir, "gamma.txt"), "orphan content", {
        encoding: "utf8",
      })

      const state = await evaluateManifestGate({
        manifestPath,
        publicKeyArmor: signerPublicKey,
        expectedFingerprint: fingerprint,
        buildOutputDir: dir,
        articleTextDir,
        publishedSlugs: ["alpha"],
      })

      if (state.kind !== "verified") {
        throw new Error(`expected a verified state, got "${state.kind}"`)
      }
      expect(state.orphanArticleTextFiles).toEqual(["gamma"])
    })
  })
})

describe("the revision archive", () => {
  let dir: string
  let manifestPath: string
  let articleTextDir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fiona-archive-test-"))
    manifestPath = join(dir, "posts.asc")
    articleTextDir = join(dir, "posts")
    await writeFile(join(dir, "alpha.html"), page(alphaText), {
      encoding: "utf8",
    })
    await mkdir(join(articleTextDir, "alpha"), { recursive: true })
    await writeFile(join(articleTextDir, "alpha.txt"), alphaText, {
      encoding: "utf8",
    })
    await writeFile(
      manifestPath,
      await signedManifest([{ slug: "alpha", sha256: alphaHash }]),
      { encoding: "utf8" }
    )
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  const evaluate = async () =>
    evaluateManifestGate({
      manifestPath,
      publicKeyArmor: signerPublicKey,
      expectedFingerprint: fingerprint,
      buildOutputDir: dir,
      articleTextDir,
      publishedSlugs: ["alpha"],
    })

  it("reports ok once the current digest is archived under its own name", async () => {
    await writeFile(
      join(articleTextDir, "alpha", `${alphaHash}.txt`),
      alphaText,
      {
        encoding: "utf8",
      }
    )

    const state = await evaluate()

    expect(state.kind).toBe("verified")
    if (state.kind !== "verified") return
    expect(state.drift[0]?.archive).toBe("ok")
    expect(state.corruptArchiveFiles).toEqual([])
  })

  it("reports missing when no file carries the current digest, so a citation would resolve to nothing", async () => {
    const state = await evaluate()

    expect(state.kind).toBe("verified")
    if (state.kind !== "verified") return
    expect(state.drift[0]?.archive).toBe("missing")
  })

  it("names an archived file whose content no longer hashes to its own name", async () => {
    const path = join(articleTextDir, "alpha", `${alphaHash}.txt`)
    await writeFile(path, `${alphaText} tampered`, { encoding: "utf8" })

    const state = await evaluate()

    expect(state.kind).toBe("verified")
    if (state.kind !== "verified") return
    expect(state.corruptArchiveFiles).toEqual([path])
  })

  it("keeps a superseded revision beside the current one, both addressed by their own digests", async () => {
    const superseded = "an earlier revision"
    await writeFile(
      join(articleTextDir, "alpha", `${alphaHash}.txt`),
      alphaText,
      {
        encoding: "utf8",
      }
    )
    await writeFile(
      join(articleTextDir, "alpha", `${hashArticleText(superseded)}.txt`),
      superseded,
      { encoding: "utf8" }
    )

    const state = await evaluate()

    expect(state.kind).toBe("verified")
    if (state.kind !== "verified") return
    expect(state.drift[0]?.archive).toBe("ok")
    expect(state.corruptArchiveFiles).toEqual([])
  })
})
