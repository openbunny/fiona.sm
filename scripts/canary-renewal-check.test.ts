import { join } from "node:path"

import { execa } from "execa"
import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import {
  RENEWAL_WARNING_LEAD_DAYS,
  canaryRenewalCheck,
  canaryRenewalMessage,
} from "@/lib/canary/renewal-reminder"
import { addIsoDays } from "@/lib/iso-date"

const script = join(process.cwd(), "scripts/canary-renewal-check.ts")
const timeout = 120_000
const comfortablyAheadDays = RENEWAL_WARNING_LEAD_DAYS + 10

async function run(args: readonly string[]): Promise<{
  exitCode: number | undefined
  stdout: string
  stderr: string
}> {
  const result = await execa("bun", ["run", script, ...args], {
    reject: false,
  })
  return {
    exitCode: result.exitCode,
    stdout: String(result.stdout),
    stderr: String(result.stderr),
  }
}

function expectedMessage(asOf: string): string {
  return canaryRenewalMessage(canaryRenewalCheck(canary.renewBy, asOf))
}

describe("canary-renewal-check", () => {
  it(
    "exits 0 on stdout, comfortably ahead of renew-by",
    async () => {
      const asOf = addIsoDays(canary.renewBy, -comfortablyAheadDays)
      const result = await run([`--as-of=${asOf}`])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe(expectedMessage(asOf))
      expect(result.stderr).toBe("")
    },
    timeout
  )

  it(
    "exits 1 on stderr, exactly at the warning lead time",
    async () => {
      const asOf = addIsoDays(canary.renewBy, -RENEWAL_WARNING_LEAD_DAYS)
      const result = await run([`--as-of=${asOf}`])
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe(expectedMessage(asOf))
      expect(result.stdout).toBe("")
    },
    timeout
  )

  it(
    "exits 2 on stderr with a message distinct from the warning, the day after renew-by",
    async () => {
      const asOf = addIsoDays(canary.renewBy, 1)
      const result = await run([`--as-of=${asOf}`])
      expect(result.exitCode).toBe(2)
      expect(result.stderr).toBe(expectedMessage(asOf))
      expect(result.stderr).toContain("EXPIRED")
      expect(result.stdout).toBe("")
    },
    timeout
  )

  it(
    "exits 3 naming the bad value, on a malformed --as-of date",
    async () => {
      const result = await run(["--as-of=not-a-date"])
      expect(result.exitCode).toBe(3)
      expect(result.stderr).toBe(
        '--as-of ("not-a-date") is not a valid ISO date: Invalid ISO date: not-a-date'
      )
      expect(result.stdout).toBe("")
    },
    timeout
  )

  it(
    "exits 3 without the --as-of flag ever treated as the failing field",
    async () => {
      const result = await run(["--as-of=2026-13-40"])
      expect(result.exitCode).toBe(3)
      expect(result.stderr).toContain('--as-of ("2026-13-40")')
      expect(result.stderr).not.toContain("canary.renewBy")
    },
    timeout
  )
})
