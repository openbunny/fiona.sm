const sectionStart = "### Check the proof of date"
const sectionEnd =
  "Substitute the height and hash from the statement you fetched."
const hashPattern = /^[0-9a-f]{64}$/

export type ReadmeProofDateInput = {
  readonly moneroBlockHeight: number
  readonly moneroBlockHash: string
}

export function buildReadmeProofDate(input: ReadmeProofDateInput): string {
  if (
    !Number.isInteger(input.moneroBlockHeight) ||
    input.moneroBlockHeight < 0
  ) {
    throw new Error("Monero block height must be a non-negative integer")
  }
  if (!hashPattern.test(input.moneroBlockHash)) {
    throw new Error("Monero block hash must be 64 lowercase hex characters")
  }

  const height = input.moneroBlockHeight
  return `${sectionStart}

The last line of the statement names a Monero block and its hash:

\`\`\`text
Proof of date: Monero block ${height}
${input.moneroBlockHash}
\`\`\`

That block did not exist until it was mined, so the pairing puts a floor under
the signing time: the statement cannot have been written before that block. The
number is the height of the top block itself, **not** the chain height a daemon
reports in its \`height\` field -- chain height is one greater, and quoting it
names a block nobody had mined yet. Ask any public Monero node whether that
height carries that hash:

\`\`\`bash
curl --max-time 20 -s https://xmr-node.cakewallet.com:18081/json_rpc \\
  -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":"0","method":"get_block_header_by_height","params":{"height":${height}}}'
\`\`\`

In the reply, \`result.block_header.hash\` must equal the hash in the statement,
and \`result.block_header.timestamp\` (Unix seconds, UTC) must fall at or before
the signing instant the statement stamps. A block explorer answers the same
question in a browser: <https://xmrchain.net/block/${height}>.

${sectionEnd}`
}

export function patchReadmeProofDate(source: string, section: string): string {
  const start = source.indexOf(sectionStart)
  if (start === -1) throw new Error("Missing proof-of-date section in README")
  const endStart = source.indexOf(sectionEnd, start)
  if (endStart === -1)
    throw new Error("Unterminated proof-of-date section in README")
  const end = endStart + sectionEnd.length
  return source.slice(0, start) + section + source.slice(end)
}
