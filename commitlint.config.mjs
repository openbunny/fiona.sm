const SUBJECT_MAX_LENGTH = 50

const BODY_MAX_LINE_LENGTH = 100

const MAX_FENCE_INDENT = 3

function fenceDelimiter(line) {
  const trimmed = line.trimStart()

  if (line.length - trimmed.length > MAX_FENCE_INDENT) {
    return undefined
  }

  let character = ""
  if (trimmed.startsWith("```")) {
    character = "`"
  } else if (trimmed.startsWith("~~~")) {
    character = "~"
  } else {
    return undefined
  }

  let width = 0
  while (trimmed.startsWith(character, width)) {
    width += 1
  }

  return { character, width, info: trimmed.slice(width) }
}

function closesFence(open, delimiter) {
  return (
    delimiter.character === open.character &&
    delimiter.width >= open.width &&
    delimiter.info.trim() === ""
  )
}

function bodyMaxLineLengthOutsideFencedBlocks(parsed, when, value) {
  const limit = typeof value === "number" ? value : BODY_MAX_LINE_LENGTH
  const raw = typeof parsed.raw === "string" ? parsed.raw : ""

  const lines = raw.split("\n").slice(1)

  let open
  let buffered = []
  const offenders = []

  lines.forEach((line, index) => {
    const lineNumber = index + 2
    const delimiter = fenceDelimiter(line)

    if (delimiter !== undefined) {
      if (line.length > limit) {
        offenders.push(lineNumber)
      }

      if (open === undefined) {
        open = { ...delimiter, line: lineNumber }
        buffered = []
      } else if (closesFence(open, delimiter)) {
        open = undefined
        buffered = []
      }
      return
    }

    if (open !== undefined) {
      if (line.length > limit) {
        buffered.push(lineNumber)
      }
      return
    }

    if (line.length > limit) {
      offenders.push(lineNumber)
    }
  })

  const unterminated = open?.line
  if (unterminated !== undefined) {
    offenders.push(...buffered)
    offenders.sort((first, second) => first - second)
  }

  const negated = when === "never"
  const withinLimit = offenders.length === 0 && unterminated === undefined

  const complaints = []
  if (unterminated !== undefined) {
    complaints.push(
      `the \`${open.character.repeat(open.width)}\` code fence opened on line ${String(unterminated)} is never closed, so nothing after it is exempt from the column limit. Close it with the same fence character, at least as wide, on a line of its own`
    )
  }
  if (offenders.length > 0) {
    complaints.push(
      `line(s) ${offenders.join(", ")} exceed ${String(limit)} characters outside a fenced code block. Wrap prose at ${String(limit)} columns, or move pasted command output inside a \`\`\` fence`
    )
  }

  return [negated ? !withinLimit : withinLimit, `${complaints.join(". ")}.`]
}

function subjectStartsCapitalised(parsed, when) {
  const subject = typeof parsed.subject === "string" ? parsed.subject : ""

  const [first] = [...subject]

  const cased =
    first !== undefined && first.toLowerCase() !== first.toUpperCase()
  const capitalised = !cased || first === first.toUpperCase()

  const negated = when === "never"

  return [
    negated ? !capitalised : capitalised,
    `subject must not start with a lowercase letter: "${subject}". Capitalise the first word after the type. Only the first character is constrained, so a product name keeping its own capitals is fine.`,
  ]
}

const config = {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "body-max-line-length-outside-fenced-blocks":
          bodyMaxLineLengthOutsideFencedBlocks,
        "subject-starts-capitalised": subjectStartsCapitalised,
      },
    },
  ],
  rules: {
    "subject-case": [
      2,
      "never",
      ["lower-case", "start-case", "pascal-case", "upper-case"],
    ],
    "subject-starts-capitalised": [2, "always"],
    "subject-max-length": [2, "always", SUBJECT_MAX_LENGTH],
    "body-max-line-length": [0, "always", BODY_MAX_LINE_LENGTH],
    "footer-max-line-length": [0, "always", BODY_MAX_LINE_LENGTH],
    "body-max-line-length-outside-fenced-blocks": [
      2,
      "always",
      BODY_MAX_LINE_LENGTH,
    ],
  },
}

export default config
