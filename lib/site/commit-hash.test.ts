import { execFileSync } from "node:child_process"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { commitHash } from "@/lib/site/commit-hash"

beforeEach(() => {
  vi.stubEnv("WORKERS_CI_COMMIT_SHA", "")
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("commitHash", () => {
  it("prefers the Workers Builds commit over fallback sources", () => {
    vi.stubEnv(
      "WORKERS_CI_COMMIT_SHA",
      "abcdef0123456789abcdef0123456789abcdef01"
    )
    vi.stubEnv(
      "VERCEL_GIT_COMMIT_SHA",
      "1234567890abcdef1234567890abcdef12345678"
    )
    expect(commitHash()).toBe("abcdef0")
  })

  it("prefers VERCEL_GIT_COMMIT_SHA, trimmed to the first seven characters", () => {
    vi.stubEnv(
      "VERCEL_GIT_COMMIT_SHA",
      "abcdef0123456789abcdef0123456789abcdef01"
    )
    vi.stubEnv("COMMIT_SHA", "")

    expect(commitHash()).toBe("abcdef0")
  })

  it("falls back to COMMIT_SHA when VERCEL_GIT_COMMIT_SHA is unset", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "")
    vi.stubEnv("COMMIT_SHA", "1234567890abcdef1234567890abcdef12345678")

    expect(commitHash()).toBe("1234567")
  })

  it("ignores a value that is not a 40-character hex sha and falls through", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "not-a-sha")
    vi.stubEnv("COMMIT_SHA", "")

    expect(commitHash()).toMatch(/^[0-9a-f]{7}$/i)
  })

  it("falls back to the checked-out commit when no env var is set", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "")
    vi.stubEnv("COMMIT_SHA", "")

    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim()

    expect(commitHash()).toBe(head.slice(0, 7))
  })
})

describe("commitHash when no source is available", () => {
  afterEach(() => {
    vi.doUnmock("node:child_process")
    vi.resetModules()
  })

  it("fails loudly, naming the fix, rather than rendering a placeholder", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "")
    vi.stubEnv("COMMIT_SHA", "")
    vi.resetModules()
    vi.doMock("node:child_process", () => ({
      execFileSync: () => {
        throw new Error("not a git repository")
      },
    }))

    const isolated = await import("@/lib/site/commit-hash")

    expect(() => isolated.commitHash()).toThrow(
      /No commit hash is available at build time/
    )
  })
})
