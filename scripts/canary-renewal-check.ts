import {
  canaryRenewalCheck,
  canaryRenewalMessage,
  type CanaryRenewalState,
} from "@/lib/canary/renewal-reminder"
import { todayIsoUtc } from "@/lib/iso-date"

const EXIT_CURRENT = 0
const EXIT_APPROACHING = 1
const EXIT_EXPIRED = 2
const EXIT_CHECK_FAILED = 3
const asOfFlag = "--as-of="

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function exitCodeFor(state: CanaryRenewalState): number {
  if (state === "expired") {
    return EXIT_EXPIRED
  }
  return state === "approaching" ? EXIT_APPROACHING : EXIT_CURRENT
}

function asOfArgument(argv: readonly string[]): string | undefined {
  const arg = argv.find((entry) => entry.startsWith(asOfFlag))
  return arg === undefined ? undefined : arg.slice(asOfFlag.length)
}

function assertValidIsoDate(label: string, value: string): void {
  try {
    canaryRenewalCheck(value, value)
  } catch (cause) {
    throw new Error(
      `${label} ("${value}") is not a valid ISO date: ${messageOf(cause)}`
    )
  }
}

async function renewByFromCanaryModule(): Promise<string> {
  try {
    const { canary } = await import("@/lib/canary/canary")
    return canary.renewBy
  } catch (cause) {
    throw new Error(
      `could not read renewBy from lib/canary/canary.ts: ${messageOf(cause)}. ` +
        `Confirm the module and its required files (public/canary.asc, public/fiona.asc) are present, then rerun.`
    )
  }
}

async function main(): Promise<number> {
  const asOf = asOfArgument(process.argv.slice(2))
  const today = asOf ?? todayIsoUtc()

  let renewBy: string
  try {
    renewBy = await renewByFromCanaryModule()
  } catch (cause) {
    process.stderr.write(`${messageOf(cause)}\n`)
    return EXIT_CHECK_FAILED
  }

  try {
    assertValidIsoDate("canary.renewBy", renewBy)
    assertValidIsoDate(asOf === undefined ? "today" : "--as-of", today)
  } catch (cause) {
    process.stderr.write(`${messageOf(cause)}\n`)
    return EXIT_CHECK_FAILED
  }

  const check = canaryRenewalCheck(renewBy, today)
  const message = canaryRenewalMessage(check)
  const stream = check.state === "current" ? process.stdout : process.stderr
  stream.write(`${message}\n`)
  return exitCodeFor(check.state)
}

process.exit(await main())
