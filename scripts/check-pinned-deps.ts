import { readFile } from "node:fs/promises"
import { join } from "node:path"

const EXIT_PINNED = 0
const EXIT_RANGE_FOUND = 1
const EXIT_CHECK_FAILED = 2

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const

const semverCore = /^\d+\.\d+\.\d+$/
const identifier = /^[0-9A-Z.-]+$/i
const gitShaPin = /#[0-9a-f]{40}$/i
const npmAlias = /^npm:[^@]+@[^@]+$/

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function isValidIdentifier(value: string): boolean {
  return value.length > 0 && identifier.test(value)
}

function isExactSemver(version: string): boolean {
  const plusIndex = version.indexOf("+")
  const core = plusIndex === -1 ? version : version.slice(0, plusIndex)
  const build = plusIndex === -1 ? undefined : version.slice(plusIndex + 1)

  if (build !== undefined && !isValidIdentifier(build)) {
    return false
  }

  const dashIndex = core.indexOf("-")
  if (dashIndex === -1) {
    return semverCore.test(core)
  }

  const base = core.slice(0, dashIndex)
  const prerelease = core.slice(dashIndex + 1)
  return semverCore.test(base) && isValidIdentifier(prerelease)
}

function aliasedVersion(version: string): string | undefined {
  if (!npmAlias.test(version)) {
    return undefined
  }
  const atIndex = version.lastIndexOf("@")
  return version.slice(atIndex + 1)
}

function isExactPin(version: string): boolean {
  if (isExactSemver(version)) {
    return true
  }
  if (gitShaPin.test(version)) {
    return true
  }
  const aliased = aliasedVersion(version)
  return aliased !== undefined && isExactPin(aliased)
}

type Violation = {
  readonly field: string
  readonly name: string
  readonly version: string
}

function violationMessage(violation: Violation): string {
  const { field, name, version } = violation
  return (
    `${field} pins ${name} to "${version}", which is a version range, not an exact version: ` +
    `a range can resolve a different ${name} on every install of the same commit. ` +
    `Replace it with the exact version bun.lock already resolved for ${name} ` +
    `(bun.lock's own entry, or \`bun info ${name} version\`), then run ` +
    `\`bun install --frozen-lockfile\` to confirm nothing moved.`
  )
}

async function readPackageJson(path: string): Promise<Record<string, unknown>> {
  let text: string
  try {
    text = await readFile(path, "utf8")
  } catch (cause) {
    throw new CheckFailed(
      `package.json not found at ${path}: run this from the repository root (${messageOf(cause)})`
    )
  }

  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch (cause) {
    throw new CheckFailed(
      `package.json did not parse as JSON: ${messageOf(cause)}`
    )
  }
}

class CheckFailed extends Error {}

function collectViolations(manifest: Record<string, unknown>): {
  violations: Violation[]
  fieldsScanned: number
} {
  const violations: Violation[] = []
  let fieldsScanned = 0

  for (const field of DEPENDENCY_FIELDS) {
    const section = manifest[field]
    if (
      typeof section !== "object" ||
      section === null ||
      Array.isArray(section)
    ) {
      continue
    }

    const entries = Object.entries(section as Record<string, unknown>)
    if (entries.length === 0) {
      continue
    }

    fieldsScanned += 1

    for (const [name, rawVersion] of entries) {
      if (typeof rawVersion !== "string") {
        continue
      }
      if (!isExactPin(rawVersion)) {
        violations.push({ field, name, version: rawVersion })
      }
    }
  }

  return { violations, fieldsScanned }
}

async function main(): Promise<number> {
  const path = join(process.cwd(), "package.json")

  let manifest: Record<string, unknown>
  try {
    manifest = await readPackageJson(path)
  } catch (cause) {
    process.stderr.write(`${messageOf(cause)}\n`)
    return EXIT_CHECK_FAILED
  }

  const { violations, fieldsScanned } = collectViolations(manifest)

  if (fieldsScanned === 0) {
    process.stderr.write(
      `package.json declares no dependencies, devDependencies, optionalDependencies, or peerDependencies to check: ${path} — confirm this is the intended package.json before trusting a passing run of this gate\n`
    )
    return EXIT_CHECK_FAILED
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      process.stderr.write(`${violationMessage(violation)}\n`)
    }
    return EXIT_RANGE_FOUND
  }

  return EXIT_PINNED
}

process.exit(await main())
