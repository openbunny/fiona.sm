import { execFileSync } from "node:child_process"

import { afterEach, describe, expect, it, vi } from "vitest"

import { siteLastChangedAt } from "@/lib/site/commit-date"

const syntheticCommitDate = "2019-03-04T05:06:07+00:00"

function syntheticCommitSha(): string {
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "commit-date test",
    GIT_AUTHOR_EMAIL: "commit-date@example.invalid",
    GIT_COMMITTER_NAME: "commit-date test",
    GIT_COMMITTER_EMAIL: "commit-date@example.invalid",
    GIT_AUTHOR_DATE: syntheticCommitDate,
    GIT_COMMITTER_DATE: syntheticCommitDate,
  }

  return execFileSync("git", ["commit-tree", "HEAD^{tree}", "-m", "fixture"], {
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "ignore"],
  }).trim()
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("siteLastChangedAt", () => {
  it("returns the checked-out HEAD commit's own committer date", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "")
    vi.stubEnv("COMMIT_SHA", "")

    const raw = execFileSync("git", ["log", "-1", "--format=%cI", "HEAD"], {
      encoding: "utf8",
    }).trim()
    const expected = `${new Date(raw).toISOString().slice(0, 19)}Z`

    expect(siteLastChangedAt()).toBe(expected)
  })

  it("reads the date of whichever commit the hash also resolves to", () => {
    const sha = syntheticCommitSha()
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", sha)
    vi.stubEnv("COMMIT_SHA", "")

    expect(siteLastChangedAt()).toBe("2019-03-04T05:06:07Z")
  })

  it("fails loudly, naming the commit, for a sha git has never seen", () => {
    const unknownSha = "f".repeat(40)
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", unknownSha)
    vi.stubEnv("COMMIT_SHA", "")

    expect(() => siteLastChangedAt()).toThrow(
      `No committer date is available for commit ${unknownSha}`
    )
  })
})

describe("siteLastChangedAt when no commit is resolvable at all", () => {
  afterEach(() => {
    vi.doUnmock("node:child_process")
    vi.resetModules()
  })

  it("fails loudly rather than rendering a placeholder", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "")
    vi.stubEnv("COMMIT_SHA", "")
    vi.resetModules()
    vi.doMock("node:child_process", () => ({
      execFileSync: () => {
        throw new Error("not a git repository")
      },
    }))

    const isolated = await import("@/lib/site/commit-date")

    expect(() => isolated.siteLastChangedAt()).toThrow(
      /No commit hash is available at build time/
    )
  })

  it("fails loudly on committer-date output git itself could not have produced", async () => {
    const knownSha = "a".repeat(40)
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", knownSha)
    vi.stubEnv("COMMIT_SHA", "")
    vi.resetModules()
    vi.doMock("node:child_process", () => ({
      execFileSync: () => "%cI",
    }))

    const isolated = await import("@/lib/site/commit-date")

    expect(() => isolated.siteLastChangedAt()).toThrow(
      `No committer date is available for commit ${knownSha}`
    )
  })
})
