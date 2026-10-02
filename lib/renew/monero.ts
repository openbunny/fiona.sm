const infoUrl = "https://monerospace.org/api/v1/info"
const blockHeaderUrl = "https://xmr-node.cakewallet.com:18081/json_rpc"

const requestTimeoutMs = 10_000
const retryDelayMs = 250

const topBlockHashPattern = /^[0-9a-f]{64}$/i

const minimumChainHeight = 3_700_000

const maximumBlockAgeMs = 60 * 60 * 1000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function parseInfo(value: unknown): {
  hash: string
  height: number
} {
  if (!isRecord(value)) {
    throw new Error("monero info response is not an object")
  }

  const topBlockHash = value["top_block_hash"]
  if (
    typeof topBlockHash !== "string" ||
    !topBlockHashPattern.test(topBlockHash)
  ) {
    throw new Error(
      `monero info response has an invalid top_block_hash: ${JSON.stringify(topBlockHash)}`
    )
  }

  const height = value["height"]
  if (
    typeof height !== "number" ||
    !Number.isSafeInteger(height) ||
    height < minimumChainHeight
  ) {
    throw new Error(
      `monero info response height is not a safe integer >= ${minimumChainHeight}: ${JSON.stringify(height)}`
    )
  }

  return { hash: topBlockHash.toLowerCase(), height: height - 1 }
}

export function parseBlockHeader(value: unknown): {
  hash: string
  height: number
  timestamp: number
} {
  if (!isRecord(value) || !isRecord(value["result"])) {
    throw new Error("Monero block header response has no result object")
  }
  const header = value["result"]["block_header"]
  if (!isRecord(header)) {
    throw new Error("Monero block header response has no block_header object")
  }
  const hash = header["hash"]
  const height = header["height"]
  const timestamp = header["timestamp"]
  if (typeof hash !== "string" || !topBlockHashPattern.test(hash)) {
    throw new Error(`Invalid block header hash: ${JSON.stringify(hash)}`)
  }
  if (typeof height !== "number" || !Number.isSafeInteger(height)) {
    throw new Error(`Invalid block header height: ${JSON.stringify(height)}`)
  }
  if (typeof timestamp !== "number" || !Number.isSafeInteger(timestamp)) {
    throw new Error(
      `Invalid block header timestamp: ${JSON.stringify(timestamp)}`
    )
  }
  return { hash: hash.toLowerCase(), height, timestamp }
}

async function requestInfo(): Promise<unknown> {
  const response = await fetch(infoUrl, {
    signal: AbortSignal.timeout(requestTimeoutMs),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch latest block hash (${response.status})`)
  }

  try {
    return await response.json()
  } catch (cause) {
    throw new Error("Failed to read the latest block response", { cause })
  }
}

async function requestBlockHeader(height: number): Promise<unknown> {
  const response = await fetch(blockHeaderUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "0",
      method: "get_block_header_by_height",
      params: { height },
    }),
    signal: AbortSignal.timeout(requestTimeoutMs),
  })
  if (!response.ok) {
    throw new Error(`Failed to cross-check Monero block (${response.status})`)
  }
  try {
    return await response.json()
  } catch (cause) {
    throw new Error("Failed to read the Monero cross-check response", { cause })
  }
}

export async function fetchLatestBlock(
  signedAt = new Date().toISOString()
): Promise<{
  hash: string
  height: number
}> {
  let candidate: { hash: string; height: number }
  try {
    candidate = parseInfo(await requestInfo())
  } catch {
    await wait(retryDelayMs)
    candidate = parseInfo(await requestInfo())
  }

  const confirmed = parseBlockHeader(await requestBlockHeader(candidate.height))
  if (
    confirmed.height !== candidate.height ||
    confirmed.hash !== candidate.hash
  ) {
    throw new Error("Independent Monero block cross-check does not match")
  }
  const signedAtMs = Date.parse(signedAt)
  if (!Number.isFinite(signedAtMs)) {
    throw new Error(
      `Invalid check instant for the Monero recency check: ${JSON.stringify(signedAt)}`
    )
  }
  const blockMs = confirmed.timestamp * 1000
  if (blockMs > signedAtMs) {
    throw new Error("Monero block timestamp is after the signing instant")
  }
  if (blockMs < signedAtMs - maximumBlockAgeMs) {
    const ageMinutes = Math.round((signedAtMs - blockMs) / 60_000)
    throw new Error(
      `Monero block ${confirmed.height} is ${ageMinutes} minutes old: the block endpoint is stale, so it cannot prove when this was signed`
    )
  }
  return candidate
}

export async function fetchLatestBlockHash(): Promise<string> {
  return (await fetchLatestBlock()).hash
}
