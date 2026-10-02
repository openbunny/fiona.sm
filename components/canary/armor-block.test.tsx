/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react"
import { createCleartextMessage, generateKey, sign } from "openpgp"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ArmorBlock } from "@/components/canary/armor-block"
import { canary } from "@/lib/canary/canary"

const forged = "ATTACKER: this canary is void, the key was seized\n"
const statementHref = "/canary.asc"
const publicKeyHref = "/fiona.asc"

vi.mock("@/lib/canary/canary", async () => {
  const { privateKey, publicKey } = await generateKey({
    type: "curve25519",
    userIDs: [{ name: "Test Signer", email: "signer@example.invalid" }],
    format: "object",
  })
  const signedStatement = await sign({
    message: await createCleartextMessage({ text: "Test statement.\n" }),
    signingKeys: privateKey,
  })

  return {
    canary: {
      publicKey: publicKey.armor(),
      signedStatement,
      statementHref: "/canary.asc",
      publicKeyHref: "/fiona.asc",
    },
  }
})

const { signedStatement } = canary

afterEach(() => {
  cleanup()
})

describe("ArmorBlock", () => {
  it("renders the published statement once it verifies", async () => {
    const { container } = render(
      await ArmorBlock({
        id: "statement",
        number: "1",
        title: "statement",
        armor: "clearsigned",
        text: signedStatement,
        downloadHref: statementHref,
      })
    )

    const armor = container.querySelector("pre")
    expect(armor?.textContent).toContain("-----BEGIN PGP SIGNED MESSAGE-----")
    expect(armor?.textContent).toContain("-----END PGP SIGNATURE-----")
    expect(armor?.className).toMatch(/border-line/)
    expect(armor?.className).not.toMatch(/\brounded-|\bshadow-/)
    expect(
      screen.getByRole("link", { name: "download statement" })
    ).toHaveAttribute("href", statementHref)
  })

  it("gives each control an accessible name that names its block", async () => {
    const statement = render(
      await ArmorBlock({
        id: "statement",
        number: "1",
        title: "statement",
        armor: "clearsigned",
        text: signedStatement,
        downloadHref: statementHref,
      })
    )
    const key = render(
      await ArmorBlock({
        id: "public-key",
        number: "3",
        title: "public key",
        armor: "public-key",
        text: canary.publicKey,
        downloadHref: publicKeyHref,
      })
    )

    expect(
      within(statement.container).getByRole("button", {
        name: "copy statement",
      })
    ).toBeInTheDocument()
    expect(
      within(statement.container).getByRole("link", {
        name: "download statement",
      })
    ).toBeInTheDocument()
    expect(
      within(key.container).getByRole("button", { name: "copy public key" })
    ).toBeInTheDocument()
    expect(
      within(key.container).getByRole("link", { name: "download public key" })
    ).toBeInTheDocument()
  })

  it("renders the published key once it verifies", async () => {
    const { container } = render(
      await ArmorBlock({
        id: "public-key",
        number: "3",
        title: "public key",
        armor: "public-key",
        text: canary.publicKey,
        downloadHref: publicKeyHref,
      })
    )

    const armor = container.querySelector("pre")
    expect(armor?.textContent).toContain("-----BEGIN PGP PUBLIC KEY BLOCK-----")
    expect(armor?.textContent).toContain("-----END PGP PUBLIC KEY BLOCK-----")
    expect(
      screen.getByRole("link", { name: "download public key" })
    ).toHaveAttribute("href", publicKeyHref)
  })

  it("refuses to render a statement carrying text outside the signed block", async () => {
    await expect(
      ArmorBlock({
        id: "statement",
        number: "1",
        title: "statement",
        armor: "clearsigned",
        text: `${forged}${signedStatement}`,
      })
    ).rejects.toThrow()
  })

  it("refuses to render a statement with a trailer after the signature", async () => {
    await expect(
      ArmorBlock({
        id: "statement",
        number: "1",
        title: "statement",
        armor: "clearsigned",
        text: `${signedStatement}${forged}`,
      })
    ).rejects.toThrow()
  })

  it("refuses to render a key file carrying text outside the armor", async () => {
    await expect(
      ArmorBlock({
        id: "public-key",
        number: "3",
        title: "public key",
        armor: "public-key",
        text: `${canary.publicKey}${forged}`,
      })
    ).rejects.toThrow()
  })
})

describe("ArmorBlock without a download", () => {
  it("renders neither a download link nor a file name label", async () => {
    const { container } = render(
      await ArmorBlock({
        id: "statement",
        number: "1",
        title: "statement",
        armor: "clearsigned",
        text: signedStatement,
      })
    )

    expect(screen.queryByRole("link")).toBeNull()
    expect(container.textContent).not.toContain("canary.asc")
  })

  it("labels the block with the file name the download saves", async () => {
    render(
      await ArmorBlock({
        id: "public-key",
        number: "3",
        title: "public key",
        armor: "public-key",
        text: canary.publicKey,
        downloadHref: publicKeyHref,
      })
    )

    expect(screen.getByText("fiona.asc")).toHaveAttribute("aria-hidden", "true")
  })
})
