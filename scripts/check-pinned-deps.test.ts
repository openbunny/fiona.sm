import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { execa } from "execa"
import { afterEach, describe, expect, it } from "vitest"

const root = process.cwd()
const script = join(root, "scripts/check-pinned-deps.ts")
const timeout = 120_000
const fixtures: string[] = []

afterEach(() => {
  for (const dir of fixtures.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function fixtureDir(manifest: Record<string, unknown> | undefined): string {
  const dir = mkdtempSync(join(tmpdir(), "check-pinned-deps-"))
  fixtures.push(dir)
  if (manifest !== undefined) {
    writeFileSync(join(dir, "package.json"), JSON.stringify(manifest))
  }
  return dir
}

async function run(
  cwd: string
): Promise<{ exitCode: number | undefined; stdout: string; stderr: string }> {
  const result = await execa("bun", ["run", script], { cwd, reject: false })
  return {
    exitCode: result.exitCode,
    stdout: String(result.stdout),
    stderr: String(result.stderr),
  }
}

describe("check-pinned-deps", () => {
  it(
    "exits 0 with nothing printed when every dependency is an exact pin",
    async () => {
      const dir = fixtureDir({
        dependencies: { react: "19.2.8" },
        devDependencies: { typescript: "6.0.3" },
      })
      const result = await run(dir)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe("")
      expect(result.stderr).toBe("")
    },
    timeout
  )

  it(
    "exits 1 naming the field, package, and range for a caret version",
    async () => {
      const dir = fixtureDir({
        devDependencies: { prettier: "^3.9.6" },
      })
      const result = await run(dir)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain(
        'devDependencies pins prettier to "^3.9.6"'
      )
      expect(result.stdout).toBe("")
    },
    timeout
  )

  it(
    "exits 1 for a tilde range and a >= range in the same run",
    async () => {
      const dir = fixtureDir({
        devDependencies: {
          stylelint: "~17.15.0",
          typescript: ">=6.0.3",
        },
      })
      const result = await run(dir)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain(
        'devDependencies pins stylelint to "~17.15.0"'
      )
      expect(result.stderr).toContain(
        'devDependencies pins typescript to ">=6.0.3"'
      )
    },
    timeout
  )

  it(
    "exits 1 for a bare wildcard version",
    async () => {
      const dir = fixtureDir({ dependencies: { lodash: "*" } })
      const result = await run(dir)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('dependencies pins lodash to "*"')
    },
    timeout
  )

  it(
    "does not flag a git dependency pinned to a full 40-character commit SHA",
    async () => {
      const dir = fixtureDir({
        dependencies: {
          "example-tool":
            "git+https://example.com/example-tool.git#0123456789abcdef0123456789abcdef01234567",
        },
      })
      const result = await run(dir)
      expect(result.exitCode).toBe(0)
      expect(result.stderr).toBe("")
    },
    timeout
  )

  it(
    "does not flag an npm: alias whose embedded version is itself exact",
    async () => {
      const dir = fixtureDir({
        dependencies: { aliased: "npm:real-package@1.2.3" },
      })
      const result = await run(dir)
      expect(result.exitCode).toBe(0)
      expect(result.stderr).toBe("")
    },
    timeout
  )

  it(
    "exits 2 naming the resolved path when package.json is missing",
    async () => {
      const dir = fixtureDir(undefined)
      const result = await run(dir)
      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain("package.json not found at")
      expect(result.stderr).toContain(join(dir, "package.json"))
      expect(result.stdout).toBe("")
    },
    timeout
  )

  it(
    "exits 2 naming the parse failure when package.json is not valid JSON",
    async () => {
      const dir = fixtureDir(undefined)
      writeFileSync(join(dir, "package.json"), "{ not json")
      const result = await run(dir)
      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain("package.json did not parse as JSON")
    },
    timeout
  )

  it(
    "exits 2, not 0, when no dependency field is present to scan",
    async () => {
      const dir = fixtureDir({ name: "empty", version: "1.0.0" })
      const result = await run(dir)
      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain("declares no dependencies")
      expect(result.stdout).toBe("")
    },
    timeout
  )

  it(
    "exits 2, not 0, when every dependency field present is empty",
    async () => {
      const dir = fixtureDir({ dependencies: {}, devDependencies: {} })
      const result = await run(dir)
      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain("declares no dependencies")
    },
    timeout
  )

  it(
    "exits 0 against the real repository root",
    async () => {
      const result = await run(root)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe("")
      expect(result.stderr).toBe("")
    },
    timeout
  )
})
