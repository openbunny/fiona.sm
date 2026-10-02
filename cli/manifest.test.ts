import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type {
  GenerateManifestOptions,
  GeneratedManifest,
} from "@/lib/manifest/manifest-generate"
import type {
  ManifestRunOptions,
  ManifestRunResult,
} from "@/lib/manifest/manifest-run"

const stubs = vi.hoisted(() => ({
  generateManifest:
    vi.fn<(options: GenerateManifestOptions) => GeneratedManifest>(),
  generateManifestText: vi.fn<(options: GenerateManifestOptions) => string>(),
  runManifestGate:
    vi.fn<(options: ManifestRunOptions) => Promise<ManifestRunResult>>(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn<(path: string) => string>(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn<(path: string) => boolean>(),
  readdirSync: vi.fn<(path: string) => string[]>(),
  rmSync: vi.fn(),
}))

vi.mock("@/lib/manifest/manifest-generate", () => ({
  generateManifest: stubs.generateManifest,
  generateManifestText: stubs.generateManifestText,
}))

vi.mock("@/lib/manifest/manifest-run", () => ({
  runManifestGate: stubs.runManifestGate,
}))

vi.mock("node:fs", () => ({
  writeFileSync: stubs.writeFileSync,
  readFileSync: stubs.readFileSync,
  mkdirSync: stubs.mkdirSync,
  existsSync: stubs.existsSync,
  readdirSync: stubs.readdirSync,
  rmSync: stubs.rmSync,
}))

class ProcessExit extends Error {}

function chunkText(chunk: unknown): string {
  if (typeof chunk === "string") {
    return chunk
  }

  if (chunk instanceof Uint8Array) {
    return new TextDecoder().decode(chunk)
  }

  return ""
}

type CliRun = {
  readonly exitCode: number | undefined
  readonly thrown: unknown
  readonly stderr: string
}

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
  process.argv = ["bun", "cli/manifest.ts", ...argv]

  let thrown: unknown
  try {
    vi.resetModules()
    await import("./manifest")
  } catch (error) {
    thrown = error
  } finally {
    process.argv = originalArgv
  }

  const stderrText = stderr.mock.calls
    .map((call) => chunkText(call[0]))
    .join("")

  stdout.mockRestore()
  stderr.mockRestore()
  exit.mockRestore()

  return { exitCode, thrown, stderr: stderrText }
}

describe("the manifest generate command", () => {
  beforeEach(() => {
    stubs.generateManifest.mockReset()
    stubs.writeFileSync.mockReset()
    stubs.mkdirSync.mockReset()
    stubs.existsSync.mockReset()
    stubs.existsSync.mockReturnValue(false)
    stubs.readdirSync.mockReset()
    stubs.readdirSync.mockReturnValue([])
    stubs.rmSync.mockReset()
    stubs.generateManifest.mockReturnValue({
      manifestText: "post content manifest\n",
      articleTexts: [{ slug: "tickerbox-cli", text: "article text" }],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("writes the generated text to the default manifest path", async () => {
    const run = await runCli(["generate"])

    expect(run.thrown).toBeUndefined()
    expect(stubs.writeFileSync).toHaveBeenCalledWith(
      "public/posts.asc",
      "post content manifest\n",
      "utf8"
    )
  })

  it("writes to a --manifest path override", async () => {
    const run = await runCli(["generate", "--manifest", "out/posts.asc"])

    expect(run.thrown).toBeUndefined()
    expect(stubs.writeFileSync).toHaveBeenCalledWith(
      "out/posts.asc",
      "post content manifest\n",
      "utf8"
    )
  })

  it("writes each published post's article text to the default article text directory", async () => {
    const run = await runCli(["generate"])

    expect(run.thrown).toBeUndefined()
    expect(stubs.mkdirSync).toHaveBeenCalledWith("public/posts", {
      recursive: true,
    })
    expect(stubs.writeFileSync).toHaveBeenCalledWith(
      "public/posts/tickerbox-cli.txt",
      "article text",
      "utf8"
    )
  })

  it("writes article text to a --article-text-dir override", async () => {
    const run = await runCli(["generate", "--article-text-dir", "out/posts"])

    expect(run.thrown).toBeUndefined()
    expect(stubs.mkdirSync).toHaveBeenCalledWith("out/posts", {
      recursive: true,
    })
    expect(stubs.writeFileSync).toHaveBeenCalledWith(
      "out/posts/tickerbox-cli.txt",
      "article text",
      "utf8"
    )
  })

  it("exits 1 and writes nothing when generation throws", async () => {
    stubs.generateManifest.mockImplementation(() => {
      throw new Error("build output missing")
    })

    const run = await runCli(["generate"])

    expect(run.exitCode).toBe(1)
    expect(stubs.writeFileSync).not.toHaveBeenCalled()
  })
})

describe("the manifest verify command", () => {
  beforeEach(() => {
    stubs.runManifestGate.mockReset()
    stubs.readFileSync.mockReset()
    stubs.readFileSync.mockReturnValue("-----BEGIN PGP PUBLIC KEY BLOCK-----")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("exits non-zero and enforces by default", async () => {
    stubs.runManifestGate.mockResolvedValue({
      exitCode: 16,
      messages: ["public/posts.asc is missing."],
      enforced: true,
    })

    const run = await runCli(["verify"])

    expect(run.exitCode).toBe(16)
    expect(stubs.runManifestGate).toHaveBeenCalledWith(
      expect.objectContaining({ enforced: true })
    )
  })

  it("passes enforced: true when --enforce is given", async () => {
    stubs.runManifestGate.mockResolvedValue({
      exitCode: 16,
      messages: ["public/posts.asc is missing."],
      enforced: true,
    })

    const run = await runCli(["verify", "--enforce"])

    expect(run.exitCode).toBe(16)
    expect(stubs.runManifestGate).toHaveBeenCalledWith(
      expect.objectContaining({ enforced: true })
    )
  })

  it("passes enforced: false when --no-enforce overrides the default", async () => {
    stubs.runManifestGate.mockResolvedValue({
      exitCode: 0,
      messages: ["public/posts.asc is missing."],
      enforced: false,
    })

    const run = await runCli(["verify", "--no-enforce"])

    expect(run.exitCode).toBe(0)
    expect(stubs.runManifestGate).toHaveBeenCalledWith(
      expect.objectContaining({ enforced: false })
    )
  })

  it("exits 64 when verification itself throws", async () => {
    stubs.runManifestGate.mockRejectedValue(new Error("public key unreadable"))

    const run = await runCli(["verify"])

    expect(run.exitCode).toBe(64)
  })

  it("passes the default article text directory to the gate", async () => {
    stubs.runManifestGate.mockResolvedValue({
      exitCode: 0,
      messages: [],
      enforced: true,
    })

    await runCli(["verify"])

    expect(stubs.runManifestGate).toHaveBeenCalledWith(
      expect.objectContaining({ articleTextDir: "public/posts" })
    )
  })

  it("passes a --article-text-dir override to the gate", async () => {
    stubs.runManifestGate.mockResolvedValue({
      exitCode: 0,
      messages: [],
      enforced: true,
    })

    await runCli(["verify", "--article-text-dir", "out/posts"])

    expect(stubs.runManifestGate).toHaveBeenCalledWith(
      expect.objectContaining({ articleTextDir: "out/posts" })
    )
  })
})

describe("the manifest generate command's revision archive", () => {
  beforeEach(() => {
    stubs.generateManifest.mockReset()
    stubs.writeFileSync.mockReset()
    stubs.mkdirSync.mockReset()
    stubs.existsSync.mockReset()
    stubs.readdirSync.mockReset()
    stubs.readdirSync.mockReturnValue([])
    stubs.rmSync.mockReset()
    stubs.generateManifest.mockReturnValue({
      manifestText: "post content manifest\n",
      articleTexts: [{ slug: "tickerbox-cli", text: "article text" }],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("archives the text under its own digest, so a citation keeps resolving", async () => {
    stubs.existsSync.mockReturnValue(false)
    const { hashArticleText } = await import("@/lib/manifest/article-hash")
    const digest = hashArticleText("article text")

    const run = await runCli(["generate"])

    expect(run.thrown).toBeUndefined()
    expect(stubs.writeFileSync).toHaveBeenCalledWith(
      `public/posts/tickerbox-cli/${digest}.txt`,
      "article text",
      "utf8"
    )
  })

  it("leaves an already archived revision alone, rather than rewriting it", async () => {
    stubs.existsSync.mockReturnValue(true)

    const run = await runCli(["generate"])

    expect(run.thrown).toBeUndefined()
    const archiveWrites = stubs.writeFileSync.mock.calls.filter(
      ([path]) => typeof path === "string" && path.includes("/tickerbox-cli/")
    )
    expect(archiveWrites).toEqual([])
  })
})
