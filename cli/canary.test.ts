import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { RenewOptions } from "@/lib/renew/canary-renew"
import * as renewDays from "@/lib/renew/renew-days"

const stubs = vi.hoisted(() => {
  const renewCanary = vi.fn<(options: RenewOptions) => Promise<string>>()
  const state: { daysFailure: unknown } = { daysFailure: undefined }
  return { renewCanary, state }
})

vi.mock("@/lib/renew/canary-renew", () => ({
  renewCanary: stubs.renewCanary,
}))

vi.mock("@/lib/renew/renew-days", async (importOriginal) => {
  const actual = await importOriginal<typeof renewDays>()
  return {
    ...actual,
    parseRenewDays(value: string): number {
      if (stubs.state.daysFailure !== undefined) {
        throw stubs.state.daysFailure
      }

      return actual.parseRenewDays(value)
    },
  }
})

class ProcessExit extends Error {}

type CliRun = {
  readonly stdout: string
  readonly exitCode: number | undefined
  readonly thrown: unknown
}

function chunkText(chunk: unknown): string {
  if (typeof chunk === "string") {
    return chunk
  }

  if (chunk instanceof Uint8Array) {
    return new TextDecoder().decode(chunk)
  }

  return ""
}

const signedStatement = "-----BEGIN PGP SIGNED MESSAGE-----"

async function runCli(argv: readonly string[]): Promise<CliRun> {
  const stdout = vi
    .spyOn(process.stdout, "write")
    .mockImplementation(() => true)
  const stderr = vi
    .spyOn(process.stderr, "write")
    .mockImplementation(() => true)

  let exitCode: number | undefined
  const exit = vi.spyOn(process, "exit").mockImplementation((code) => {
    exitCode = typeof code === "number" ? code : 0
    throw new ProcessExit("the CLI exited")
  })

  const originalArgv = process.argv
  process.argv = ["bun", "cli/canary.ts", ...argv]

  let thrown: unknown
  try {
    vi.resetModules()
    await import("./canary")
  } catch (error) {
    thrown = error
  } finally {
    process.argv = originalArgv
  }

  const written = stdout.mock.calls.map((call) => chunkText(call[0])).join("")

  stdout.mockRestore()
  stderr.mockRestore()
  exit.mockRestore()

  return { stdout: written, exitCode, thrown }
}

function renewOptions(): RenewOptions {
  expect(stubs.renewCanary).toHaveBeenCalledTimes(1)
  const call = stubs.renewCanary.mock.calls[0]
  if (call === undefined) {
    throw new Error("renewCanary was never called")
  }

  return call[0]
}

describe("the canary renew command", () => {
  beforeEach(() => {
    stubs.state.daysFailure = undefined
    stubs.renewCanary.mockReset()
    stubs.renewCanary.mockResolvedValue(signedStatement)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("keeps the key-continuity check on when --rotate is absent", async () => {
    const run = await runCli(["renew"])

    expect(run.thrown).toBeUndefined()
    expect(renewOptions().rotate).toBe(false)
  })

  it("allows a differing fingerprint only when --rotate is given", async () => {
    const run = await runCli(["renew", "--rotate"])

    expect(run.thrown).toBeUndefined()
    expect(renewOptions().rotate).toBe(true)
  })

  it("asks the card to sign when --dry-run is absent", async () => {
    const run = await runCli(["renew"])

    expect(run.thrown).toBeUndefined()
    expect(renewOptions().dryRun).toBe(false)
  })

  it("suppresses signing only when --dry-run is given", async () => {
    const run = await runCli(["renew", "--dry-run"])

    expect(run.thrown).toBeUndefined()
    expect(renewOptions().dryRun).toBe(true)
  })

  it("defaults to a window parseRenewDays accepts unchanged", async () => {
    const run = await runCli(["renew"])

    expect(run.thrown).toBeUndefined()
    const { days } = renewOptions()
    expect(renewDays.parseRenewDays(String(days))).toBe(days)
    expect(days).toBeLessThanOrEqual(renewDays.maxRenewDays)
    expect(days).toBeGreaterThanOrEqual(1)
  })

  it("hands a supplied --days over as the parsed number", async () => {
    const run = await runCli(["renew", "--days", "30"])

    expect(run.thrown).toBeUndefined()
    expect(renewOptions().days).toBe(30)
  })

  it.each([
    ["above the ceiling", String(renewDays.maxRenewDays + 1)],
    ["below the floor", "0"],
    ["not a whole number", "45.5"],
    ["not a number at all", "soon"],
  ])("refuses a --days %s before signing anything", async (_reason, value) => {
    const run = await runCli(["renew", "--days", value])

    expect(stubs.renewCanary).not.toHaveBeenCalled()
    expect(run.thrown).toBeInstanceOf(ProcessExit)
    expect(run.exitCode).toBeGreaterThan(0)
  })

  it("turns a refusal that is not an Error into the same exit", async () => {
    stubs.state.daysFailure = "the card said no"

    const run = await runCli(["renew", "--days", "30"])

    expect(stubs.renewCanary).not.toHaveBeenCalled()
    expect(run.thrown).toBeInstanceOf(ProcessExit)
    expect(run.exitCode).toBeGreaterThan(0)
  })

  it("ends the statement it prints with exactly one newline", async () => {
    stubs.renewCanary.mockResolvedValue(signedStatement)

    const run = await runCli(["renew"])

    expect(run.thrown).toBeUndefined()
    expect(run.stdout).toBe(`${signedStatement}\n`)
  })

  it("does not add a second newline to a statement that has one", async () => {
    stubs.renewCanary.mockResolvedValue(`${signedStatement}\n`)

    const run = await runCli(["renew"])

    expect(run.thrown).toBeUndefined()
    expect(run.stdout).toBe(`${signedStatement}\n`)
  })
})
