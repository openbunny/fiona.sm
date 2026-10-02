import { readCleartextMessage, readKeys, verify } from "openpgp"
import type { Key } from "openpgp"

const clearsignedBegin = "-----BEGIN PGP SIGNED MESSAGE-----"
const signatureBegin = "-----BEGIN PGP SIGNATURE-----"
const signatureEnd = "-----END PGP SIGNATURE-----"
const publicKeyBegin = "-----BEGIN PGP PUBLIC KEY BLOCK-----"
const publicKeyEnd = "-----END PGP PUBLIC KEY BLOCK-----"

function mapAlgorithm(name: string): string {
  if (name === "ed25519" || name === "eddsaLegacy") {
    return "Ed25519"
  }

  if (name === "ed448") {
    return "Ed448"
  }

  if (name.startsWith("rsa")) {
    return "RSA"
  }

  if (name === "ecdsa") {
    return "ECDSA"
  }

  return name
}

function markerLines(armored: string, opening: boolean): string[] {
  const prefix = opening ? "-----BEGIN PGP " : "-----END PGP "
  const markers: string[] = []

  for (const raw of armored.split("\n")) {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw
    if (line.startsWith(prefix) && line.endsWith("-----")) {
      markers.push(line)
    }
  }

  return markers
}

function sameLines(found: string[], expected: readonly string[]): boolean {
  return (
    found.length === expected.length &&
    found.every((line, index) => line === expected[index])
  )
}

function onlyArmoredBlock(
  input: string,
  begins: readonly string[],
  ends: readonly string[],
  label: string
): string {
  const armored = input.trim()
  const first = begins.at(0)
  const last = ends.at(-1)

  if (
    first === undefined ||
    last === undefined ||
    !sameLines(markerLines(armored, true), begins) ||
    !sameLines(markerLines(armored, false), ends)
  ) {
    throw new Error(`${label} is not exactly one armored block`)
  }

  if (!armored.startsWith(first) || !armored.endsWith(last)) {
    throw new Error(`${label} carries text outside the armored block`)
  }

  return `${armored}\n`
}

async function parsePublicKey(
  armoredKey: string
): Promise<{ key: Key; armored: string }> {
  const armored = onlyArmoredBlock(
    armoredKey,
    [publicKeyBegin],
    [publicKeyEnd],
    "Public key"
  )
  const keys = await readKeys({ armoredKeys: armored })
  const key = keys.at(0)

  if (keys.length !== 1 || key === undefined) {
    throw new Error(
      `Public key armor carries ${keys.length} keys, expected exactly one`
    )
  }

  return { key, armored }
}

async function verifyClearsignedBlock(
  clearsigned: string,
  armoredKey: string
): Promise<{
  cleartext: string
  armored: string
  signatureCreatedAt: string
}> {
  const armored = onlyArmoredBlock(
    clearsigned,
    [clearsignedBegin, signatureBegin],
    [signatureEnd],
    "Clearsigned message"
  )
  const { key } = await parsePublicKey(armoredKey)
  const message = await readCleartextMessage({ cleartextMessage: armored })
  const result = await verify({
    message,
    verificationKeys: key,
    expectSigned: true,
  })
  const verifiedSignature = result.signatures.at(0)
  if (result.signatures.length !== 1 || verifiedSignature === undefined) {
    throw new Error(
      `Clearsigned message has ${result.signatures.length} signatures, expected exactly one`
    )
  }

  await verifiedSignature.verified
  const signature = await verifiedSignature.signature
  const packet = signature.packets.at(0)
  const created = packet?.created
  if (
    signature.packets.length !== 1 ||
    created === null ||
    created === undefined
  ) {
    throw new Error("Verified signature has no unambiguous creation time")
  }

  return {
    cleartext: result.data,
    armored,
    signatureCreatedAt: `${created.toISOString().slice(0, 19)}Z`,
  }
}

export async function fingerprintFromPublicKey(
  armoredKey: string
): Promise<string> {
  const { key } = await parsePublicKey(armoredKey)
  return key.getFingerprint().toUpperCase()
}

export async function algorithmFromPublicKey(
  armoredKey: string
): Promise<string> {
  const { key } = await parsePublicKey(armoredKey)
  return mapAlgorithm(key.getAlgorithmInfo().algorithm)
}

export async function binaryFromPublicKey(
  armoredKey: string
): Promise<Uint8Array> {
  const { key } = await parsePublicKey(armoredKey)
  return key.write()
}

export async function primaryUserIdFromPublicKey(
  armoredKey: string
): Promise<string> {
  const { key } = await parsePublicKey(armoredKey)
  const primary = await key.getPrimaryUser()
  const userId = primary.user.userID?.userID

  if (userId === undefined) {
    throw new Error("Public key has no primary user ID")
  }

  return userId
}

export async function verifiedPublicKeyArmor(
  armoredKey: string
): Promise<string> {
  const { armored } = await parsePublicKey(armoredKey)
  return armored
}

export async function verifyClearsigned(
  clearsigned: string,
  armoredKey: string
): Promise<string> {
  const { cleartext } = await verifyClearsignedBlock(clearsigned, armoredKey)
  return cleartext
}

export async function verifiedClearsigned(
  clearsigned: string,
  armoredKey: string
): Promise<{ cleartext: string; signatureCreatedAt: string }> {
  const { cleartext, signatureCreatedAt } = await verifyClearsignedBlock(
    clearsigned,
    armoredKey
  )
  return { cleartext, signatureCreatedAt }
}

export async function verifiedClearsignedArmor(
  clearsigned: string,
  armoredKey: string
): Promise<string> {
  const { armored } = await verifyClearsignedBlock(clearsigned, armoredKey)
  return armored
}
