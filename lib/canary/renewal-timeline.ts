import { readFileSync } from "node:fs"

import type { CanaryArchive } from "@/lib/canary/canary-history"
import { statementRenewBy } from "@/lib/canary/canary-history"
import { daysUntil } from "@/lib/iso-date"
import { verifyClearsigned } from "@/lib/openpgp-armor"

export type SignedWindow = {
  readonly signedOn: string
  readonly renewBy: string
}

export type TimelineRow = SignedWindow & {
  readonly windowDays: number
  readonly replacedAfterDays: number | undefined
}

export function timelineRows(
  statements: ReadonlyArray<SignedWindow>
): ReadonlyArray<TimelineRow> {
  const ordered = statements.toSorted((left, right) =>
    left.signedOn.localeCompare(right.signedOn)
  )

  return ordered.map((statement, index) => {
    const next = ordered[index + 1]
    return {
      ...statement,
      windowDays: daysUntil(statement.renewBy, statement.signedOn),
      replacedAfterDays:
        next === undefined
          ? undefined
          : daysUntil(next.signedOn, statement.signedOn),
    }
  })
}

export async function archivedWindows(
  archives: ReadonlyArray<CanaryArchive>,
  currentKey: string
): Promise<ReadonlyArray<SignedWindow>> {
  return Promise.all(
    archives.map(async (archive) => {
      const key =
        archive.keyPath === undefined
          ? currentKey
          : readFileSync(archive.keyPath, "utf8")
      const cleartext = await verifyClearsigned(
        readFileSync(archive.filePath, "utf8"),
        key
      )
      return {
        signedOn: archive.signedOn,
        renewBy: statementRenewBy(cleartext),
      }
    })
  )
}
