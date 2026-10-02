import { describe, expect, it } from "vitest"

import type { ManifestGateState } from "@/lib/manifest/manifest-gate"
import {
  manifestExitCode,
  manifestProcessExitCode,
  manifestStateExitCode,
  manifestStateMessages,
} from "@/lib/manifest/manifest-report"

const matching: ManifestGateState = {
  kind: "verified",
  drift: [{ slug: "alpha", state: "matching", articleText: "ok" }],
  orphanArticleTextFiles: [],
  corruptArchiveFiles: [],
}

describe("manifestStateMessages", () => {
  it("names public/posts.asc and the generate command when the manifest is missing", () => {
    const messages = manifestStateMessages({ kind: "manifestMissing" })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain("public/posts.asc is missing")
    expect(messages[0]).toContain("bun run manifest generate")
  })

  it("names the sign command's location when the manifest is unsigned", () => {
    const messages = manifestStateMessages({ kind: "manifestUnsigned" })
    expect(messages[0]).toContain("not a clearsigned PGP message")
  })

  it("includes the underlying detail when the signature is invalid", () => {
    const messages = manifestStateMessages({
      kind: "signatureInvalid",
      detail: "Could not find signing key",
    })
    expect(messages[0]).toContain("Could not find signing key")
  })

  it("returns no messages when every post matches", () => {
    expect(manifestStateMessages(matching)).toEqual([])
  })

  it("names the slug and both hashes when a post differs", () => {
    const messages = manifestStateMessages({
      kind: "verified",
      drift: [
        {
          slug: "alpha",
          state: "differing",
          manifestHash: "a".repeat(64),
          builtHash: "b".repeat(64),
          articleText: "stale",
        },
      ],
      orphanArticleTextFiles: [],
      corruptArchiveFiles: [],
    })
    expect(messages[0]).toContain('"alpha"')
    expect(messages[0]).toContain("a".repeat(64))
    expect(messages[0]).toContain("b".repeat(64))
  })

  it("names the slug when a published post is missing from the manifest", () => {
    const messages = manifestStateMessages({
      kind: "verified",
      drift: [{ slug: "alpha", state: "missingFromManifest" }],
      orphanArticleTextFiles: [],
      corruptArchiveFiles: [],
    })
    expect(messages[0]).toContain('"alpha"')
    expect(messages[0]).toContain("no entry in the manifest")
  })

  it("names the slug when a manifest entry is no longer published", () => {
    const messages = manifestStateMessages({
      kind: "verified",
      drift: [
        {
          slug: "alpha",
          state: "orphanInManifest",
          manifestHash: "a".repeat(64),
        },
      ],
      orphanArticleTextFiles: [],
      corruptArchiveFiles: [],
    })
    expect(messages[0]).toContain('"alpha"')
    expect(messages[0]).toContain("no longer publishes")
  })

  it("names the file and the generate command when a post's article text is missing", () => {
    const messages = manifestStateMessages({
      kind: "verified",
      drift: [
        {
          slug: "alpha",
          state: "matching",
          manifestHash: "a".repeat(64),
          builtHash: "a".repeat(64),
          articleText: "missing",
        },
      ],
      orphanArticleTextFiles: [],
      corruptArchiveFiles: [],
    })
    expect(messages[0]).toContain("public/posts/alpha.txt")
    expect(messages[0]).toContain("bun run manifest generate")
  })

  it("names the file when a post's committed article text is stale", () => {
    const messages = manifestStateMessages({
      kind: "verified",
      drift: [
        {
          slug: "alpha",
          state: "matching",
          manifestHash: "a".repeat(64),
          builtHash: "a".repeat(64),
          articleText: "stale",
        },
      ],
      orphanArticleTextFiles: [],
      corruptArchiveFiles: [],
    })
    expect(messages[0]).toContain("public/posts/alpha.txt")
    expect(messages[0]).toContain("does not match")
  })

  it("names an orphaned article text file for a post that is no longer published", () => {
    const messages = manifestStateMessages({
      kind: "verified",
      drift: [],
      orphanArticleTextFiles: ["old-post"],
      corruptArchiveFiles: [],
    })
    expect(messages[0]).toContain("public/posts/old-post.txt")
    expect(messages[0]).toContain("not published")
  })

  it("names lib/blog/posts.ts when the published post set is empty", () => {
    const messages = manifestStateMessages({ kind: "noPublishedPosts" })
    expect(messages[0]).toContain("lib/blog/posts.ts")
    expect(messages[0]).toContain("nothing for the manifest to attest")
  })
})

describe("manifestStateExitCode", () => {
  it("is distinct and non-zero for each non-drift state", () => {
    expect(manifestStateExitCode({ kind: "manifestMissing" })).toBe(
      manifestExitCode.manifestMissing
    )
    expect(manifestStateExitCode({ kind: "manifestUnsigned" })).toBe(
      manifestExitCode.manifestUnsigned
    )
    expect(
      manifestStateExitCode({ kind: "signatureInvalid", detail: "x" })
    ).toBe(manifestExitCode.signatureInvalid)
    expect(manifestStateExitCode({ kind: "noPublishedPosts" })).toBe(
      manifestExitCode.noPublishedPosts
    )
  })

  it("is zero when every post matches", () => {
    expect(manifestStateExitCode(matching)).toBe(manifestExitCode.clean)
  })

  it("combines distinct bits for each drift category present at once", () => {
    const state: ManifestGateState = {
      kind: "verified",
      drift: [
        {
          slug: "a",
          state: "differing",
          manifestHash: "x".repeat(64),
          builtHash: "y".repeat(64),
          articleText: "stale",
        },
        { slug: "b", state: "missingFromManifest" },
        { slug: "c", state: "orphanInManifest", manifestHash: "z".repeat(64) },
      ],
      orphanArticleTextFiles: ["d"],
      corruptArchiveFiles: [],
    }

    expect(manifestStateExitCode(state)).toBe(
      manifestExitCode.differing |
        manifestExitCode.missingFromManifest |
        manifestExitCode.orphanInManifest |
        manifestExitCode.articleTextStale |
        manifestExitCode.articleTextOrphan
    )
  })

  it("flags a missing article text file distinctly from a stale one", () => {
    const state: ManifestGateState = {
      kind: "verified",
      drift: [
        {
          slug: "a",
          state: "matching",
          manifestHash: "x".repeat(64),
          builtHash: "x".repeat(64),
          articleText: "missing",
        },
      ],
      orphanArticleTextFiles: [],
      corruptArchiveFiles: [],
    }

    expect(manifestStateExitCode(state)).toBe(
      manifestExitCode.articleTextMissing
    )
  })

  it("every named exit code is a distinct value", () => {
    const values = Object.values(manifestExitCode)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe("manifestProcessExitCode", () => {
  it("is zero only for the zero code", () => {
    expect(manifestProcessExitCode(0)).toBe(0)
  })

  it("passes a code that already fits in one byte through unchanged", () => {
    expect(manifestProcessExitCode(manifestExitCode.differing)).toBe(1)
    expect(manifestProcessExitCode(manifestExitCode.manifestMissing)).toBe(32)
    expect(manifestProcessExitCode(manifestExitCode.noPublishedPosts)).toBe(128)
  })

  it("never returns zero for a nonzero code, even one that is a multiple of 256", () => {
    expect(
      manifestProcessExitCode(manifestExitCode.articleTextMissing)
    ).not.toBe(0)
    expect(manifestProcessExitCode(manifestExitCode.articleTextStale)).not.toBe(
      0
    )
    expect(
      manifestProcessExitCode(manifestExitCode.articleTextOrphan)
    ).not.toBe(0)
    expect(
      manifestProcessExitCode(
        manifestExitCode.articleTextMissing | manifestExitCode.articleTextStale
      )
    ).not.toBe(0)
  })

  it("keeps the low byte when a code combines a sub-256 bit with a 256-and-above bit", () => {
    expect(
      manifestProcessExitCode(
        manifestExitCode.differing | manifestExitCode.articleTextMissing
      )
    ).toBe(1)
  })
})
