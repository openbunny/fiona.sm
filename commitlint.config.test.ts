import { execa } from "execa"
import { describe, expect, it } from "vitest"

async function lint(message: string): Promise<{ ok: boolean; report: string }> {
  const result = await execa("bunx", ["commitlint", "--verbose"], {
    input: message,
    reject: false,
  })

  return {
    ok: result.exitCode === 0,
    report: `${result.stdout}\n${result.stderr}`,
  }
}

describe("subject capitalisation", () => {
  it.each([
    "fix: Validate the squash message",
    "chore(deps): Update Next.js to 16.3.3",
    "test: Stop the bundle budget test reading old output",
  ])("accepts %j", async (message) => {
    expect(await lint(message)).toMatchObject({ ok: true })
  })

  it.each([
    "fix: validate the squash message",
    "fix: validate the Squash message",
    "fix: bunx pin for Vercel",
  ])("rejects %j, naming the rule", async (message) => {
    const { ok, report } = await lint(message)

    expect(ok).toBe(false)
    expect(report).toContain("subject-starts-capitalised")
    expect(report).toContain("must not start with a lowercase letter")
  })

  it.each([
    "chore(deps): 16.3.3 replaces the yanked 16.3.2",
    "fix: `vercel.json` gains a Bun pin",
  ])("accepts %j, which starts with no letter at all", async (message) => {
    expect(await lint(message)).toMatchObject({ ok: true })
  })

  it("still rejects a title-cased subject", async () => {
    const { ok, report } = await lint("fix: Validate The Squash Message")

    expect(ok).toBe(false)
    expect(report).toContain("subject-case")
  })
})

describe("subject length", () => {
  it("accepts a subject at exactly 50 characters", async () => {
    const { ok } = await lint(
      "fix: Keep this subject at exactly fifty characters long"
    )

    expect(ok).toBe(true)
  })

  it("rejects a subject at 51 characters, naming the rule", async () => {
    const { ok, report } = await lint(
      "fix: Keep this subject past exactly fifty-one characters"
    )

    expect(ok).toBe(false)
    expect(report).toContain("subject-max-length")
  })

  it("a long scope does not shift the 50-character subject boundary", async () => {
    const { ok } = await lint(
      "fix(some-long-scope): Keep this subject at exactly fifty characters long"
    )

    expect(ok).toBe(true)
  })
})

const subject = "fix: Test the fence rule"
const overlongInFence = "x".repeat(111)
const overlongProse = "y".repeat(115)

describe("the column limit outside fenced blocks", () => {
  it("accepts an overlong line in a closed fence, Closes above it", async () => {
    expect(
      await lint(
        `${subject}\n\nCloses #186\n\n\`\`\`text\n${overlongInFence}\n\`\`\`\n`
      )
    ).toMatchObject({ ok: true })
  })

  it("accepts the same body with Closes at the end", async () => {
    expect(
      await lint(
        `${subject}\n\n\`\`\`text\n${overlongInFence}\n\`\`\`\n\nCloses #186\n`
      )
    ).toMatchObject({ ok: true })
  })

  it("still rejects overlong prose outside a fence", async () => {
    const { ok, report } = await lint(
      `${subject}\n\n${overlongProse}\n\nCloses #186\n`
    )

    expect(ok).toBe(false)
    expect(report).toContain("body-max-line-length-outside-fenced-blocks")
    expect(report).toContain(
      "exceed 100 characters outside a fenced code block"
    )
  })

  it("rejects an unterminated fence, and names the line it was opened on", async () => {
    const { ok, report } = await lint(
      `${subject}\n\n\`\`\`text\n${overlongProse}\n\nCloses #186\n`
    )

    expect(ok).toBe(false)
    expect(report).toContain("code fence opened on line 3 is never closed")
    expect(report).toContain("line(s) 4 exceed 100 characters")
  })

  it("measures the fence delimiters themselves", async () => {
    const marker = "`".repeat(111)
    const { ok, report } = await lint(
      `${subject}\n\n${marker}\n${marker}\n\nCloses #186\n`
    )

    expect(ok).toBe(false)
    expect(report).toContain("line(s) 3, 4 exceed 100 characters")
  })

  it("does not let a backtick fence close a tilde one", async () => {
    expect(
      await lint(
        `${subject}\n\n~~~text\n\`\`\`\n${overlongInFence}\n~~~\n\nCloses #186\n`
      )
    ).toMatchObject({ ok: true })
  })

  it("does not let a delimiter carrying an info string close a fence", async () => {
    const { ok, report } = await lint(
      `${subject}\n\n\`\`\`text\n${overlongInFence}\n\`\`\`text\n\nCloses #186\n`
    )

    expect(ok).toBe(false)
    expect(report).toContain("is never closed")
  })
})

describe("indentation and the fence delimiter", () => {
  it("does not read a four-space indented line as a fence", async () => {
    expect(
      await lint(
        `${subject}\n\nA transcript, indented rather than fenced:\n\n    \`\`\` inside a ~~~ block    exit 0\n\nCloses #215\n`
      )
    ).toMatchObject({ ok: true })
  })

  it("still reads a three-space indented line as a fence", async () => {
    const { ok, report } = await lint(
      `${subject}\n\n   \`\`\`text\n${overlongProse}\n\nCloses #215\n`
    )

    expect(ok).toBe(false)
    expect(report).toContain("code fence opened on line 3 is never closed")
  })

  it("still measures a four-space indented line as prose", async () => {
    const { ok, report } = await lint(
      `${subject}\n\n    ${overlongProse}\n\nCloses #215\n`
    )

    expect(ok).toBe(false)
    expect(report).toContain(
      "exceed 100 characters outside a fenced code block"
    )
  })
})
