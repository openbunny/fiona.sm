import { describe, expect, it } from "vitest"

import {
  articleTextVerifySteps,
  manifestVerifyCommands,
  manifestVerifyNote,
  manifestVerifySteps,
} from "@/lib/manifest/verify-commands"

const fingerprint = "AE1B22CE50A9BF418806DB1D72068EC01B6A2CF8"

describe("manifestVerifyCommands", () => {
  it("emits import and verify commands for an https origin", () => {
    expect(manifestVerifyCommands("https://fiona.sm", fingerprint)).toEqual([
      "curl -fsSO https://fiona.sm/fiona.asc",
      "curl -fsSO https://fiona.sm/posts.asc",
      "gpg --import fiona.asc",
      `gpg --fingerprint ${fingerprint}`,
      "gpg --verify posts.asc",
    ])
  })

  it("rejects a fingerprint that is not 40 hex characters", () => {
    expect(() => manifestVerifyCommands("https://fiona.sm", "nope")).toThrow(
      /Invalid fingerprint/
    )
  })

  it("rejects a non-https origin", () => {
    expect(() =>
      manifestVerifyCommands("http://fiona.sm", fingerprint)
    ).toThrow(/Invalid origin/)
  })
})

describe("manifestVerifyNote", () => {
  it("names the manifest, not the canary statement, as what the commands prove", () => {
    expect(manifestVerifyNote).toMatch(/only prove the manifest was signed/)
  })

  it("names an out-of-band source for the fingerprint", () => {
    expect(manifestVerifyNote).toMatch(/keys\.openpgp\.org/)
    expect(manifestVerifyNote).toMatch(/keyoxide\.org\/hkp\/mail@fiona\.sm/)
  })
})

describe("manifestVerifySteps", () => {
  it("pairs every verify command with the sentence that explains it", () => {
    const steps = manifestVerifySteps("https://fiona.sm", fingerprint)

    expect(steps.map((step) => step.command)).toEqual(
      manifestVerifyCommands("https://fiona.sm", fingerprint)
    )
    expect(steps.at(-1)?.comment).toContain("Good signature")
    expect(steps.every((step) => step.comment.endsWith("."))).toBe(true)
  })
})

describe("articleTextVerifySteps", () => {
  it("fetches the slug's published article text and hashes it", () => {
    const steps = articleTextVerifySteps(
      "https://fiona.sm",
      fingerprint,
      "tickerbox-cli"
    )

    expect(steps).toHaveLength(1)
    expect(steps[0]?.command).toBe(
      "curl -fsS https://fiona.sm/posts/tickerbox-cli.txt | sha256sum"
    )
    expect(steps[0]?.comment).toContain("tickerbox-cli")
    expect(steps[0]?.comment).toContain("/posts.asc")
  })

  it("rejects a fingerprint that is not 40 hex characters", () => {
    expect(() =>
      articleTextVerifySteps("https://fiona.sm", "nope", "tickerbox-cli")
    ).toThrow(/Invalid fingerprint/)
  })

  it("rejects a non-https origin", () => {
    expect(() =>
      articleTextVerifySteps("http://fiona.sm", fingerprint, "tickerbox-cli")
    ).toThrow(/Invalid origin/)
  })

  it("rejects a slug that is not lowercase kebab-case", () => {
    expect(() =>
      articleTextVerifySteps("https://fiona.sm", fingerprint, "Not Valid")
    ).toThrow(/Invalid slug/)
  })
})
