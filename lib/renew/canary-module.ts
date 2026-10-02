export type CanaryModuleFields = {
  readonly fingerprint: string
  readonly priorFingerprints: readonly string[]
  readonly algorithm: string
  readonly signedOn: string
  readonly signedAt: string
  readonly renewBy: string
  readonly moneroBlockHeight: number
  readonly moneroBlockHash: string
  readonly previousStatementHash?: string | null
}

const fingerprintValue = /^[0-9A-F]{40}$/
const priorFingerprintsDeclaration =
  /^const priorFingerprints: readonly string\[\] = (\[[\s\S]*?\])$/m

export function assertValidPriorFingerprints(
  fingerprints: readonly string[],
  currentFingerprint: string
): void {
  const seen = new Set<string>()
  for (const fingerprint of fingerprints) {
    if (!fingerprintValue.test(fingerprint)) {
      throw new Error(
        `Invalid prior fingerprint ${JSON.stringify(fingerprint)}`
      )
    }
    if (fingerprint === currentFingerprint) {
      throw new Error(
        `Rotation is one-way: retired fingerprint ${currentFingerprint} cannot become current again while it appears in priorFingerprints`
      )
    }
    if (seen.has(fingerprint)) {
      throw new Error(`Duplicate prior fingerprint ${fingerprint}`)
    }
    seen.add(fingerprint)
  }
}

export function priorFingerprintsFromCanarySource(
  source: string,
  currentFingerprint: string
): readonly string[] {
  const matches = [
    ...source.matchAll(new RegExp(priorFingerprintsDeclaration, "gm")),
  ]
  if (matches.length !== 1) {
    throw new Error(
      matches.length === 0
        ? "Missing priorFingerprints in canary module"
        : "priorFingerprints appears more than once in canary module"
    )
  }
  const declaration = matches[0]?.[1]
  if (declaration === undefined) {
    throw new Error(
      "priorFingerprints declaration in canary module matched but captured no body"
    )
  }

  const body = declaration.slice(1, -1).trim()
  const fingerprints =
    body === ""
      ? []
      : body.split("\n").map((line) => {
          const entry = /^\s*"([0-9A-F]{40})",\s*$/.exec(line)?.[1]
          if (entry === undefined) {
            throw new Error(
              `priorFingerprints entry is not a 40-hex-character fingerprint: ${JSON.stringify(line)}`
            )
          }
          return entry
        })
  assertValidPriorFingerprints(fingerprints, currentFingerprint)
  return fingerprints
}

function replacePriorFingerprints(
  source: string,
  fingerprints: readonly string[],
  currentFingerprint: string
): string {
  assertValidPriorFingerprints(fingerprints, currentFingerprint)
  const matches = [
    ...source.matchAll(new RegExp(priorFingerprintsDeclaration, "gm")),
  ]
  if (matches.length !== 1) {
    throw new Error(
      matches.length === 0
        ? "Missing priorFingerprints in canary module"
        : "priorFingerprints appears more than once in canary module"
    )
  }
  const rendered =
    fingerprints.length === 0
      ? "[]"
      : `[\n${fingerprints.map((fingerprint) => `  "${fingerprint}",`).join("\n")}\n]`
  return source.replace(
    priorFingerprintsDeclaration,
    `const priorFingerprints: readonly string[] = ${rendered}`
  )
}

const fieldLine = {
  fingerprint: /^(\s*fingerprint: ")[^"]*(",?\s*)$/,
  algorithm: /^(\s*algorithm: ")[^"]*(",?\s*)$/,
  signedOn: /^(\s*signedOn: ")[^"]*(",?\s*)$/,
  signedAt: /^(\s*signedAt: ")[^"]*(",?\s*)$/,
  renewBy: /^(\s*renewBy: ")[^"]*(",?\s*)$/,
} as const

const moneroBlockHeightLine = /^(\s*moneroBlockHeight: )\d+(,?\s*)$/
const safeValue = /^[\w:+.-]{1,128}$/
const hashValue = /^[0-9a-f]{64}$/
const previousStatementHashAbsentLine =
  /^(\s*previousStatementHash: )undefined as string \| undefined(,?\s*)$/

function assertSafeValue(field: string, value: string): void {
  if (!safeValue.test(value)) {
    throw new Error(
      `Refusing to patch ${field}: ${JSON.stringify(value)} is outside [\\w:+.-]`
    )
  }
}

function splitCodeAndComment(line: string): {
  code: string
  comment: string
} {
  const lastQuote = line.lastIndexOf('"')
  const searchFrom = lastQuote >= 0 ? lastQuote + 1 : 0
  const afterValue = line.slice(searchFrom)
  const commentIndex = afterValue.indexOf("//")
  if (commentIndex < 0) {
    return { code: line, comment: "" }
  }
  return {
    code: line.slice(0, searchFrom + commentIndex),
    comment: afterValue.slice(commentIndex),
  }
}

function replaceQuotedField(
  source: string,
  field: keyof typeof fieldLine,
  value: string
): string {
  assertSafeValue(field, value)

  const pattern = fieldLine[field]
  const lines = source.split("\n")
  const hits = lines.filter((line) => {
    const { code } = splitCodeAndComment(line)
    return pattern.test(code)
  })

  if (hits.length === 0) {
    throw new Error(`Missing ${field} in canary module`)
  }

  if (hits.length > 1) {
    throw new Error(
      `${field} appears ${hits.length} times in canary module; refusing to patch an ambiguous source`
    )
  }

  return lines
    .map((line) => {
      const { code, comment } = splitCodeAndComment(line)
      return code.replace(pattern, `$1${value}$2`) + comment
    })
    .join("\n")
}

function findWrappedHashField(
  lines: readonly string[],
  field: "moneroBlockHash" | "previousStatementHash"
): number {
  const hits = lines
    .map((line, index) => ({ index, line }))
    .filter(({ line }) => line.trimStart().startsWith(`${field}:`))
  if (hits.length !== 1) {
    throw new Error(
      hits.length === 0
        ? `Missing ${field} in canary module`
        : `${field} appears ${hits.length} times in canary module; refusing to patch an ambiguous source`
    )
  }
  const fieldIndex = hits[0]?.index
  if (fieldIndex === undefined) {
    throw new Error(`Missing ${field} in canary module`)
  }
  return fieldIndex
}

type WrappedHashSlot =
  | { readonly kind: "absent"; readonly lineIndex: number }
  | {
      readonly kind: "quoted"
      readonly lineIndex: number
      readonly firstQuote: number
      readonly lastQuote: number
    }

function locateWrappedHash(
  lines: readonly string[],
  field: "moneroBlockHash" | "previousStatementHash"
): WrappedHashSlot {
  const fieldIndex = findWrappedHashField(lines, field)
  const fieldLineValue = lines[fieldIndex] ?? ""

  if (
    field === "previousStatementHash" &&
    previousStatementHashAbsentLine.test(fieldLineValue)
  ) {
    return { kind: "absent", lineIndex: fieldIndex }
  }

  const valueIndex = fieldLineValue.includes('"') ? fieldIndex : fieldIndex + 1
  const valueLine = lines[valueIndex] ?? ""
  const firstQuote = valueLine.indexOf('"')
  const lastQuote = valueLine.lastIndexOf('"')
  const existing = valueLine.slice(firstQuote + 1, lastQuote)
  if (firstQuote < 0 || lastQuote === firstQuote || !hashValue.test(existing)) {
    throw new Error(`Invalid ${field} in canary module`)
  }
  return { kind: "quoted", lineIndex: valueIndex, firstQuote, lastQuote }
}

function replaceWrappedHash(
  source: string,
  field: "moneroBlockHash" | "previousStatementHash",
  value: string
): string {
  assertSafeValue(field, value)
  if (!hashValue.test(value)) {
    throw new Error(
      `Refusing to patch ${field}: ${JSON.stringify(value)} is not 64 lowercase hex characters`
    )
  }
  const lines = source.split("\n")
  const slot = locateWrappedHash(lines, field)

  if (slot.kind === "absent") {
    const match = previousStatementHashAbsentLine.exec(
      lines[slot.lineIndex] ?? ""
    )
    const prefix = match?.[1] ?? ""
    const suffix = match?.[2] ?? ""
    lines[slot.lineIndex] = `${prefix}"${value}"${suffix}`
    return lines.join("\n")
  }

  const valueLine = lines[slot.lineIndex] ?? ""
  lines[slot.lineIndex] =
    `${valueLine.slice(0, slot.firstQuote + 1)}${value}${valueLine.slice(slot.lastQuote)}`
  return lines.join("\n")
}

function clearPreviousStatementHash(source: string): string {
  const lines = source.split("\n")
  const slot = locateWrappedHash(lines, "previousStatementHash")

  if (slot.kind === "absent") {
    return source
  }

  const valueLine = lines[slot.lineIndex] ?? ""
  const prefix = valueLine.slice(0, slot.firstQuote)
  const suffix = valueLine.slice(slot.lastQuote + 1)
  lines[slot.lineIndex] = `${prefix}undefined as string | undefined${suffix}`
  return lines.join("\n")
}

export function patchCanarySource(
  source: string,
  fields: CanaryModuleFields
): string {
  let next = source
  next = replacePriorFingerprints(
    next,
    fields.priorFingerprints,
    fields.fingerprint
  )
  if (!fingerprintValue.test(fields.fingerprint)) {
    throw new Error(
      `Refusing to patch fingerprint: ${JSON.stringify(fields.fingerprint)} is not 40 uppercase hex characters`
    )
  }
  next = replaceQuotedField(next, "fingerprint", fields.fingerprint)
  next = replaceQuotedField(next, "algorithm", fields.algorithm)
  next = replaceQuotedField(next, "signedOn", fields.signedOn)
  next = replaceQuotedField(next, "signedAt", fields.signedAt)
  next = replaceQuotedField(next, "renewBy", fields.renewBy)
  next = replaceWrappedHash(next, "moneroBlockHash", fields.moneroBlockHash)
  if (fields.previousStatementHash === null) {
    next = clearPreviousStatementHash(next)
  } else if (fields.previousStatementHash !== undefined) {
    next = replaceWrappedHash(
      next,
      "previousStatementHash",
      fields.previousStatementHash
    )
  }
  if (
    !Number.isSafeInteger(fields.moneroBlockHeight) ||
    fields.moneroBlockHeight < 0
  ) {
    throw new Error(
      "Refusing to patch moneroBlockHeight: expected a non-negative safe integer"
    )
  }
  const heightHits = next.split("\n").filter((line) => {
    const { code } = splitCodeAndComment(line)
    return moneroBlockHeightLine.test(code)
  })
  if (heightHits.length !== 1) {
    throw new Error(
      heightHits.length === 0
        ? "Missing moneroBlockHeight in canary module"
        : `moneroBlockHeight appears ${heightHits.length} times in canary module; refusing to patch an ambiguous source`
    )
  }
  next = next
    .split("\n")
    .map((line) => {
      const { code, comment } = splitCodeAndComment(line)
      return (
        code.replace(moneroBlockHeightLine, `$1${fields.moneroBlockHeight}$2`) +
        comment
      )
    })
    .join("\n")
  return next
}
