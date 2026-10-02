import { describe, expect, it } from "vitest"

import {
  cardSerialForKey,
  signingFingerprintFromCard,
} from "@/lib/renew/gpg-colon"

describe("signingFingerprintFromCard", () => {
  it("reads the signature slot, not the encryption slot", () => {
    const status = [
      "Reader:Yubico YubiKey:",
      "fpr:AE1B22CE50A9BF418806DB1D72068EC01B6A2CF8:BB1B22CE50A9BF418806DB1D72068EC01B6A2CF8:CC1B22CE50A9BF418806DB1D72068EC01B6A2CF8:",
    ].join("\n")

    expect(signingFingerprintFromCard(status)).toBe(
      "AE1B22CE50A9BF418806DB1D72068EC01B6A2CF8"
    )
  })

  it("refuses a card whose signature slot is empty", () => {
    const status =
      "fpr::BB1B22CE50A9BF418806DB1D72068EC01B6A2CF8:CC1B22CE50A9BF418806DB1D72068EC01B6A2CF8:"

    expect(() => signingFingerprintFromCard(status)).toThrow(/no signature key/)
  })

  it("keeps reading when an earlier fpr record has no signature slot", () => {
    const status = [
      "Reader:Yubico YubiKey:",
      "fpr:::::::::AE1B22CE50A9BF418806DB1D72068EC01B6A2CF8:",
      "fpr:BB1B22CE50A9BF418806DB1D72068EC01B6A2CF8:CC1B22CE50A9BF418806DB1D72068EC01B6A2CF8::",
    ].join("\n")

    expect(signingFingerprintFromCard(status)).toBe(
      "BB1B22CE50A9BF418806DB1D72068EC01B6A2CF8"
    )
  })

  it("refuses a card whose encryption slot is populated but signature slot is not", () => {
    const status = [
      "Reader:Yubico YubiKey:",
      "fpr:::::::::AE1B22CE50A9BF418806DB1D72068EC01B6A2CF8:",
      "fpr::CC1B22CE50A9BF418806DB1D72068EC01B6A2CF8:::",
    ].join("\n")

    expect(() => signingFingerprintFromCard(status)).toThrow(/no signature key/)
  })

  it("rejects a listing with no card status", () => {
    expect(() => signingFingerprintFromCard("sec:u:255:22:abc")).toThrow(
      /card status/
    )
  })
})

describe("cardSerialForKey", () => {
  const fingerprint = "4820FA938BA2573DE08E4FAD45B4B5460D72A034"

  it("reads the token serial of a card-backed primary key", () => {
    const listing = [
      "sec:-:255:22:45B4B5460D72A034:1784563728:::-:::scESC:::D2760001240100000006165220060000::ed25519:::0:",
      `fpr:::::::::${fingerprint}:`,
      "grp:::::::::B954F6ED8C4C23FC077377DA8F901ED5ACB018B8:",
    ].join("\n")

    expect(cardSerialForKey(listing, fingerprint)).toBe(
      "D2760001240100000006165220060000"
    )
  })

  it("reads the token serial of a card-backed subkey", () => {
    const subkey = "F39854405552A54D3503D0F65E86E684E851380C"
    const listing = [
      "sec:u:255:22:06C61AE6C8453203:1785505299:::u:::cESC:::#::ed25519:::0:",
      "fpr:::::::::2FB4F16194665BA38A93AC5706C61AE6C8453203:",
      "ssb:u:255:22:5E86E684E851380C:1785505318::::::s:::D2760001240100000006337148820000::ed25519::",
      `fpr:::::::::${subkey}:`,
    ].join("\n")

    expect(cardSerialForKey(listing, subkey)).toBe(
      "D2760001240100000006337148820000"
    )
  })

  it("refuses a secret key that gpg holds on disk", () => {
    const listing = [
      "sec:u:255:22:45B4B5460D72A034:1784563728:::u:::scESC:::::ed25519:::0:",
      `fpr:::::::::${fingerprint}:`,
    ].join("\n")

    expect(() => cardSerialForKey(listing, fingerprint)).toThrow(
      /not held on an OpenPGP card/
    )
  })

  it("refuses a primary key whose secret is offline", () => {
    const listing = [
      "sec:u:255:22:45B4B5460D72A034:1784563728:::u:::scESC:::#::ed25519:::0:",
      `fpr:::::::::${fingerprint}:`,
    ].join("\n")

    expect(() => cardSerialForKey(listing, fingerprint)).toThrow(
      /not held on an OpenPGP card/
    )
  })

  it("refuses a listing that holds a different key", () => {
    const listing = [
      "sec:-:255:22:AAAAAAAAAAAAAAAA:1784563728:::-:::scESC:::D2760001240100000006165220060000::ed25519:::0:",
      "fpr:::::::::AE1B22CE50A9BF418806DB1D72068EC01B6A2CF8:",
    ].join("\n")

    expect(() => cardSerialForKey(listing, fingerprint)).toThrow(
      /no secret key/
    )
  })

  it("refuses an empty listing", () => {
    expect(() => cardSerialForKey("", fingerprint)).toThrow(/no secret key/)
  })
})
