import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { canary } from "@/lib/canary/canary"
import { renewCanary, type RenewDeps } from "@/lib/renew/canary-renew"
import { nowIsoUtc, todayIsoUtc } from "@/lib/iso-date"
import { wkdKeyHref, wkdPolicyHref } from "@/lib/publish/wkd"

const topBlockHash =
  "55e6d6a1c45bdcd1926b3253150b236d11e25bab4bc67b9fac18bc9ca04db2a8"

const renewedHeight = canary.moneroBlockHeight + 1

const fixture = {
  height: renewedHeight + 1,
  top_block_hash: topBlockHash,
}

const rotatedFingerprint = "F39854405552A54D3503D0F65E86E684E851380C"
const outgoingStatement = "-----BEGIN PGP SIGNED MESSAGE-----\nouting\n"
const outgoingKey = "-----BEGIN PGP PUBLIC KEY BLOCK-----\nold\n"
const publicKeyArmor = "-----BEGIN PGP PUBLIC KEY BLOCK-----\nfresh\n"

const moduleSource = `const priorFingerprints: readonly string[] = []

export const canary = {
  name: "Fiona P",
  email: "mail@fiona.sm",
  fingerprint: "${canary.fingerprint}",
  algorithm: "Ed25519",
  signedOn: "1999-01-01",
  signedAt: "1999-01-01T00:00:00Z",
  renewBy: "1999-04-01",
  moneroBlockHeight: 3700000,
  moneroBlockHash: "2852fc32d11b2811025102bb435a0f655fa92769f103d8c40ca5bd214f48b893",
  previousStatementHash: "138f57d7487d5f54e7f1b92733ead3a330b89721fa99925cb05840cf6642eb8e",
} as const
`

const readmeSource = `# fiona.sm

[![renew by 1 April 1999](https://img.shields.io/badge/x)](https://fiona.sm/canary.asc)

### Check the proof of date

The last line of the statement names a Monero block and its hash:

\`\`\`text
Proof of date: Monero block 3700000
2852fc32d11b2811025102bb435a0f655fa92769f103d8c40ca5bd214f48b893
\`\`\`

That block is independently checkable:

\`\`\`bash
curl -d '{"params":{"height":3700000}}'
\`\`\`

Explorer: <https://xmrchain.net/block/3700000>.

Substitute the height and hash from the statement you fetched.
`

const roots: string[] = []

beforeEach(() => {
  freezeAt("2026-08-26T12:00:00Z")
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

function freezeAt(isoInstant: string): void {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(isoInstant))
}

function fixtureRoot(source = moduleSource, readme = readmeSource): string {
  const root = mkdtempSync(join(tmpdir(), "canary-renew-"))
  roots.push(root)
  mkdirSync(join(root, "public"), { recursive: true })
  mkdirSync(join(root, "lib/canary"), { recursive: true })
  writeFileSync(join(root, "public/canary.asc"), outgoingStatement)
  writeFileSync(join(root, "public/fiona.asc"), outgoingKey)
  writeFileSync(join(root, "lib/canary/canary.ts"), source)
  writeFileSync(join(root, "README.md"), readme)
  return root
}

function stubDeps(
  root: string,
  overrides: Partial<RenewDeps> = {}
): {
  deps: RenewDeps
  signed: string[]
  cardQueries: string[]
  sleeps: number[]
} {
  const signed: string[] = []
  const cardQueries: string[] = []
  const sleeps: number[] = []
  const deps: RenewDeps = {
    root,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds)
    },
    fetchLatestBlock: async () => ({
      hash: topBlockHash,
      height: renewedHeight,
    }),
    cardSigningKey: async () => {
      cardQueries.push(canary.fingerprint)
      return canary.fingerprint
    },
    exportPublicKey: async () => publicKeyArmor,
    clearsignWithCard: async (plaintext, _key, label, _logger) => {
      signed.push(label)
      return `-----BEGIN PGP SIGNED MESSAGE-----\n\n${plaintext}\n-----BEGIN PGP SIGNATURE-----\nstub\n-----END PGP SIGNATURE-----\n`
    },
    verifyClearsigned: async (clearsigned) => ({
      cleartext: clearsigned,
      signatureCreatedAt: nowIsoUtc(),
    }),
    fingerprintFromPublicKey: async () => canary.fingerprint,
    algorithmFromPublicKey: async () => "Ed25519",
    binaryFromPublicKey: async () => new Uint8Array([0x98, 0x33, 0x16]),
    primaryUserIdFromPublicKey: async () => `${canary.name} <${canary.email}>`,
    ...overrides,
  }

  return { deps, signed, cardQueries, sleeps }
}

function stagedFiles(root: string): string[] {
  return readdirSync(root, { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => entry.endsWith(".tmp"))
}

function backupFiles(root: string): string[] {
  return readdirSync(root, { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => entry.endsWith(".prev"))
}

function read(root: string, relative: string): string {
  return readFileSync(join(root, relative), "utf8")
}

async function rejectionMessage(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (error) {
    return error instanceof Error ? error.message : "Not an error"
  }

  throw new Error("Expected the renewal to reject")
}

const live = { days: 90, dryRun: false, rotate: false }

describe("renewCanary", () => {
  it.each([
    ["a decade, which is #225's recorded mutation", 3650],
    ["one more than the bound", 367],
    ["zero", 0],
    ["negative", -1],
    ["fractional", 90.5],
    ["not a number at all", Number.NaN],
    ["infinite", Number.POSITIVE_INFINITY],
  ])("refuses %s before anything is signed", async (_label, days) => {
    const root = fixtureRoot()
    const { deps, signed } = stubDeps(root)

    await expect(renewCanary({ ...live, days }, deps)).rejects.toThrow(
      /Days must be a whole number from 1 to 366/
    )
    expect(signed).toEqual([])
    expect(read(root, "public/canary.asc")).toBe(outgoingStatement)
  })

  it("refuses an unchecked window on the dry run too", async () => {
    const root = fixtureRoot()
    const { deps } = stubDeps(root)

    await expect(
      renewCanary({ days: 3650, dryRun: true, rotate: false }, deps)
    ).rejects.toThrow(/Days must be a whole number from 1 to 366/)
  })

  it("accepts the bound itself, and the CLI's default", async () => {
    const root = fixtureRoot()
    const { deps } = stubDeps(root)

    for (const days of [1, 90, 366]) {
      await expect(
        renewCanary({ days, dryRun: true, rotate: false }, deps)
      ).resolves.toContain("renew")
    }
  })

  it("aborts after the statement touch when its signature time is not the signed minute", async () => {
    const root = fixtureRoot()
    const { deps, signed } = stubDeps(root, {
      verifyClearsigned: async (clearsigned) => ({
        cleartext: clearsigned,
        signatureCreatedAt: "1999-01-01T00:00:00Z",
      }),
    })

    await expect(renewCanary(live, deps)).rejects.toThrow(
      /is outside the signed minute/
    )
    expect(signed).toEqual(["public/canary.asc"])
    expect(read(root, "public/canary.asc")).toBe(outgoingStatement)
    expect(existsSync(join(root, "public/.well-known/security.txt"))).toBe(
      false
    )
  })

  it("waits for the next utc minute when the run starts too late in the minute", async () => {
    freezeAt("2026-08-26T12:00:55Z")
    const root = fixtureRoot()
    const order: string[] = []
    const { deps, signed } = stubDeps(root, {
      sleep: async (milliseconds) => {
        order.push(`sleep ${milliseconds}`)
        vi.setSystemTime(new Date(Date.now() + milliseconds))
      },
      cardSigningKey: async () => {
        order.push("card")
        return canary.fingerprint
      },
    })

    const output = await renewCanary(live, deps)

    expect(order).toEqual(["sleep 5000", "card"])
    expect(signed).toEqual([
      "public/canary.asc",
      "public/.well-known/security.txt",
    ])
    expect(read(root, "public/canary.asc")).toContain(
      "as of 26 august 2026 12:01 utc"
    )
    expect(read(root, "lib/canary/canary.ts")).toContain(
      'signedAt: "2026-08-26T12:01:00Z"'
    )
    expect(output).toContain("signedAt 2026-08-26T12:01:00Z")
  })

  it("does not wait when the utc minute still has room for the signing latency", async () => {
    freezeAt("2026-08-26T12:00:05Z")
    const root = fixtureRoot()
    const { deps, sleeps } = stubDeps(root)

    const output = await renewCanary(live, deps)

    expect(sleeps).toEqual([])
    expect(read(root, "public/canary.asc")).toContain(
      "as of 26 august 2026 12:00 utc"
    )
    expect(read(root, "lib/canary/canary.ts")).toContain(
      'signedAt: "2026-08-26T12:00:05Z"'
    )
    expect(output).toContain("signedAt 2026-08-26T12:00:05Z")
  })

  it("holds the wait threshold at second 40, leaving twenty seconds for the touch", async () => {
    const root = fixtureRoot()
    freezeAt("2026-08-26T12:00:39Z")
    const early = stubDeps(root)

    await renewCanary(live, early.deps)

    expect(early.sleeps).toEqual([])

    const lateRoot = fixtureRoot()
    freezeAt("2026-08-26T12:00:40Z")
    const late = stubDeps(lateRoot)

    await renewCanary(live, late.deps)

    expect(late.sleeps).toEqual([20_000])
  })

  it("captures the signing instant after the monero fetch and the card query", async () => {
    freezeAt("2026-08-26T12:00:00Z")
    const root = fixtureRoot()
    const fetchInstants: string[] = []
    const { deps, signed } = stubDeps(root, {
      fetchLatestBlock: async (checkedAt) => {
        fetchInstants.push(String(checkedAt))
        vi.setSystemTime(new Date("2026-08-26T12:01:00Z"))
        return { hash: topBlockHash, height: renewedHeight }
      },
      cardSigningKey: async () => {
        vi.setSystemTime(new Date("2026-08-26T12:02:00Z"))
        return canary.fingerprint
      },
    })

    const output = await renewCanary(live, deps)

    expect(fetchInstants).toEqual(["2026-08-26T12:00:00Z"])
    expect(signed).toEqual([
      "public/canary.asc",
      "public/.well-known/security.txt",
    ])
    expect(read(root, "public/canary.asc")).toContain(
      "as of 26 august 2026 12:02 utc"
    )
    expect(read(root, "lib/canary/canary.ts")).toContain(
      'signedAt: "2026-08-26T12:02:00Z"'
    )
    expect(output).toContain("signedAt 2026-08-26T12:02:00Z")
  })

  it("records the signature packet creation time when the touch lands inside the signed minute", async () => {
    freezeAt("2026-08-26T12:00:00Z")
    const packetSignedAt = "2026-08-26T12:00:11Z"
    const root = fixtureRoot()
    const { deps, signed } = stubDeps(root, {
      verifyClearsigned: async (clearsigned) => ({
        cleartext: clearsigned,
        signatureCreatedAt: packetSignedAt,
      }),
    })

    const output = await renewCanary(live, deps)

    expect(signed).toEqual([
      "public/canary.asc",
      "public/.well-known/security.txt",
    ])
    expect(read(root, "lib/canary/canary.ts")).toContain(
      `signedAt: "${packetSignedAt}"`
    )
    expect(read(root, "lib/canary/canary.ts")).toContain(
      'signedOn: "2026-08-26"'
    )
    expect(read(root, "public/canary.asc")).toContain(
      "as of 26 august 2026 12:00 utc"
    )
    expect(output).toContain(`signedAt ${packetSignedAt}`)
  })

  it("aborts before the security.txt touch when the signature packet crosses the signed minute", async () => {
    freezeAt("2026-08-26T12:00:59Z")
    const root = fixtureRoot()
    const { deps, signed } = stubDeps(root, {
      verifyClearsigned: async (clearsigned) => ({
        cleartext: clearsigned,
        signatureCreatedAt: "2026-08-26T12:01:00Z",
      }),
    })

    await expect(renewCanary(live, deps)).rejects.toThrow(
      /is outside the signed minute[\s\S]*Re-run the renewal/
    )
    expect(signed).toEqual(["public/canary.asc"])
    expect(read(root, "lib/canary/canary.ts")).toContain(
      'signedAt: "1999-01-01'
    )
    expect(existsSync(join(root, "public/.well-known/security.txt"))).toBe(
      false
    )
  })

  it("returns plaintext on dry-run with the latest monero block hash", async () => {
    vi.stubGlobal(
      "fetch",
      async (input: string | URL | Request) =>
        new Response(
          JSON.stringify(
            String(input).includes("json_rpc")
              ? {
                  result: {
                    block_header: {
                      hash: topBlockHash,
                      height: fixture.height - 1,
                      timestamp: Math.floor(Date.now() / 1000) - 60,
                    },
                  },
                }
              : fixture
          ),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        )
    )

    const text = await renewCanary({
      days: 90,
      dryRun: true,
      rotate: false,
    })

    expect(text).toContain("i am fiona <mail@fiona.sm>.")
    expect(text).toContain(`proof of date: monero block ${renewedHeight}`)
    expect(text).toContain(topBlockHash)
    expect(text).not.toContain("BEGIN PGP SIGNATURE")
    expect(text).not.toContain("headline")
  })

  it("fails dry-run when monerospace is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      async () => new Response(null, { status: 503, statusText: "Unavailable" })
    )

    await expect(
      renewCanary({ days: 90, dryRun: true, rotate: false })
    ).rejects.toThrow(/Failed to fetch latest block hash/)
  })

  it("writes every published file, archives the outgoing pair, and leaves no staged file", async () => {
    const root = fixtureRoot()
    const { deps, signed } = stubDeps(root)

    const output = await renewCanary(live, deps)

    expect(signed).toEqual([
      "public/canary.asc",
      "public/.well-known/security.txt",
    ])
    expect(read(root, "public/fiona.asc")).toBe(publicKeyArmor)
    expect(read(root, "public/canary.asc")).toContain("i am fiona")
    expect(read(root, "public/.well-known/security.txt")).toContain("Expires:")
    expect(read(root, "public/security-policy.txt")).toContain(canary.email)
    expect(existsSync(join(root, `public${wkdKeyHref(canary.email)}`))).toBe(
      true
    )
    expect(read(root, `public${wkdPolicyHref}`)).toBeTruthy()
    expect(read(root, "public/llms.txt")).toContain(
      `/canary/${canary.signedOn}.asc`
    )
    expect(read(root, `public/canary/${canary.signedOn}.asc`)).toBe(
      outgoingStatement
    )
    expect(read(root, `public/canary/${canary.signedOn}.key.asc`)).toBe(
      outgoingKey
    )
    expect(read(root, "lib/canary/canary.ts")).toContain(
      `signedOn: "${todayIsoUtc()}"`
    )
    expect(read(root, "lib/canary/canary.ts")).not.toContain("1999-01-01")
    expect(read(root, "lib/canary/canary.ts")).toContain(
      `moneroBlockHeight: ${renewedHeight}`
    )
    expect(read(root, "lib/canary/canary.ts")).toContain(topBlockHash)
    expect(read(root, "public/canary.asc")).toContain(
      "previous statement: sha256:"
    )
    expect(read(root, "README.md")).toContain("[![renew by ")
    expect(read(root, "README.md")).not.toContain("1 April 1999")
    expect(read(root, "README.md")).toContain(
      `Proof of date: Monero block ${renewedHeight}`
    )
    expect(read(root, "README.md")).toContain(topBlockHash)
    expect(read(root, "README.md")).toContain(`"height":${renewedHeight}`)
    expect(read(root, "README.md")).toContain(
      `https://xmrchain.net/block/${renewedHeight}`
    )
    expect(stagedFiles(root)).toEqual([])
    expect(backupFiles(root)).toEqual([])
    expect(output).toContain(`Archived public/canary/${canary.signedOn}.asc`)
  })

  it("treats a missing public/canary.asc as the first statement of a fresh chain on a dry run", async () => {
    const root = fixtureRoot()
    rmSync(join(root, "public/canary.asc"))
    const { deps } = stubDeps(root)

    const text = await renewCanary({ ...live, dryRun: true }, deps)

    expect(text).not.toMatch(/previous statement/i)
    expect(text).toContain("proof of date: monero block")
  })

  it("archives nothing and still produces the new pair on a fresh chain", async () => {
    const root = fixtureRoot()
    rmSync(join(root, "public/canary.asc"))
    const { deps, signed } = stubDeps(root)

    const output = await renewCanary(live, deps)

    expect(signed).toEqual([
      "public/canary.asc",
      "public/.well-known/security.txt",
    ])
    expect(read(root, "public/fiona.asc")).toBe(publicKeyArmor)
    expect(read(root, "public/canary.asc")).toContain("i am fiona")
    expect(read(root, "public/canary.asc")).not.toContain("previous statement:")
    expect(existsSync(join(root, "public/canary"))).toBe(false)
    expect(read(root, "public/llms.txt")).not.toContain("/canary/")
    expect(read(root, "lib/canary/canary.ts")).toContain(
      `signedOn: "${todayIsoUtc()}"`
    )
    expect(read(root, "lib/canary/canary.ts")).not.toContain(
      "138f57d7487d5f54e7f1b92733ead3a330b89721fa99925cb05840cf6642eb8e"
    )
    expect(read(root, "lib/canary/canary.ts")).toContain(
      "previousStatementHash: undefined as string | undefined"
    )
    expect(stagedFiles(root)).toEqual([])
    expect(backupFiles(root)).toEqual([])
    expect(output).not.toContain("Archived public/canary")
    expect(output).toContain("nothing archived")
  })

  it("propagates a real failure reading the outgoing statement instead of treating it as absent", async () => {
    const root = fixtureRoot()
    rmSync(join(root, "public/canary.asc"))
    mkdirSync(join(root, "public/canary.asc"))
    const { deps, signed, cardQueries } = stubDeps(root)

    await expect(renewCanary(live, deps)).rejects.toThrow()

    expect(cardQueries).toEqual([])
    expect(signed).toEqual([])
  })

  it("refuses a signing key that does not match the published canary, before any touch", async () => {
    const root = fixtureRoot()
    const { deps, signed } = stubDeps(root, {
      fingerprintFromPublicKey: async () => rotatedFingerprint,
    })

    await expect(renewCanary(live, deps)).rejects.toThrow(
      /re-run with --rotate/
    )

    expect(signed).toEqual([])
    expect(read(root, "public/canary.asc")).toBe(outgoingStatement)
    expect(existsSync(join(root, "public/canary"))).toBe(false)
  })

  it("refuses a rotation to a key that certifies another address, before any touch", async () => {
    const root = fixtureRoot()
    const { deps, signed } = stubDeps(root, {
      fingerprintFromPublicKey: async () => rotatedFingerprint,
      primaryUserIdFromPublicKey: async () => `${canary.name} <src@fiona.sm>`,
    })

    const message = await rejectionMessage(
      renewCanary({ ...live, rotate: true }, deps)
    )

    expect(message).toContain("does not certify the canary identity")
    expect(message).toContain(`${canary.name} <${canary.email}>`)
    expect(message).toContain(`${canary.name} <src@fiona.sm>`)
    expect(signed).toEqual([])
    expect(read(root, "public/canary.asc")).toBe(outgoingStatement)
    expect(read(root, "public/fiona.asc")).toBe(outgoingKey)
    expect(read(root, "lib/canary/canary.ts")).toBe(moduleSource)
    expect(existsSync(join(root, "public/canary"))).toBe(false)
  })

  it("checks the key identity even when the fingerprint is unchanged", async () => {
    const root = fixtureRoot()
    const { deps, signed } = stubDeps(root, {
      primaryUserIdFromPublicKey: async () => "Someone Else <x@example.com>",
    })

    await expect(renewCanary(live, deps)).rejects.toThrow(
      /does not certify the canary identity/
    )
    expect(signed).toEqual([])
    expect(read(root, "public/fiona.asc")).toBe(outgoingKey)
  })

  it("rejects a stale monero block before the card is queried", async () => {
    const root = fixtureRoot()
    const { deps, cardQueries } = stubDeps(root, {
      fetchLatestBlock: async () => ({
        hash: topBlockHash,
        height: canary.moneroBlockHeight,
      }),
    })

    await expect(renewCanary(live, deps)).rejects.toThrow(/does not advance/)
    expect(cardQueries).toEqual([])
  })

  it("rejects an implausible monero advance before the card is queried", async () => {
    const root = fixtureRoot()
    const { deps, cardQueries, signed } = stubDeps(root, {
      fetchLatestBlock: async () => ({
        hash: topBlockHash,
        height: canary.moneroBlockHeight + 10_000_000,
      }),
    })

    await expect(renewCanary(live, deps)).rejects.toThrow(
      /Monero block advance 10000000 is implausible/
    )
    expect(cardQueries).toEqual([])
    expect(signed).toEqual([])
  })

  it("accepts a monero advance that sits on the plausible ceiling", async () => {
    freezeAt("2026-08-26T12:00:00Z")
    const height = canary.moneroBlockHeight + 1020
    const root = fixtureRoot()
    const { deps } = stubDeps(root, {
      fetchLatestBlock: async () => ({ hash: topBlockHash, height }),
    })

    await renewCanary(live, deps)

    expect(read(root, "lib/canary/canary.ts")).toContain(
      `moneroBlockHeight: ${height}`
    )
  })

  it("accepts a different signing key when --rotate is given", async () => {
    const root = fixtureRoot()
    const { deps } = stubDeps(root, {
      fingerprintFromPublicKey: async () => rotatedFingerprint,
    })

    const output = await renewCanary({ ...live, rotate: true }, deps)

    expect(output).toContain(`Key rotated from ${canary.fingerprint}`)
    expect(read(root, "lib/canary/canary.ts")).toContain(
      `fingerprint: "${rotatedFingerprint}"`
    )
    expect(read(root, "lib/canary/canary.ts")).toContain(
      `  "${canary.fingerprint}",`
    )
  })

  it("retains prior fingerprints and appends the outgoing fingerprint once on rotation", async () => {
    const prior = "1111111111111111111111111111111111111111"
    const root = fixtureRoot(
      moduleSource.replace(
        "const priorFingerprints: readonly string[] = []",
        `const priorFingerprints: readonly string[] = [\n  "${prior}",\n]`
      )
    )
    const { deps } = stubDeps(root, {
      fingerprintFromPublicKey: async () => rotatedFingerprint,
    })

    await renewCanary({ ...live, rotate: true }, deps)

    const source = read(root, "lib/canary/canary.ts")
    expect(source.split(prior)).toHaveLength(2)
    expect(source.split(canary.fingerprint)).toHaveLength(2)
  })

  it("leaves prior fingerprints unchanged without rotation", async () => {
    const prior = "1111111111111111111111111111111111111111"
    const declaration = `const priorFingerprints: readonly string[] = [\n  "${prior}",\n]`
    const root = fixtureRoot(
      moduleSource.replace(
        "const priorFingerprints: readonly string[] = []",
        declaration
      )
    )
    const { deps } = stubDeps(root)

    await renewCanary(live, deps)

    expect(read(root, "lib/canary/canary.ts")).toContain(declaration)
  })

  it("rejects invalid existing prior fingerprints before the card is queried", async () => {
    const root = fixtureRoot(
      moduleSource.replace(
        "const priorFingerprints: readonly string[] = []",
        `const priorFingerprints: readonly string[] = [\n  "${canary.fingerprint}",\n]`
      )
    )
    const { deps, cardQueries } = stubDeps(root)

    await expect(renewCanary(live, deps)).rejects.toThrow(
      /Rotation is one-way.*retired fingerprint.*current/i
    )
    expect(cardQueries).toEqual([])
  })

  it("rejects duplicate existing prior fingerprints before the card is queried", async () => {
    const prior = "1111111111111111111111111111111111111111"
    const root = fixtureRoot(
      moduleSource.replace(
        "const priorFingerprints: readonly string[] = []",
        `const priorFingerprints: readonly string[] = [\n  "${prior}",\n  "${prior}",\n]`
      )
    )
    const { deps, cardQueries } = stubDeps(root)

    await expect(renewCanary(live, deps)).rejects.toThrow(
      /Duplicate prior fingerprint/
    )
    expect(cardQueries).toEqual([])
  })

  it("refuses to overwrite a same-day archive that holds a different statement", async () => {
    const root = fixtureRoot()
    mkdirSync(join(root, "public/canary"), { recursive: true })
    writeFileSync(
      join(root, `public/canary/${canary.signedOn}.asc`),
      "a different statement"
    )
    const { deps, signed, cardQueries } = stubDeps(root)

    await expect(renewCanary(live, deps)).rejects.toThrow(
      /already holds different content; refusing to overwrite archived history/
    )

    expect(cardQueries).toEqual([])
    expect(signed).toEqual([])
    expect(read(root, `public/canary/${canary.signedOn}.asc`)).toBe(
      "a different statement"
    )
    expect(read(root, "public/canary.asc")).toBe(outgoingStatement)
  })

  it("refuses to overwrite a same-day archived key that holds a different key", async () => {
    const root = fixtureRoot()
    mkdirSync(join(root, "public/canary"), { recursive: true })
    writeFileSync(
      join(root, `public/canary/${canary.signedOn}.asc`),
      outgoingStatement
    )
    writeFileSync(
      join(root, `public/canary/${canary.signedOn}.key.asc`),
      "a different key"
    )
    const { deps, signed, cardQueries } = stubDeps(root)

    await expect(renewCanary(live, deps)).rejects.toThrow(
      `${canary.signedOn}.key.asc already holds different`
    )
    expect(cardQueries).toEqual([])
    expect(signed).toEqual([])
  })

  it("rejects a stray archive filename before the card is queried", async () => {
    const root = fixtureRoot()
    mkdirSync(join(root, "public/canary"), { recursive: true })
    writeFileSync(join(root, "public/canary/2026-13-45.asc"), "impossible")
    const { deps, cardQueries } = stubDeps(root)

    await expect(renewCanary(live, deps)).rejects.toThrow(
      "Invalid archive date 2026-13-45"
    )
    expect(cardQueries).toEqual([])
  })

  it("spends no touch when the canary module cannot be patched unambiguously", async () => {
    const duplicated = moduleSource.replace(
      '  signedOn: "1999-01-01",\n',
      '  signedOn: "1999-01-01",\n  signedOn: "1999-01-01",\n'
    )
    const root = fixtureRoot(duplicated)
    const { deps, signed, cardQueries } = stubDeps(root)

    const message = await rejectionMessage(renewCanary(live, deps))

    expect(message).toContain("signedOn appears 2 times")
    expect(message).toContain("the card was not asked to sign")
    expect(signed).toEqual([])
    expect(cardQueries).toEqual([canary.fingerprint])
    expect(read(root, "public/canary.asc")).toBe(outgoingStatement)
    expect(read(root, "public/fiona.asc")).toBe(outgoingKey)
    expect(existsSync(join(root, "public/canary"))).toBe(false)
    expect(existsSync(join(root, "public/llms.txt"))).toBe(false)
    expect(stagedFiles(root)).toEqual([])
  })

  it("spends no touch when the readme has lost its renew-by badge", async () => {
    const root = fixtureRoot(moduleSource, "# fiona.sm\n\nprose\n")
    const { deps, signed } = stubDeps(root)

    const message = await rejectionMessage(renewCanary(live, deps))

    expect(message).toContain("Missing renew-by badge in README")
    expect(signed).toEqual([])
    expect(read(root, "public/canary.asc")).toBe(outgoingStatement)
    expect(existsSync(join(root, "public/canary"))).toBe(false)
  })

  it("spends no touch when the readme badge line is unterminated", async () => {
    const root = fixtureRoot(
      moduleSource,
      "# fiona.sm\n\n[![renew by 1 April 1999](https://img.shields.io/badge/x)](https://fiona.sm/canary.asc)"
    )
    const { deps, signed } = stubDeps(root)

    const message = await rejectionMessage(renewCanary(live, deps))

    expect(message).toContain("Unterminated renew-by badge in README")
    expect(signed).toEqual([])
    expect(read(root, "public/canary.asc")).toBe(outgoingStatement)
  })

  it("spends no touch when the algorithm cannot be read from the exported key", async () => {
    const root = fixtureRoot()
    const { deps, signed, cardQueries } = stubDeps(root, {
      algorithmFromPublicKey: async () => {
        throw new Error("Public key is not exactly one armored block")
      },
    })

    const message = await rejectionMessage(renewCanary(live, deps))

    expect(message).toContain("Public key is not exactly one armored block")
    expect(cardQueries).toEqual([canary.fingerprint])
    expect(signed).toEqual([])
    expect(read(root, "public/canary.asc")).toBe(outgoingStatement)
  })

  it("spends no touch when the binary wkd key cannot be derived", async () => {
    const root = fixtureRoot()
    const { deps, signed } = stubDeps(root, {
      binaryFromPublicKey: async () => {
        throw new Error("Public key carries text outside the armored block")
      },
    })

    const message = await rejectionMessage(renewCanary(live, deps))

    expect(message).toContain("carries text outside the armored block")
    expect(signed).toEqual([])
    expect(existsSync(join(root, `public${wkdKeyHref(canary.email)}`))).toBe(
      false
    )
  })

  it("rolls every replaced file back when a write fails midway", async () => {
    const root = fixtureRoot()
    mkdirSync(join(root, "public/llms.txt"), { recursive: true })
    const { deps } = stubDeps(root)

    const message = await rejectionMessage(renewCanary(live, deps))

    expect(message).toContain("Renewal failed while replacing")
    expect(message).toContain("public/llms.txt")
    expect(message).toContain("public/canary.asc")
    expect(message).toContain("Nothing is half-published")
    expect(read(root, "public/canary.asc")).toBe(outgoingStatement)
    expect(read(root, "public/fiona.asc")).toBe(outgoingKey)
    expect(read(root, "lib/canary/canary.ts")).toBe(moduleSource)
    expect(read(root, "README.md")).toBe(readmeSource)
    expect(existsSync(join(root, "public/.well-known/security.txt"))).toBe(
      false
    )
    expect(existsSync(join(root, `public/canary/${canary.signedOn}.asc`))).toBe(
      false
    )
    expect(stagedFiles(root)).toEqual([])
    expect(backupFiles(root)).toEqual([])
  })

  it("renews cleanly on the next run once the failed write is fixed", async () => {
    const root = fixtureRoot()
    mkdirSync(join(root, "public/llms.txt"), { recursive: true })
    const first = stubDeps(root)

    await expect(renewCanary(live, first.deps)).rejects.toThrow(
      /Renewal failed while replacing/
    )

    rmSync(join(root, "public/llms.txt"), { recursive: true })
    const second = stubDeps(root)

    const output = await renewCanary(live, second.deps)

    expect(output).toContain(`Archived public/canary/${canary.signedOn}.asc`)
    expect(read(root, `public/canary/${canary.signedOn}.asc`)).toBe(
      outgoingStatement
    )
    expect(read(root, `public/canary/${canary.signedOn}.key.asc`)).toBe(
      outgoingKey
    )
    expect(read(root, "lib/canary/canary.ts")).toContain(
      `signedOn: "${todayIsoUtc()}"`
    )
    expect(backupFiles(root)).toEqual([])
  })

  it("names the same failure on a re-run instead of refusing the archive", async () => {
    const root = fixtureRoot()
    mkdirSync(join(root, "public/llms.txt"), { recursive: true })
    const first = stubDeps(root)

    await expect(renewCanary(live, first.deps)).rejects.toThrow(
      /Renewal failed while replacing/
    )

    const second = stubDeps(root)
    const message = await rejectionMessage(renewCanary(live, second.deps))

    expect(message).toContain("Renewal failed while replacing")
    expect(message).toContain("public/llms.txt")
    expect(message).not.toContain("refusing to overwrite archived history")
  })

  it("refuses before the card query when a previous renewal left an original behind", async () => {
    const root = fixtureRoot()
    writeFileSync(join(root, "public/canary.asc.prev"), outgoingStatement)
    const { deps, signed, cardQueries } = stubDeps(root)

    const message = await rejectionMessage(renewCanary(live, deps))

    expect(message).toContain("A previous renewal left")
    expect(message).toContain("public/canary.asc.prev")
    expect(cardQueries).toEqual([])
    expect(signed).toEqual([])
    expect(read(root, "public/canary.asc")).toBe(outgoingStatement)
  })
})

describe("canaryModule", () => {
  it("resolves to the canary module in this repository", () => {
    const source = readFileSync("lib/renew/canary-renew.ts", "utf8")
    const declared = /canaryModule: join\(root, "([^"]+)"\)/.exec(source)?.[1]

    expect(declared).toBeDefined()

    const resolved = join(process.cwd(), declared ?? "")

    expect(existsSync(resolved)).toBe(true)
    expect(readFileSync(resolved, "utf8")).toContain("export const canary = {")
  })
})
