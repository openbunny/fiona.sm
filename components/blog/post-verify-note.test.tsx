/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PostVerifyNote } from "@/components/blog/post-verify-note"

const { readManifestLookupMock } = vi.hoisted(() => ({
  readManifestLookupMock: vi.fn(),
}))

type Entry = { readonly slug: string; readonly sha256: string }
type Lookup =
  | { readonly kind: "absent" }
  | { readonly kind: "present"; readonly entries: readonly Entry[] }

vi.mock("@/lib/manifest/manifest-lookup", () => ({
  readManifestLookup: readManifestLookupMock,
  manifestEntryForSlug: (slug: string, lookup: Lookup): Entry | undefined =>
    lookup.kind === "present"
      ? lookup.entries.find((entry) => entry.slug === slug)
      : undefined,
}))

afterEach(() => {
  cleanup()
  readManifestLookupMock.mockReset()
})

describe("PostVerifyNote", () => {
  it("shows the manifest's own sha-256 for a slug it lists", () => {
    const hash = "a".repeat(64)
    readManifestLookupMock.mockReturnValue({
      kind: "present",
      signed: false,
      entries: [{ slug: "tickerbox-cli", sha256: hash }],
    })

    render(<PostVerifyNote slug="tickerbox-cli" />)

    expect(screen.getByText(hash)).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "/blog/verify-posts" })
    ).toHaveAttribute("href", "/blog/verify-posts")
    expect(screen.getByRole("link", { name: "/posts.asc" })).toHaveAttribute(
      "href",
      "/posts.asc"
    )
  })

  it("shows no hash, and nothing that looks like one, when the slug has no entry", () => {
    readManifestLookupMock.mockReturnValue({
      kind: "present",
      signed: false,
      entries: [],
    })

    render(<PostVerifyNote slug="tickerbox-cli" />)

    expect(screen.queryByText(/^[0-9a-f]{64}$/)).toBeNull()
    expect(screen.getByText(/not in the manifest/)).toBeTruthy()
  })

  it("shows no hash when the manifest itself is absent", () => {
    readManifestLookupMock.mockReturnValue({ kind: "absent" })

    render(<PostVerifyNote slug="tickerbox-cli" />)

    expect(screen.queryByText(/^[0-9a-f]{64}$/)).toBeNull()
    expect(
      screen.getByRole("link", { name: "/blog/verify-posts" })
    ).toBeTruthy()
  })
})
