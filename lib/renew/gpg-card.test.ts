import { beforeEach, describe, expect, it, vi } from "vitest"

import { cardSigningKey, clearsignWithCard } from "@/lib/renew/gpg-card"

const fingerprint = "4820FA938BA2573DE08E4FAD45B4B5460D72A034"

const cardStatus = [
  "Reader:Yubico YubiKey OTP FIDO CCID:",
  "serial:16522006:",
  `fpr:${fingerprint}:74F2020BA7EA89248771C428EAD13FC738EA655C::`,
].join("\n")

const cardBackedSecret = [
  "sec:-:255:22:45B4B5460D72A034:1784563728:::-:::scESC:::D2760001240100000006165220060000::ed25519:::0:",
  `fpr:::::::::${fingerprint}:`,
].join("\n")

const onDiskSecret = [
  "sec:u:255:22:45B4B5460D72A034:1784563728:::u:::scESC:::::ed25519:::0:",
  `fpr:::::::::${fingerprint}:`,
].join("\n")

const gpg = vi.hoisted(() => {
  const calls: string[] = []
  const stdout = new Map<string, string>()
  const failing = new Set<string>()
  return { calls, stdout, failing }
})

vi.mock("execa", () => ({
  execa: async (file: string, args: readonly string[]) => {
    gpg.calls.push(`${file} ${args.join(" ")}`)
    const mode =
      ["--card-status", "--list-secret-keys", "--clearsign"].find((flag) =>
        args.includes(flag)
      ) ?? "other"

    if (gpg.failing.has(mode)) {
      throw new Error("gpg: selecting card failed")
    }

    if (mode === "--clearsign") {
      const output = args[args.indexOf("--output") + 1]
      if (output !== undefined) {
        const { writeFile } = await import("node:fs/promises")
        await writeFile(output, "-----BEGIN PGP SIGNED MESSAGE-----\n", "utf8")
      }
    }

    return { stdout: gpg.stdout.get(mode) ?? "" }
  },
}))

beforeEach(() => {
  gpg.calls.length = 0
  gpg.stdout.clear()
  gpg.failing.clear()
})

describe("cardSigningKey", () => {
  it("reads the signature slot of the inserted card", async () => {
    gpg.stdout.set("--card-status", cardStatus)

    await expect(cardSigningKey()).resolves.toBe(fingerprint)
    expect(gpg.calls).toStrictEqual(["gpg --with-colons --card-status"])
  })

  it("tells the operator to insert the card when gpg finds none", async () => {
    gpg.failing.add("--card-status")

    await expect(cardSigningKey()).rejects.toThrow(/insert the canary YubiKey/i)
  })

  it("tells the operator to insert the card when gpg reports no card", async () => {
    gpg.stdout.set("--card-status", "AID:::")

    await expect(cardSigningKey()).rejects.toThrow(/YubiKey/i)
  })
})

describe("clearsignWithCard", () => {
  it("signs when gpg holds the key as a card stub", async () => {
    gpg.stdout.set("--list-secret-keys", cardBackedSecret)

    const signed = await clearsignWithCard(
      "statement",
      fingerprint,
      "public/canary.asc"
    )

    expect(signed).toContain("BEGIN PGP SIGNED MESSAGE")
    expect(gpg.calls[0]).toBe(
      `gpg --with-colons --list-secret-keys ${fingerprint}`
    )
    expect(gpg.calls.some((call) => call.includes("--clearsign"))).toBe(true)
  })

  it("refuses to sign with a secret key that is not on a card", async () => {
    gpg.stdout.set("--list-secret-keys", onDiskSecret)

    await expect(
      clearsignWithCard("statement", fingerprint, "public/canary.asc")
    ).rejects.toThrow(/not held on an OpenPGP card/)
    expect(gpg.calls.some((call) => call.includes("--clearsign"))).toBe(false)
  })

  it("refuses to sign when gpg has no secret key at all", async () => {
    gpg.stdout.set("--list-secret-keys", "")

    await expect(
      clearsignWithCard("statement", fingerprint, "public/canary.asc")
    ).rejects.toThrow(/no secret key/)
    expect(gpg.calls.some((call) => call.includes("--clearsign"))).toBe(false)
  })
})
