import { describe, expect, it } from "vitest"

import {
  verifyCommands,
  verifyNote,
  verifySteps,
} from "@/lib/canary/verify-commands"

const fingerprint = "AE1B22CE50A9BF418806DB1D72068EC01B6A2CF8"

describe("verifyCommands", () => {
  it("emits import and verify commands for an https origin", () => {
    expect(verifyCommands("https://fiona.sm", fingerprint)).toEqual([
      "curl -fsSO https://fiona.sm/fiona.asc",
      "curl -fsSO https://fiona.sm/canary.asc",
      "gpg --import fiona.asc",
      `gpg --fingerprint ${fingerprint}`,
      "gpg --verify canary.asc",
    ])
  })

  it("emits one command per copy field", () => {
    expect(verifyCommands("https://fiona.sm", fingerprint)).toHaveLength(5)
  })

  it("rejects a fingerprint that is not 40 hex characters", () => {
    expect(() => verifyCommands("https://fiona.sm", "nope")).toThrow(
      /Invalid fingerprint/
    )
    expect(() =>
      verifyCommands("https://fiona.sm", `${fingerprint};rm -rf /`)
    ).toThrow(/Invalid fingerprint/)
  })

  it("rejects a non-https origin", () => {
    expect(() => verifyCommands("http://fiona.sm", fingerprint)).toThrow(
      /Invalid origin/
    )
  })

  it("rejects an origin with a path", () => {
    expect(() =>
      verifyCommands("https://fiona.sm/canary", fingerprint)
    ).toThrow(/Invalid origin/)
  })
})

describe("verifyNote", () => {
  it("says what the commands do not prove", () => {
    expect(verifyNote).toMatch(/only prove/)
    expect(verifyNote).toMatch(/signed by the key this page publishes/)
  })

  it("names an out-of-band source for the fingerprint", () => {
    expect(verifyNote).toMatch(/keys\.openpgp\.org/)
  })

  it("points at the keyoxide profile that resolves off this origin", () => {
    expect(verifyNote).toMatch(/keyoxide\.org\/hkp\/mail@fiona\.sm/)
  })

  it("never offers a same-origin source as an independent one", () => {
    expect(verifyNote).not.toMatch(/keyoxide\.org\/mail@fiona\.sm/)
    expect(verifyNote).toMatch(/web key directory at this domain is this site/)
  })

  it("warns that the not-certified message is expected", () => {
    expect(verifyNote).toMatch(/not certified with a trusted signature/)
  })
})

describe("verifySteps", () => {
  it("pairs every verify command with the sentence that explains it", () => {
    const steps = verifySteps("https://fiona.sm", fingerprint)

    expect(steps.map((step) => step.command)).toEqual(
      verifyCommands("https://fiona.sm", fingerprint)
    )
    expect(steps.at(-1)?.comment).toContain("Good signature")
    expect(steps.every((step) => step.comment.endsWith("."))).toBe(true)
  })
})
