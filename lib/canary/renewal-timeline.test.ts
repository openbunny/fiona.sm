import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import { listCanaryArchives } from "@/lib/canary/canary-history"
import { archivedWindows, timelineRows } from "@/lib/canary/renewal-timeline"

describe("timelineRows", () => {
  it("orders statements oldest first and measures each gap to its successor", () => {
    expect(
      timelineRows([
        { signedOn: "2026-09-03", renewBy: "2026-12-02" },
        { signedOn: "2026-08-25", renewBy: "2026-11-23" },
      ])
    ).toEqual([
      {
        signedOn: "2026-08-25",
        renewBy: "2026-11-23",
        windowDays: 90,
        replacedAfterDays: 9,
      },
      {
        signedOn: "2026-09-03",
        renewBy: "2026-12-02",
        windowDays: 90,
        replacedAfterDays: undefined,
      },
    ])
  })
})

describe("archivedWindows", () => {
  it("reads each archived statement's renew-by date once its signature verifies", async () => {
    const directory = mkdtempSync(join(tmpdir(), "canary-archive-"))
    try {
      writeFileSync(join(directory, "2026-09-30.asc"), canary.signedStatement)
      writeFileSync(join(directory, "2026-09-30.key.asc"), canary.publicKey)

      expect(
        await archivedWindows(listCanaryArchives(directory), canary.publicKey)
      ).toEqual([{ signedOn: "2026-09-30", renewBy: canary.renewBy }])
    } finally {
      rmSync(directory, { recursive: true })
    }
  })
})

describe("archivedWindows without an archived key", () => {
  it("verifies against the current key", async () => {
    const directory = mkdtempSync(join(tmpdir(), "canary-archive-"))
    try {
      writeFileSync(join(directory, "2026-09-03.asc"), canary.signedStatement)

      expect(
        await archivedWindows(listCanaryArchives(directory), canary.publicKey)
      ).toEqual([{ signedOn: "2026-09-03", renewBy: canary.renewBy }])
    } finally {
      rmSync(directory, { recursive: true })
    }
  })
})
