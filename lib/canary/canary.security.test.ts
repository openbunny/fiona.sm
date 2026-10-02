import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import {
  archiveKeyName,
  listCanaryArchives,
  type CanaryArchive,
} from "@/lib/canary/canary-history"
import {
  primaryUserIdFromPublicKey,
  verifiedPublicKeyArmor,
  verifyClearsigned,
} from "@/lib/openpgp-armor"

const root = process.cwd()
const publicDir = join(root, "public")
const privateKeyBlock = ["BEGIN PGP", "PRIVATE KEY"].join(" ")
const fixtures: string[] = []

afterEach(() => {
  for (const dir of fixtures.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function fixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "canary-security-"))
  fixtures.push(dir)
  return dir
}

function publishedPaths(directory = publicDir): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? publishedPaths(join(directory, entry.name))
      : [join(directory, entry.name)]
  )
}

function archivePaths(archives: readonly CanaryArchive[]): string[] {
  return archives.flatMap((archive) =>
    archive.keyPath === undefined
      ? [archive.filePath]
      : [archive.filePath, archive.keyPath]
  )
}

function carryingPrivateKey(paths: readonly string[]): string[] {
  return paths.filter((path) =>
    readFileSync(path, "utf8").includes(privateKeyBlock)
  )
}

describe("published key material", () => {
  it("does not include a private key block", () => {
    const publicKey = readFileSync(join(root, "public/fiona.asc"), "utf8")

    expect(publicKey).not.toContain(privateKeyBlock)
    expect(publicKey).toContain("BEGIN PGP PUBLIC KEY BLOCK")
    expect(canary.signedStatement).not.toContain(privateKeyBlock)
  })

  it("scans every file published under public/, archives included", () => {
    const published = publishedPaths()

    expect(published).toContain(join(publicDir, "fiona.asc"))
    expect(published).toEqual(
      expect.arrayContaining(archivePaths(listCanaryArchives()))
    )
    expect(carryingPrivateKey(published)).toEqual([])
  })

  it("reads the key of an archive, not only its statement", () => {
    const dir = fixtureDir()
    const signedOn = "2026-08-25"
    const statementPath = join(dir, `${signedOn}.asc`)
    const keyPath = join(dir, archiveKeyName(signedOn))

    writeFileSync(statementPath, "-----BEGIN PGP SIGNED MESSAGE-----\n")
    writeFileSync(keyPath, `-----${privateKeyBlock} BLOCK-----\n`)

    const scanned = archivePaths(listCanaryArchives(dir))

    expect(scanned).toEqual([statementPath, keyPath])
    expect(carryingPrivateKey(scanned)).toEqual([keyPath])
  })

  it("ships one key per published key file and nothing beside it", async () => {
    const publicKey = readFileSync(join(root, "public/fiona.asc"), "utf8")
    await expect(verifiedPublicKeyArmor(publicKey)).resolves.toBe(publicKey)

    for (const archive of listCanaryArchives()) {
      if (archive.keyPath === undefined) {
        continue
      }

      const armored = readFileSync(archive.keyPath, "utf8")
      await expect(verifiedPublicKeyArmor(armored)).resolves.toBe(armored)
    }
  })

  it("binds the published key to the canary identity through a live user id", async () => {
    const publicKey = readFileSync(join(root, "public/fiona.asc"), "utf8")
    await expect(primaryUserIdFromPublicKey(publicKey)).resolves.toBe(
      `${canary.name} <${canary.email}>`
    )
  })
})

describe("published security.txt", () => {
  it("carries a signature made by the canary key", async () => {
    const publicKey = readFileSync(join(root, "public/fiona.asc"), "utf8")
    const securityTxt = readFileSync(
      join(root, "public/.well-known/security.txt"),
      "utf8"
    )

    const cleartext = await verifyClearsigned(securityTxt, publicKey)
    expect(cleartext).toContain(
      `Encryption: openpgp4fpr:${canary.fingerprint.toLowerCase()}`
    )
  })
})
