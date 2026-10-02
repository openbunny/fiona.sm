import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  publishedDigestsFor,
  pruneUnpublishedRevisions,
} from "@/lib/manifest/archive-prune"

const signed = "a".repeat(64)
const current = "b".repeat(64)
const draft = "c".repeat(64)

describe("publishedDigestsFor", () => {
  it("keeps the signed revision beside the current one, since the signed one was published", () => {
    expect([...publishedDigestsFor(signed, current)].sort()).toEqual(
      [signed, current].sort()
    )
  })

  it("keeps only the current revision when no signed manifest attested one", () => {
    expect([...publishedDigestsFor(undefined, current)]).toEqual([current])
  })

  it("collapses to one entry when the current revision is the signed one", () => {
    expect([...publishedDigestsFor(current, current)]).toEqual([current])
  })
})

describe("pruneUnpublishedRevisions", () => {
  let dir: string
  let slug: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fiona-prune-test-"))
    slug = "a-post"
    await mkdir(join(dir, slug), { recursive: true })
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  const write = async (digest: string): Promise<void> => {
    await writeFile(join(dir, slug, `${digest}.txt`), digest, {
      encoding: "utf8",
    })
  }

  const remaining = async (): Promise<string[]> =>
    (await readdir(join(dir, slug))).sort()

  it("replaces a revision no signed manifest attested, rather than keeping it", async () => {
    await write(draft)
    await write(current)

    const dropped = pruneUnpublishedRevisions(
      dir,
      slug,
      publishedDigestsFor(undefined, current)
    )

    expect(dropped).toEqual([draft])
    expect(await remaining()).toEqual([`${current}.txt`])
  })

  it("keeps a superseded revision that a signed manifest did attest", async () => {
    await write(signed)
    await write(current)
    await write(draft)

    const dropped = pruneUnpublishedRevisions(
      dir,
      slug,
      publishedDigestsFor(signed, current)
    )

    expect(dropped).toEqual([draft])
    expect(await remaining()).toEqual(
      [`${signed}.txt`, `${current}.txt`].sort()
    )
  })

  it("drops nothing when every archived revision was published", async () => {
    await write(signed)
    await write(current)

    expect(
      pruneUnpublishedRevisions(dir, slug, publishedDigestsFor(signed, current))
    ).toEqual([])
    expect(await remaining()).toHaveLength(2)
  })

  it("leaves a slug with no archive directory alone", () => {
    expect(
      pruneUnpublishedRevisions(dir, "never-archived", new Set([current]))
    ).toEqual([])
  })
})
