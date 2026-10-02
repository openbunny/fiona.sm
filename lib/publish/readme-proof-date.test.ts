import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import {
  buildReadmeProofDate,
  patchReadmeProofDate,
} from "@/lib/publish/readme-proof-date"

const oldHash = "a".repeat(64)
const nextHash = "b".repeat(64)

const source = `# title

### Check the proof of date

The last line of the statement names a Monero block and its hash:

\`\`\`text
Proof of date: Monero block 123
${oldHash}
\`\`\`

Use it below:

\`\`\`bash
curl -d '{"params":{"height":123}}'
\`\`\`

Explorer: <https://xmrchain.net/block/123>.

Substitute the height and hash from the statement you fetched.
`

describe("buildReadmeProofDate", () => {
  it("renders the block, rpc request, and explorer link from one input", () => {
    const section = buildReadmeProofDate({
      moneroBlockHeight: 456,
      moneroBlockHash: nextHash,
    })

    expect(section).toContain("Proof of date: Monero block 456")
    expect(section).toContain(nextHash)
    expect(section).toContain('"height":456')
    expect(section).toContain("https://xmrchain.net/block/456")
  })
})

describe("patchReadmeProofDate", () => {
  it("replaces every worked-example literal and preserves surrounding prose", () => {
    const next = patchReadmeProofDate(
      source,
      buildReadmeProofDate({
        moneroBlockHeight: 456,
        moneroBlockHash: nextHash,
      })
    )

    expect(next).toContain("# title")
    expect(next).toContain("Substitute the height and hash")
    expect(next).not.toContain(oldHash)
    expect(next).not.toContain("block/123")
    expect(next).not.toContain('"height":123')
  })

  it("refuses a readme without the proof-of-date section", () => {
    expect(() => patchReadmeProofDate("# title\n", "replacement")).toThrow(
      /Missing proof-of-date section/
    )
  })
})

describe("README.md", () => {
  it("still carries both anchors, so canary renew can patch it", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8")

    expect(
      patchReadmeProofDate(
        readme,
        buildReadmeProofDate({
          moneroBlockHeight: canary.moneroBlockHeight,
          moneroBlockHash: canary.moneroBlockHash,
        })
      )
    ).toBe(readme)
  })
})
