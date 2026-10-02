import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { parseIsoDate, parseLongDate } from "@/lib/iso-date"

const archiveName = /^(\d{4}-\d{2}-\d{2})\.asc$/
const archiveKeyPattern = /^(\d{4}-\d{2}-\d{2})\.key\.asc$/
const defaultDirectory = join(process.cwd(), "public/canary")

export type CanaryArchive = {
  readonly signedOn: string
  readonly href: string
  readonly filePath: string
  readonly keyPath: string | undefined
}

export function archiveKeyName(signedOn: string): string {
  return `${signedOn}.key.asc`
}

export function listCanaryArchives(
  directory = defaultDirectory
): CanaryArchive[] {
  if (!existsSync(directory)) {
    return []
  }

  const names = new Set(readdirSync(directory))
  const archives: CanaryArchive[] = []

  for (const name of [...names].sort()) {
    assertArchiveKeyDate(name, directory)

    const signedOn = signedOnFromArchiveName(name, directory)
    if (signedOn === undefined) {
      continue
    }

    const keyName = archiveKeyName(signedOn)
    archives.push({
      signedOn,
      href: `/canary/${signedOn}.asc`,
      filePath: join(directory, name),
      keyPath: names.has(keyName) ? join(directory, keyName) : undefined,
    })
  }

  archives.sort((left, right) => right.signedOn.localeCompare(left.signedOn))
  return archives
}

function assertCalendarDate(
  isoDate: string,
  name: string,
  directory: string
): void {
  try {
    parseIsoDate(isoDate)
  } catch {
    throw new Error(
      `Invalid archive date ${isoDate}: ${join(directory, name)} is not a calendar date`
    )
  }
}

function assertArchiveKeyDate(name: string, directory: string): void {
  const match = archiveKeyPattern.exec(name)
  const signedOn = match?.[1]
  if (signedOn !== undefined) {
    assertCalendarDate(signedOn, name, directory)
  }
}

function signedOnFromArchiveName(
  name: string,
  directory: string
): string | undefined {
  const match = archiveName.exec(name)
  if (match === null) {
    return undefined
  }

  const signedOn = match[1]
  if (signedOn === undefined) {
    return undefined
  }

  assertCalendarDate(signedOn, name, directory)
  return signedOn
}

const renewByLine = /freshly signed statement by (\d{1,2} [a-z]+ \d{4})/

export function statementRenewBy(cleartext: string): string {
  const matches = [...cleartext.matchAll(new RegExp(renewByLine, "g"))]
  const longDate = matches.at(0)?.[1]
  if (matches.length !== 1 || longDate === undefined) {
    throw new Error(
      `Statement names a renew-by date ${matches.length} times, expected exactly once`
    )
  }

  return parseLongDate(longDate)
}
