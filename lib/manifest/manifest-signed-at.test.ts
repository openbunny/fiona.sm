import { createCleartextMessage, generateKey, sign } from "openpgp"
import { describe, expect, it } from "vitest"

import {
  manifestSignedAt,
  signedManifestInstant,
} from "@/lib/manifest/manifest-signed-at"

describe("signedManifestInstant", () => {
  it("returns the pgp signature's own creation time, not a guess", async () => {
    const created = new Date("2026-06-15T09:30:00Z")
    const pair = await generateKey({
      type: "ecc",
      curve: "ed25519Legacy",
      userIDs: [{ name: "Test", email: "test@example.invalid" }],
      format: "object",
      date: created,
    })
    const clearsigned = await sign({
      message: await createCleartextMessage({ text: "slug,sha256\n" }),
      signingKeys: pair.privateKey,
      date: created,
    })

    await expect(
      signedManifestInstant(clearsigned, pair.publicKey.armor())
    ).resolves.toBe("2026-06-15T09:30:00Z")
  })

  it("rejects a manifest that is not clearsigned at all", async () => {
    await expect(
      signedManifestInstant("slug,sha256\npost,abc\n", "irrelevant")
    ).rejects.toThrow(/not a clearsigned message/)
  })

  it("rejects a clearsigned manifest whose signature does not verify", async () => {
    const created = new Date("2026-06-15T09:30:00Z")
    const signer = await generateKey({
      type: "ecc",
      curve: "ed25519Legacy",
      userIDs: [{ name: "Signer", email: "signer@example.invalid" }],
      format: "object",
      date: created,
    })
    const stranger = await generateKey({
      type: "ecc",
      curve: "ed25519Legacy",
      userIDs: [{ name: "Stranger", email: "stranger@example.invalid" }],
      format: "object",
    })
    const clearsigned = await sign({
      message: await createCleartextMessage({ text: "slug,sha256\n" }),
      signingKeys: signer.privateKey,
      date: created,
    })

    await expect(
      signedManifestInstant(clearsigned, stranger.publicKey.armor())
    ).rejects.toThrow()
  })
})

describe("manifestSignedAt", () => {
  it("fails loudly, naming the fix, when the manifest file is missing", async () => {
    await expect(manifestSignedAt("does/not/exist/posts.asc")).rejects.toThrow(
      /does\/not\/exist\/posts\.asc is missing.*manifest sign/
    )
  })
})
