import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  manifestEntryForSlug,
  readManifestLookup,
} from "@/lib/manifest/manifest-lookup"

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "manifest-lookup-"))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe("readManifestLookup", () => {
  it("reports absent when no file exists at the path", () => {
    expect(readManifestLookup(join(dir, "posts.asc"))).toEqual({
      kind: "absent",
    })
  })

  it("reports present and unsigned for a plain-text manifest", async () => {
    const path = join(dir, "posts.asc")
    const hash = "a".repeat(64)
    await writeFile(
      path,
      [
        "post content manifest for fiona <mail@fiona.sm>",
        "key fingerprint: 4820 fa93 8ba2 573d e08e 4fad 45b4 b546 0d72 a034",
        "",
        "sha256                                                            slug",
        `${hash}  tickerbox-cli`,
        "",
      ].join("\n"),
      "utf8"
    )

    const lookup = readManifestLookup(path)
    expect(lookup).toEqual({
      kind: "present",
      signed: false,
      entries: [{ slug: "tickerbox-cli", sha256: hash }],
    })
  })

  it("reports present and signed when the file carries a clearsign wrapper", async () => {
    const path = join(dir, "posts.asc")
    const hash = "b".repeat(64)
    await writeFile(
      path,
      [
        "-----BEGIN PGP SIGNED MESSAGE-----",
        "Hash: SHA256",
        "",
        "post content manifest for fiona <mail@fiona.sm>",
        "",
        `${hash}  tickerbox-cli`,
        "-----BEGIN PGP SIGNATURE-----",
        "",
        "deadbeef",
        "-----END PGP SIGNATURE-----",
        "",
      ].join("\n"),
      "utf8"
    )

    const lookup = readManifestLookup(path)
    expect(lookup.kind).toBe("present")
    expect(lookup).toMatchObject({ signed: true })
    expect(manifestEntryForSlug("tickerbox-cli", lookup)).toEqual({
      slug: "tickerbox-cli",
      sha256: hash,
    })
  })
})

describe("manifestEntryForSlug", () => {
  it("returns undefined for a slug the manifest does not list", () => {
    const lookup = {
      kind: "present" as const,
      signed: false,
      entries: [{ slug: "other-post", sha256: "c".repeat(64) }],
    }

    expect(manifestEntryForSlug("tickerbox-cli", lookup)).toBeUndefined()
  })

  it("returns undefined when the manifest is absent", () => {
    expect(
      manifestEntryForSlug("tickerbox-cli", { kind: "absent" })
    ).toBeUndefined()
  })
})
