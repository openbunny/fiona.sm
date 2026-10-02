import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

describe("canary module load", () => {
  const roots: string[] = []

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true })
    }
  })

  function fixtureRoot(): string {
    const root = mkdtempSync(join(tmpdir(), "canary-module-"))
    roots.push(root)
    mkdirSync(join(root, "public"), { recursive: true })
    writeFileSync(join(root, "public/fiona.asc"), "key")
    return root
  }

  it("imports without reading the unpublished statement", async () => {
    vi.spyOn(process, "cwd").mockReturnValue(fixtureRoot())
    vi.resetModules()

    const { canary } = await import("@/lib/canary/canary")

    expect(canary.fingerprint).toBe("4820FA938BA2573DE08E4FAD45B4B5460D72A034")
  })

  it("throws only when the missing statement is read", async () => {
    vi.spyOn(process, "cwd").mockReturnValue(fixtureRoot())
    vi.resetModules()

    const { canary } = await import("@/lib/canary/canary")

    expect(() => canary.signedStatement).toThrow("public/canary.asc is missing")
  })

  it("throws only when the missing public key is read", async () => {
    const root = fixtureRoot()
    rmSync(join(root, "public/fiona.asc"))
    vi.spyOn(process, "cwd").mockReturnValue(root)
    vi.resetModules()

    const { canary } = await import("@/lib/canary/canary")

    expect(() => canary.publicKey).toThrow("public/fiona.asc is missing")
  })

  it("reads the statement once it exists, without re-importing", async () => {
    const root = fixtureRoot()
    vi.spyOn(process, "cwd").mockReturnValue(root)
    vi.resetModules()

    const { canary } = await import("@/lib/canary/canary")

    expect(() => canary.signedStatement).toThrow("public/canary.asc is missing")

    writeFileSync(join(root, "public/canary.asc"), "statement")

    expect(canary.signedStatement).toBe("statement")
  })
})
