import type { CommandStep } from "@/lib/canary/command-step"

const node = "https://xmr-node.cakewallet.com:18081/json_rpc"

export function formatBlockHeight(height: number): string {
  return `#${height.toLocaleString("en-GB")}`
}

export const proofOfDateNote =
  "the last line of the statement names a monero block and its hash. that block did not exist until it was mined, so the pairing puts a floor under the signing time: the statement cannot have been written before it. run this against any public monero node, not only the one named here. in the reply, result.block_header.hash must equal the hash in the statement, and result.block_header.timestamp, in unix seconds utc, must fall at or before the signing instant the statement stamps. the number is the height of the top block itself, not the chain height a daemon reports in its height field, which is one greater and names a block nobody had mined yet. a block explorer answers the same question in a browser at xmrchain.net. a height whose hash does not match, or a block mined after the signing instant, is a defect in this canary rather than a rounding error: report it to mail@fiona.sm."

export function proofOfDateCommands(height: number): ReadonlyArray<string> {
  if (!Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid block height: ${String(height)}`)
  }

  const body = `{"jsonrpc":"2.0","id":"0","method":"get_block_header_by_height","params":{"height":${String(height)}}}`

  return [
    `curl --max-time 20 -s ${node} \\\n  -H 'content-type: application/json' \\\n  -d '${body}'`,
  ]
}

export function proofOfDateSteps(height: number): ReadonlyArray<CommandStep> {
  return proofOfDateCommands(height).map((command) => ({
    command,
    comment: `ask a public monero node for the header of block ${height.toLocaleString("en-GB")}.`,
  }))
}
