import { describe, expect, it } from "vitest"

import { canary } from "@/lib/canary/canary"
import {
  formatBlockHeight,
  proofOfDateCommands,
  proofOfDateNote,
  proofOfDateSteps,
} from "@/lib/canary/proof-of-date"

describe("formatBlockHeight", () => {
  it("prefixes the height with # and groups thousands", () => {
    expect(formatBlockHeight(3_754_559)).toBe("#3,754,559")
  })
})

describe("proofOfDateCommands", () => {
  it("asks the node for the height the statement names", () => {
    const [command, ...rest] = proofOfDateCommands(canary.moneroBlockHeight)

    expect(rest).toEqual([])
    expect(command).toContain(`"height":${String(canary.moneroBlockHeight)}`)
    expect(command).toContain("get_block_header_by_height")
    expect(command).toContain("https://xmr-node.cakewallet.com:18081/json_rpc")
  })

  it("interpolates the recorded height unchanged", () => {
    expect(proofOfDateCommands(3_748_182)[0]).toContain('"height":3748182')
    expect(proofOfDateCommands(3_748_182)[0]).not.toContain('"height":3748181')
    expect(proofOfDateCommands(3_748_182)[0]).not.toContain('"height":3748183')
  })

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses %p as a block height",
    (height) => {
      expect(() => proofOfDateCommands(height)).toThrow(
        `Invalid block height: ${String(height)}`
      )
    }
  )
})

describe("proofOfDateNote", () => {
  it("names both halves of the comparison", () => {
    expect(proofOfDateNote).toContain("result.block_header.hash")
    expect(proofOfDateNote).toContain("result.block_header.timestamp")
    expect(proofOfDateNote).toContain("at or before the signing instant")
  })

  it("warns the reader off the chain height", () => {
    expect(proofOfDateNote).toContain("not the chain height")
    expect(proofOfDateNote).toContain("one greater")
  })

  it("tells the reader a mismatch is a defect worth reporting", () => {
    expect(proofOfDateNote).toContain("defect in this canary")
    expect(proofOfDateNote).toContain("mail@fiona.sm")
  })
})

describe("proofOfDateSteps", () => {
  it("names the block the request asks about", () => {
    expect(proofOfDateSteps(3_748_182)).toEqual([
      {
        command: proofOfDateCommands(3_748_182)[0],
        comment: "ask a public monero node for the header of block 3,748,182.",
      },
    ])
  })
})
