import { execFileSync } from "node:child_process"

import { deployedCommitSha } from "@/lib/site/commit-hash"

function committerDateIso(sha: string): string | undefined {
  try {
    const output = execFileSync("git", ["log", "-1", "--format=%cI", sha], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()

    const date = new Date(output)
    return Number.isNaN(date.getTime())
      ? undefined
      : `${date.toISOString().slice(0, 19)}Z`
  } catch {
    return undefined
  }
}

export function siteLastChangedAt(): string {
  const sha = deployedCommitSha()
  const date = committerDateIso(sha)

  if (date === undefined) {
    throw new Error(
      `No committer date is available for commit ${sha}. A git checkout containing that commit is needed to read it.`
    )
  }

  return date
}
