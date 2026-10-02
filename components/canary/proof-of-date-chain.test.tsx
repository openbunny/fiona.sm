/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ProofOfDateChain } from "@/components/canary/proof-of-date-chain"

const blockHash =
  "592fe11258ed0bf0d8c04f19a81c85c5359f21c84e476b32a34aa43f52763859"

afterEach(() => {
  cleanup()
})

describe("ProofOfDateChain", () => {
  it("renders the full block hash as selectable text, not a slice", () => {
    render(
      <ProofOfDateChain
        blockHeight={3_754_559}
        blockHash={blockHash}
        signedAt="2026-09-03T19:43:29Z"
      />
    )

    expect(screen.getByText(blockHash)).toBeInTheDocument()
  })

  it("formats the block height the way the rest of the page does", () => {
    render(
      <ProofOfDateChain
        blockHeight={3_754_559}
        blockHash={blockHash}
        signedAt="2026-09-03T19:43:29Z"
      />
    )

    expect(screen.getAllByText("#3,754,559").length).toBeGreaterThan(0)
  })

  it("marks the signing instant with a machine-readable datetime", () => {
    const { container } = render(
      <ProofOfDateChain
        blockHeight={3_754_559}
        blockHash={blockHash}
        signedAt="2026-09-03T19:43:29Z"
      />
    )

    const time = container.querySelector("time")
    expect(time).not.toBeNull()
    expect(time?.getAttribute("dateTime")).toBe("2026-09-03T19:43:29Z")
    expect(time?.textContent).toContain("2026")
  })

  it("states the dating argument: the statement quotes a hash that could not exist before the block was mined", () => {
    render(
      <ProofOfDateChain
        blockHeight={3_754_559}
        blockHash={blockHash}
        signedAt="2026-09-03T19:43:29Z"
      />
    )

    const argument = screen.getByText(/quotes the hash of block #3,754,559/)
    expect(argument.textContent).toMatch(/mined/)
    expect(argument.textContent).toMatch(/signed after/)
  })

  it("never scrolls sideways", () => {
    const { container } = render(
      <ProofOfDateChain
        blockHeight={3_754_559}
        blockHash={blockHash}
        signedAt="2026-09-03T19:43:29Z"
      />
    )

    expect(container.innerHTML).not.toMatch(/overflow-x-(auto|scroll)/)
  })

  it("draws a decorative chain diagram the screen reader skips", () => {
    const { container } = render(
      <ProofOfDateChain
        blockHeight={3_754_559}
        blockHash={blockHash}
        signedAt="2026-09-03T19:43:29Z"
      />
    )

    const svg = container.querySelector("svg")
    expect(svg).not.toBeNull()
    expect(svg?.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it("draws five blocks in the chain, exactly one of them marking the named block", () => {
    const { container } = render(
      <ProofOfDateChain
        blockHeight={3_754_559}
        blockHash={blockHash}
        signedAt="2026-09-03T19:43:29Z"
      />
    )

    const rects = container.querySelectorAll("svg rect")
    expect(rects).toHaveLength(5)

    const highlighted = [...rects].filter((rect) =>
      rect.getAttribute("class")?.includes("fill-sprout-fill")
    )
    expect(highlighted).toHaveLength(1)
  })

  it("labels the named block with its real height and a true prefix of its hash, not fabricated values", () => {
    const { container } = render(
      <ProofOfDateChain
        blockHeight={3_754_559}
        blockHash={blockHash}
        signedAt="2026-09-03T19:43:29Z"
      />
    )

    const labels = [...container.querySelectorAll("span, p")].map(
      (node) => node.textContent
    )
    expect(labels).toContain("block #3,754,559")
    expect(labels).toContain(`${blockHash.slice(0, 8)}…`)
  })

  it("keeps the diagram's labels out of the aria-hidden shapes, so a screen reader still gets them as text", () => {
    const { container } = render(
      <ProofOfDateChain
        blockHeight={3_754_559}
        blockHash={blockHash}
        signedAt="2026-09-03T19:43:29Z"
      />
    )

    const blockLabel = [...container.querySelectorAll("span")].find(
      (node) => node.textContent === "n−2"
    )
    expect(blockLabel).not.toBeUndefined()
    expect(blockLabel?.closest('[aria-hidden="true"]')).toBeNull()
  })
})

describe("the chain diagram's proportions", () => {
  it("scales its drawings uniformly, so a wide measure does not stretch the blocks", () => {
    const { container } = render(
      <ProofOfDateChain
        blockHeight={3773944}
        blockHash="c09507ac0000000000000000000000000000000000000000000000000000beef"
        signedAt="2026-09-30T17:48:00Z"
      />
    )

    const drawings = [...container.querySelectorAll("svg")]
    expect(drawings.length).toBeGreaterThan(0)
    for (const drawing of drawings) {
      expect(drawing.getAttribute("preserveAspectRatio")).toBeNull()
    }
  })

  it("labels every block relative to the quoted one, so the chain reads as neighbours", () => {
    const { container } = render(
      <ProofOfDateChain
        blockHeight={3773944}
        blockHash="c09507ac0000000000000000000000000000000000000000000000000000beef"
        signedAt="2026-09-30T17:48:00Z"
      />
    )

    const row = container.querySelector(".grid-cols-5")
    const labels = [...(row?.children ?? [])].map((node) => node.textContent)

    expect(labels).toEqual(["n−2", "n−1", "n", "n+1", "n+2"])
  })

  it("keeps every block label as text outside the aria-hidden drawing", () => {
    const { container } = render(
      <ProofOfDateChain
        blockHeight={3773944}
        blockHash="c09507ac0000000000000000000000000000000000000000000000000000beef"
        signedAt="2026-09-30T17:48:00Z"
      />
    )

    expect(container.querySelectorAll("svg text")).toHaveLength(0)
    const row = container.querySelector(".grid-cols-5")
    expect(row?.closest('[aria-hidden="true"]')).toBeNull()
  })

  it("lays the blocks on fifths, so a five-column label row sits under them", () => {
    const { container } = render(
      <ProofOfDateChain
        blockHeight={3773944}
        blockHash="c09507ac0000000000000000000000000000000000000000000000000000beef"
        signedAt="2026-09-30T17:48:00Z"
      />
    )

    const blocks = [...container.querySelectorAll("svg rect")]
    const centres = blocks.map(
      (block) =>
        Number(block.getAttribute("x")) +
        Number(block.getAttribute("width")) / 2
    )

    expect(centres).toEqual([36, 108, 180, 252, 324])
  })
})
