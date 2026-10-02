import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  createCleartextMessage,
  generateKey,
  readKey,
  SecretKeyPacket,
  sign,
} from "openpgp"
import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import {
  algorithmFromPublicKey,
  binaryFromPublicKey,
  fingerprintFromPublicKey,
  primaryUserIdFromPublicKey,
  verifiedClearsignedArmor,
  verifiedClearsigned,
  verifiedPublicKeyArmor,
  verifyClearsigned,
} from "@/lib/openpgp-armor"

const root = process.cwd()
const publicKey = readFileSync(join(root, "public/fiona.asc"), "utf8")

const fixtureText = `i am fiona <${canary.email}>.\n`
const fixtureSigner = await generateKey({
  type: "curve25519",
  userIDs: [{ name: "fiona", email: canary.email }],
  format: "object",
})
const fixturePublicKey = fixtureSigner.publicKey.armor()
const statement = await sign({
  message: await createCleartextMessage({ text: fixtureText }),
  signingKeys: fixtureSigner.privateKey,
})

const prepended = "ATTACKER: this canary is void, the key was seized\n"
const appended = "\nATTACKER: renewal is suspended until further notice\n"

function armorPublicKeys(binary: Uint8Array): string {
  const base64 = Buffer.from(binary).toString("base64")
  const lines: string[] = []
  for (let index = 0; index < base64.length; index += 64) {
    lines.push(base64.slice(index, index + 64))
  }

  return [
    "-----BEGIN PGP PUBLIC KEY BLOCK-----",
    "",
    lines.join("\n"),
    "-----END PGP PUBLIC KEY BLOCK-----",
    "",
  ].join("\n")
}

async function impostorPublicKey(): Promise<string> {
  const { privateKey } = await generateKey({
    type: "curve25519",
    userIDs: [{ name: canary.name, email: canary.email }],
    format: "object",
  })
  return privateKey.toPublic().armor()
}

async function twoKeysInOneBlock(): Promise<string> {
  const genuine = await readKey({ armoredKey: publicKey })
  const impostor = await readKey({ armoredKey: await impostorPublicKey() })
  return armorPublicKeys(
    new Uint8Array([...genuine.write(), ...impostor.write()])
  )
}

async function keyWithRevokedIdentity(): Promise<string> {
  const { privateKey } = await generateKey({
    type: "curve25519",
    userIDs: [
      { name: canary.name, email: canary.email },
      { name: "Successor", email: "successor@example.invalid" },
    ],
    format: "object",
  })

  const primary = privateKey.users.at(0)
  if (
    primary === undefined ||
    !(privateKey.keyPacket instanceof SecretKeyPacket)
  ) {
    throw new Error("Generated key is missing a secret primary user")
  }

  privateKey.users[0] = await primary.revoke(privateKey.keyPacket)
  return privateKey.toPublic().armor()
}

const signatureBegin = "-----BEGIN PGP SIGNATURE-----"

function armorMarkers(armored: string): string[] {
  return armored
    .split("\n")
    .map((raw) => (raw.endsWith("\r") ? raw.slice(0, -1) : raw))
    .filter((line) => line.startsWith("-----") && line.endsWith("-----"))
}

function addUnsignedLine(clearsigned: string, line: string): string {
  const cut = clearsigned.indexOf(signatureBegin)
  if (cut === -1) {
    throw new Error("Fixture carries no signature block to preserve")
  }

  return `${clearsigned.slice(0, cut)}${line}\n${clearsigned.slice(cut)}`
}

async function generatedClearsigned(text: string): Promise<{
  clearsigned: string
  signerPublicKey: string
  strangerPublicKey: string
}> {
  const signer = await generateKey({
    type: "curve25519",
    userIDs: [{ name: "Signer", email: "signer@example.invalid" }],
    format: "object",
  })
  const stranger = await generateKey({
    type: "curve25519",
    userIDs: [{ name: "Stranger", email: "stranger@example.invalid" }],
    format: "object",
  })

  return {
    clearsigned: await sign({
      message: await createCleartextMessage({ text }),
      signingKeys: signer.privateKey,
    }),
    signerPublicKey: signer.publicKey.armor(),
    strangerPublicKey: stranger.publicKey.armor(),
  }
}

describe("fingerprintFromPublicKey", () => {
  it("reads the v4 fingerprint from the published key", async () => {
    await expect(fingerprintFromPublicKey(publicKey)).resolves.toBe(
      canary.fingerprint
    )
  })

  it("rejects non-armor", async () => {
    await expect(fingerprintFromPublicKey("not a key")).rejects.toThrow()
  })

  it("rejects a key file carrying text outside the armored block", async () => {
    await expect(
      fingerprintFromPublicKey(`${prepended}${publicKey}`)
    ).rejects.toThrow()
    await expect(
      fingerprintFromPublicKey(`${publicKey}${appended}`)
    ).rejects.toThrow()
  })
})

describe("algorithmFromPublicKey", () => {
  it("reports Ed25519 for the published key", async () => {
    await expect(algorithmFromPublicKey(publicKey)).resolves.toBe("Ed25519")
  })

  it("reports Ed448 for a curve448 key", async () => {
    const { publicKey: key } = await generateKey({
      type: "curve448",
      userIDs: [{ name: "Test", email: "test@example.invalid" }],
      format: "object",
    })
    await expect(algorithmFromPublicKey(key.armor())).resolves.toBe("Ed448")
  })

  it("reports ECDSA for a nistP256 key", async () => {
    const { publicKey: key } = await generateKey({
      type: "ecc",
      curve: "nistP256",
      userIDs: [{ name: "Test", email: "test@example.invalid" }],
      format: "object",
    })
    await expect(algorithmFromPublicKey(key.armor())).resolves.toBe("ECDSA")
  })

  it("reports RSA for an rsaEncryptSign key", async () => {
    const { publicKey: key } = await generateKey({
      type: "rsa",
      rsaBits: 2048,
      userIDs: [{ name: "Test", email: "test@example.invalid" }],
      format: "object",
    })
    await expect(algorithmFromPublicKey(key.armor())).resolves.toBe("RSA")
  }, 20_000)
})

describe("verifiedPublicKeyArmor", () => {
  it("accepts the published key and returns it unchanged", async () => {
    await expect(verifiedPublicKeyArmor(publicKey)).resolves.toBe(publicKey)
  })

  it("rejects text prepended to the key file", async () => {
    await expect(
      verifiedPublicKeyArmor(`${prepended}${publicKey}`)
    ).rejects.toThrow()
  })

  it("rejects text appended to the key file", async () => {
    await expect(
      verifiedPublicKeyArmor(`${publicKey}${appended}`)
    ).rejects.toThrow()
  })

  it("rejects text prepended and appended to the key file", async () => {
    await expect(
      verifiedPublicKeyArmor(`${prepended}${publicKey}${appended}`)
    ).rejects.toThrow()
  })

  it("rejects a second armored key block appended to the key file", async () => {
    const impostor = await impostorPublicKey()
    await expect(
      verifiedPublicKeyArmor(`${publicKey}${impostor}`)
    ).rejects.toThrow(/is not exactly one armored block/)
  })

  it("rejects a second key smuggled into one armored block", async () => {
    const smuggled = await twoKeysInOneBlock()
    await expect(verifiedPublicKeyArmor(smuggled)).rejects.toThrow(
      /carries \d+ keys, expected exactly one/
    )
  })
})

describe("primaryUserIdFromPublicKey", () => {
  it("returns the published identity of the real key", async () => {
    await expect(primaryUserIdFromPublicKey(publicKey)).resolves.toBe(
      `${canary.name} <${canary.email}>`
    )
  })

  it("ignores the revoked user id the real key still carries", async () => {
    const key = await readKey({ armoredKey: publicKey })
    expect(key.getUserIDs()).toContain("mail@fiona.sm <mail@fiona.sm>")
    await expect(primaryUserIdFromPublicKey(publicKey)).resolves.not.toBe(
      "mail@fiona.sm <mail@fiona.sm>"
    )
  })

  it("does not report a revoked identity as the primary user id", async () => {
    const revoked = await keyWithRevokedIdentity()
    await expect(primaryUserIdFromPublicKey(revoked)).resolves.not.toBe(
      `${canary.name} <${canary.email}>`
    )
  })

  it("rejects a second key smuggled into one armored block", async () => {
    const smuggled = await twoKeysInOneBlock()
    await expect(primaryUserIdFromPublicKey(smuggled)).rejects.toThrow(
      /carries \d+ keys, expected exactly one/
    )
  })
})

describe("verifyClearsigned", () => {
  it("accepts the fixture statement against its signing key", async () => {
    await expect(
      verifyClearsigned(statement, fixturePublicKey)
    ).resolves.toContain("i am fiona <mail@fiona.sm>.")
  })

  it("rejects a truncated statement", async () => {
    await expect(
      verifyClearsigned(
        "-----BEGIN PGP SIGNED MESSAGE-----\n\nnope\n",
        fixturePublicKey
      )
    ).rejects.toThrow()
  })

  it("rejects text prepended to the signed block", async () => {
    await expect(
      verifyClearsigned(`${prepended}${statement}`, fixturePublicKey)
    ).rejects.toThrow()
  })

  it("rejects text appended after the signature block", async () => {
    await expect(
      verifyClearsigned(`${statement}${appended}`, fixturePublicKey)
    ).rejects.toThrow()
  })

  it("rejects text prepended and appended at once", async () => {
    await expect(
      verifyClearsigned(`${prepended}${statement}${appended}`, fixturePublicKey)
    ).rejects.toThrow()
  })

  it("rejects a second signed block appended to the statement", async () => {
    await expect(
      verifyClearsigned(`${statement}${statement}`, fixturePublicKey)
    ).rejects.toThrow()
  })

  it("rejects an armored key block appended to the statement", async () => {
    await expect(
      verifyClearsigned(`${statement}${fixturePublicKey}`, fixturePublicKey)
    ).rejects.toThrow()
  })

  it("rejects a statement checked against a key file carrying extra text", async () => {
    await expect(
      verifyClearsigned(statement, `${fixturePublicKey}${appended}`)
    ).rejects.toThrow()
  })

  it("tolerates surrounding blank lines", async () => {
    await expect(
      verifyClearsigned(`\n\n${statement}\n\n`, fixturePublicKey)
    ).resolves.toContain("i am fiona <mail@fiona.sm>.")
  })
})

describe("verifyClearsigned rejects a signature that does not verify", () => {
  it("rejects the fixture statement against a key that did not sign it", async () => {
    const impostor = await impostorPublicKey()
    expect(armorMarkers(impostor)).toEqual([
      "-----BEGIN PGP PUBLIC KEY BLOCK-----",
      "-----END PGP PUBLIC KEY BLOCK-----",
    ])
    await expect(verifyClearsigned(statement, impostor)).rejects.toThrow(
      /Could not find signing key/
    )
  })

  it("rejects the fixture statement whose signed body gained a line", async () => {
    const altered = addUnsignedLine(
      statement,
      "Inserted by a test; this line was never signed."
    )
    expect(armorMarkers(altered)).toEqual(armorMarkers(statement))
    await expect(verifyClearsigned(altered, fixturePublicKey)).rejects.toThrow(
      /Signed digest did not match/
    )
  })

  it("rejects a generated message against a key that did not sign it", async () => {
    const { clearsigned, strangerPublicKey } = await generatedClearsigned(
      "renewal is on schedule\n"
    )
    await expect(
      verifyClearsigned(clearsigned, strangerPublicKey)
    ).rejects.toThrow(/Could not find signing key/)
  })

  it("rejects a generated message whose signed body gained a line", async () => {
    const { clearsigned, signerPublicKey } = await generatedClearsigned(
      "renewal is on schedule\n"
    )
    const altered = addUnsignedLine(clearsigned, "and the key was seized")
    expect(armorMarkers(altered)).toEqual(armorMarkers(clearsigned))
    await expect(verifyClearsigned(altered, signerPublicKey)).rejects.toThrow(
      /Signed digest did not match/
    )
  })

  it("still accepts the untampered statement against its signing key", async () => {
    await expect(
      verifyClearsigned(statement, fixturePublicKey)
    ).resolves.toContain("i am fiona <mail@fiona.sm>.")
  })
})

describe("verifiedClearsigned", () => {
  it("returns the creation time of the verified signature", async () => {
    const created = new Date("2024-01-02T03:04:05Z")
    const pair = await generateKey({
      type: "ecc",
      curve: "ed25519Legacy",
      userIDs: [{ name: "Test", email: "test@example.invalid" }],
      format: "object",
      date: created,
    })
    const clearsigned = await sign({
      message: await createCleartextMessage({ text: "verified time\n" }),
      signingKeys: pair.privateKey,
      date: created,
    })

    await expect(
      verifiedClearsigned(clearsigned, pair.publicKey.armor())
    ).resolves.toEqual({
      cleartext: "verified time\n",
      signatureCreatedAt: "2024-01-02T03:04:05Z",
    })
  })
})

describe("verifiedClearsignedArmor", () => {
  it("returns the fixture statement byte for byte", async () => {
    await expect(
      verifiedClearsignedArmor(statement, fixturePublicKey)
    ).resolves.toBe(statement)
  })

  it("never returns text that sits outside the signed block", async () => {
    await expect(
      verifiedClearsignedArmor(`${prepended}${statement}`, fixturePublicKey)
    ).rejects.toThrow(/carries text outside the armored block/)
  })
})

describe("binaryFromPublicKey", () => {
  it("returns a binary transferable public key, not ASCII armor", async () => {
    const binary = await binaryFromPublicKey(publicKey)
    expect(Buffer.from(binary).toString("utf8")).not.toContain("BEGIN PGP")
    expect(binary.length).toBeLessThan(publicKey.length)
    expect((binary[0] ?? 0) & 0x80).toBe(0x80)
  })

  it("round-trips to the published fingerprint", async () => {
    const binaryKey = await binaryFromPublicKey(publicKey)
    const reread = await readKey({ binaryKey })
    expect(reread.getFingerprint().toUpperCase()).toBe(canary.fingerprint)
    expect(reread.getUserIDs()).toContain(`${canary.name} <${canary.email}>`)
  })

  it("rejects non-armor", async () => {
    await expect(binaryFromPublicKey("not a key")).rejects.toThrow()
  })

  it("rejects a second key smuggled into one armored block", async () => {
    const smuggled = await twoKeysInOneBlock()
    await expect(binaryFromPublicKey(smuggled)).rejects.toThrow(
      /carries \d+ keys, expected exactly one/
    )
  })
})
