import { copyFileSync, mkdirSync, statSync } from "node:fs"
import { join } from "node:path"

const source = join(
  "node_modules",
  "pdfjs-dist",
  "legacy",
  "build",
  "pdf.worker.min.mjs"
)
const targetDir = join("out", "vendor")
const target = join(targetDir, "pdf.worker.min.mjs")

if (statSync(source).size < 10_000) {
  throw new Error("The pinned PDF.js worker is unexpectedly small")
}

mkdirSync(targetDir, { recursive: true })
copyFileSync(source, target)
