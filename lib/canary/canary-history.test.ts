import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  archiveKeyName,
  listCanaryArchives,
  type CanaryArchive,
  statementRenewBy,
} from "@/lib/canary/canary-history"
import { buildCanaryPlaintext } from "@/lib/renew/canary-text"
import { isRelativeAssetPath } from "@/lib/site/site"

const zeroHash = "0".repeat(64)

function plaintextRenewingBy(renewBy: string): string {
  return buildCanaryPlaintext({
    name: "fiona",
    email: "mail@fiona.sm",
    signedAt: "2026-08-25T12:00:00Z",
    renewBy,
    moneroBlockHeight: 1,
    moneroBlockHash: zeroHash,
  })
}

const fixtures: string[] = []

afterEach(() => {
  for (const dir of fixtures.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function fixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "canary-history-"))
  fixtures.push(dir)
  return dir
}

describe("listCanaryArchives", () => {
  it("lists dated archives newest first from a directory", () => {
    const dir = fixtureDir()
    writeFileSync(join(dir, "2026-01-02.asc"), "older")
    writeFileSync(join(dir, "2026-08-25.asc"), "newer")
    writeFileSync(join(dir, "notes.txt"), "ignore")
    writeFileSync(join(dir, "latest.asc"), "not a date")

    const archives: CanaryArchive[] = listCanaryArchives(dir)

    expect(archives.map((archive) => archive.signedOn)).toEqual([
      "2026-08-25",
      "2026-01-02",
    ])
    expect(archives[0]?.href).toBe("/canary/2026-08-25.asc")
    expect(archives[0]?.filePath).toBe(join(dir, "2026-08-25.asc"))
    expect(isRelativeAssetPath(archives[0]?.href ?? "")).toBe(true)
  })

  it("returns an empty list when the directory has no archives", () => {
    expect(listCanaryArchives(fixtureDir())).toEqual([])
  })

  it("pairs an archive with its contemporaneous key when one is stored", () => {
    const dir = fixtureDir()
    writeFileSync(join(dir, "2026-08-25.asc"), "statement")
    writeFileSync(join(dir, "2026-08-25.key.asc"), "key")
    writeFileSync(join(dir, "2026-01-02.asc"), "older statement")

    const archives = listCanaryArchives(dir)

    expect(archives[0]?.keyPath).toBe(join(dir, "2026-08-25.key.asc"))
    expect(archives[1]?.keyPath).toBeUndefined()
  })

  it("does not treat an archived key as an archived statement", () => {
    const dir = fixtureDir()
    writeFileSync(join(dir, "2026-08-25.key.asc"), "key")

    expect(listCanaryArchives(dir)).toEqual([])
  })

  it("returns an empty list when the archive directory is absent", () => {
    expect(listCanaryArchives(join(fixtureDir(), "missing"))).toEqual([])
  })

  it("throws naming the file when an archive date is not a real calendar date", () => {
    const dir = fixtureDir()
    writeFileSync(join(dir, "2026-08-25.asc"), "statement")
    writeFileSync(join(dir, "2026-13-45.asc"), "impossible")

    expect(() => listCanaryArchives(dir)).toThrow(
      "Invalid archive date 2026-13-45"
    )
    expect(() => listCanaryArchives(dir)).toThrow(join(dir, "2026-13-45.asc"))
  })

  it("throws when a february 30th archive slips in", () => {
    const dir = fixtureDir()
    writeFileSync(join(dir, "2026-02-30.asc"), "impossible")

    expect(() => listCanaryArchives(dir)).toThrow(/2026-02-30/)
  })

  it("throws naming the file when an archived key date is impossible", () => {
    const dir = fixtureDir()
    writeFileSync(join(dir, "2026-08-25.asc"), "statement")
    writeFileSync(join(dir, "2026-08-32.key.asc"), "key")

    expect(() => listCanaryArchives(dir)).toThrow(/2026-08-32\.key\.asc/)
  })

  it("pairs every archived statement with a .key.asc sidecar, however many are archived", () => {
    const dir = fixtureDir()
    writeFileSync(join(dir, "2026-01-02.asc"), "older statement")
    writeFileSync(join(dir, "2026-01-02.key.asc"), "older key")
    writeFileSync(join(dir, "2026-08-25.asc"), "newer statement")
    writeFileSync(join(dir, "2026-08-25.key.asc"), "newer key")

    const archives = listCanaryArchives(dir)

    expect(archives.length).toBeGreaterThan(0)
    for (const archive of archives) {
      expect(
        archive.keyPath,
        `${archive.signedOn}.asc has no paired ${archiveKeyName(archive.signedOn)}`
      ).toBeDefined()
    }
  })
})

describe("statementRenewBy", () => {
  it("reads the renew-by date the statement commits to", () => {
    expect(statementRenewBy(plaintextRenewingBy("2026-11-23"))).toBe(
      "2026-11-23"
    )
  })

  it.each([
    ["no date", "This statement has no renewal sentence."],
    [
      "two dates",
      [
        plaintextRenewingBy("2026-05-01"),
        plaintextRenewingBy("2026-05-02"),
      ].join("\n"),
    ],
  ])("refuses a statement with %s", (_case, text) => {
    expect(() => statementRenewBy(text)).toThrow(
      /Statement names a renew-by date \d times, expected exactly once/
    )
  })
})
