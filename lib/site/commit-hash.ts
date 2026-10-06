import { execFileSync } from "node:child_process"

const shaPattern = /^[0-9a-f]{40}$/i

function asSha(candidate: string | undefined): string | undefined {
  if (candidate === undefined) {
    return undefined
  }

  const trimmed = candidate.trim()
  return shaPattern.test(trimmed) ? trimmed : undefined
}

function shaFromGit(): string | undefined {
  try {
    return asSha(
      execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
    )
  } catch {
    return undefined
  }
}

const missingShaMessage =
  "No commit hash is available at build time. Set COMMIT_SHA or build from a git checkout. " +
  "A Docker build needs `--build-arg COMMIT_SHA=$(git rev-parse HEAD)` and `--build-arg COMMIT_DATE=$(git log -1 --format=%cI HEAD)`. " +
  "A local or CI build needs a git checkout `git rev-parse HEAD` can read."

export function deployedCommitSha(): string {
  const sha =
    asSha(process.env["WORKERS_CI_COMMIT_SHA"]) ??
    asSha(process.env["VERCEL_GIT_COMMIT_SHA"]) ??
    asSha(process.env["COMMIT_SHA"]) ??
    shaFromGit()

  if (sha === undefined) {
    throw new Error(missingShaMessage)
  }

  return sha
}

export function commitHash(): string {
  return deployedCommitSha().slice(0, 7)
}
