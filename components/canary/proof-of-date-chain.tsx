import type { ReactElement } from "react"

import { blockHashPrefix } from "@/lib/canary/block-hash"
import { formatBlockHeight } from "@/lib/canary/proof-of-date"
import { formatLongDateTime } from "@/lib/iso-date"

const VIEW_WIDTH = 360

const BLOCK_SIZE = 40
const CHAIN_TOP = 6
const CHAIN_BOTTOM = CHAIN_TOP + BLOCK_SIZE
const CHAIN_MID = CHAIN_TOP + BLOCK_SIZE / 2
const CHAIN_HEIGHT = CHAIN_BOTTOM + 6
const CHAIN_X = [16, 88, 160, 232, 304] as const
const HIGHLIGHT_INDEX = 2

const BLOCK_OFFSETS = ["n−2", "n−1", "n", "n+1", "n+2"] as const

function ChainDiagram({
  blockHeight,
  blockHash,
}: {
  readonly blockHeight: number
  readonly blockHash: string
}): ReactElement {
  const heightLabel = `block ${formatBlockHeight(blockHeight)}`
  const hashLabel = blockHashPrefix(blockHash)

  return (
    <div className="mx-auto flex w-[70%] flex-col gap-2">
      <svg
        viewBox={`0 0 ${String(VIEW_WIDTH)} ${String(CHAIN_HEIGHT)}`}
        aria-hidden="true"
        className="h-auto w-full"
      >
        {CHAIN_X.slice(0, -1).map((x, index) => (
          <line
            key={`link-${String(index)}`}
            x1={x + BLOCK_SIZE}
            y1={CHAIN_MID}
            x2={CHAIN_X[index + 1] ?? 0}
            y2={CHAIN_MID}
            className="stroke-line"
            strokeWidth={2}
          />
        ))}
        {CHAIN_X.map((x, index) => (
          <rect
            key={`block-${String(index)}`}
            x={x}
            y={CHAIN_TOP}
            width={BLOCK_SIZE}
            height={BLOCK_SIZE}
            className={
              index === HIGHLIGHT_INDEX
                ? "fill-sprout-fill stroke-line"
                : "fill-paper-inset stroke-line"
            }
            strokeWidth={2}
          />
        ))}
      </svg>
      <div className="grid grid-cols-5 text-center font-mono text-[0.66rem]">
        {BLOCK_OFFSETS.map((offset, index) => (
          <span
            key={offset}
            className={
              index === HIGHLIGHT_INDEX
                ? "font-bold text-ink-deep"
                : "text-muted"
            }
          >
            {offset}
          </span>
        ))}
      </div>
      <p className="text-center font-mono text-[0.68rem] font-bold text-ink-deep">
        {heightLabel}
      </p>
      <p className="text-center font-mono text-[0.68rem] text-muted">
        {hashLabel}
      </p>
    </div>
  )
}

export function ProofOfDateChain({
  blockHeight,
  blockHash,
  signedAt,
}: {
  readonly blockHeight: number
  readonly blockHash: string
  readonly signedAt: string
}): ReactElement {
  const height = formatBlockHeight(blockHeight)

  return (
    <div className="flex flex-col gap-4">
      <ChainDiagram blockHeight={blockHeight} blockHash={blockHash} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2">
        <dt className="font-mono text-[0.72rem] text-muted">block</dt>
        <dd className="font-mono text-[0.8rem] tabular-nums">{height}</dd>
        <dt className="font-mono text-[0.72rem] text-muted">hash</dt>
        <dd className="font-mono text-[0.8rem] leading-snug break-all">
          {blockHash}
        </dd>
        <dt className="font-mono text-[0.72rem] text-muted">
          statement signed
        </dt>
        <dd className="font-mono text-[0.8rem] tabular-nums">
          <time dateTime={signedAt}>{formatLongDateTime(signedAt)}</time>
        </dd>
      </dl>
      <p className="font-display text-[0.92rem] leading-[1.7] text-pretty">
        the statement quotes the hash of block {height}. a hash does not exist
        before its block is mined. the statement was signed after that block
        existed.
      </p>
    </div>
  )
}
