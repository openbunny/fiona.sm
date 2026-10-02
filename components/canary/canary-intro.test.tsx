/** @vitest-environment jsdom */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { CanaryIntro } from "@/components/canary/canary-intro"
import { verifyClearsigned } from "@/lib/openpgp-armor"

afterEach(() => {
  cleanup()
})

describe("CanaryIntro", () => {
  it("separates tampering from a missed renewal", () => {
    render(<CanaryIntro />)
    const text = screen.getByText(/cryptographic canary/).textContent ?? ""
    expect(text).toMatch(/tampered with/)
    expect(text).toMatch(/missed renewal/)
    expect(text).toMatch(/not that the key is known to be compromised/)
  })

  it("does not tell a reader to assume compromise on a late renewal", () => {
    render(<CanaryIntro />)
    const text = screen.getByText(/cryptographic canary/).textContent ?? ""
    expect(text).not.toMatch(/treat the key as compromised/i)
  })
})

describe("the clause count the reader is given", () => {
  const spelled = new Map([
    [1, "one"],
    [2, "two"],
    [3, "three"],
    [4, "four"],
    [5, "five"],
    [6, "six"],
    [7, "seven"],
  ])

  it("states a number, in words, that the signed statement carries", async () => {
    const root = process.cwd()
    const cleartext = await verifyClearsigned(
      readFileSync(join(root, "public/canary.asc"), "utf8"),
      readFileSync(join(root, "public/fiona.asc"), "utf8")
    )
    const signed = cleartext
      .split("\n")
      .filter((line) => /^\d+\. /.test(line)).length

    render(<CanaryIntro />)
    const text = screen.getByText(/numbered clauses/).textContent ?? ""

    expect(spelled.get(signed)).toBeDefined()
    expect(text).toContain(`${spelled.get(signed) ?? ""} numbered clauses`)
  })

  it("tells the reader a missing clause is the signal, not a slip", () => {
    render(<CanaryIntro />)
    const text = screen.getByText(/numbered clauses/).textContent ?? ""

    expect(text).toMatch(/missing/)
    expect(text).toMatch(/itself the signal/)
    expect(text).toMatch(/signature that verifies/)
    expect(text).toMatch(/renewal that is on time/)
  })
})
