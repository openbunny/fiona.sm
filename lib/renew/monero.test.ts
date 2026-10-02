import { afterEach, describe, expect, it, vi } from "vitest"

import {
  fetchLatestBlock,
  fetchLatestBlockHash,
  parseBlockHeader,
  parseInfo,
} from "@/lib/renew/monero"

const infoUrl = "https://monerospace.org/api/v1/info"

const fixture = {
  height: 3747943,
  top_block_hash:
    "55e6d6a1c45bdcd1926b3253150b236d11e25bab4bc67b9fac18bc9ca04db2a8",
}

function jsonResponse(): Response {
  return new Response(JSON.stringify(fixture), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

const checkedAt = "2026-08-26T12:00:00.000Z"
const checkedAtSeconds = Date.parse(checkedAt) / 1000
const oneHourSeconds = 60 * 60

function blockResponse(
  hash = fixture.top_block_hash,
  timestamp = checkedAtSeconds - 120
): Response {
  return new Response(
    JSON.stringify({
      result: {
        block_header: {
          hash,
          height: fixture.height - 1,
          timestamp,
        },
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  )
}

function crossCheckedFetch(
  timestamp = checkedAtSeconds - 120
): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: string | URL | Request) =>
    String(input).includes("json_rpc")
      ? blockResponse(fixture.top_block_hash, timestamp)
      : jsonResponse()
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("parseBlockHeader", () => {
  it("parses the independently returned height, hash, and timestamp", () => {
    expect(
      parseBlockHeader({
        result: {
          block_header: {
            hash: fixture.top_block_hash.toUpperCase(),
            height: fixture.height - 1,
            timestamp: 1_756_147_200,
          },
        },
      })
    ).toEqual({
      hash: fixture.top_block_hash,
      height: fixture.height - 1,
      timestamp: 1_756_147_200,
    })
  })
})

describe("parseInfo", () => {
  it("rejects a missing top_block_hash", () => {
    expect(() => parseInfo({ height: fixture.height })).toThrow(
      /top_block_hash/
    )
  })

  it("rejects a top_block_hash that is not 64 hex", () => {
    expect(() => parseInfo({ ...fixture, top_block_hash: "abc" })).toThrow(
      /top_block_hash/
    )
    expect(() =>
      parseInfo({ ...fixture, top_block_hash: `${fixture.top_block_hash}aa` })
    ).toThrow(/top_block_hash/)
    expect(() =>
      parseInfo({
        ...fixture,
        top_block_hash: "g".repeat(64),
      })
    ).toThrow(/top_block_hash/)
  })

  it("lowercases the hash the plaintext builder demands", () => {
    expect(
      parseInfo({
        ...fixture,
        top_block_hash: fixture.top_block_hash.toUpperCase(),
      })
    ).toEqual({
      hash: fixture.top_block_hash,
      height: fixture.height - 1,
    })
  })

  it("rejects a chain height with no top block", () => {
    expect(() => parseInfo({ ...fixture, height: 0 })).toThrow(/height/)
    expect(() => parseInfo({ ...fixture, height: 1 })).toThrow(/height/)
  })

  it("rejects a height below the plausible chain floor", () => {
    expect(() => parseInfo({ ...fixture, height: 3699999 })).toThrow(/height/)
    expect(() => parseInfo({ ...fixture, height: -1 })).toThrow(/height/)
  })

  it("rejects a height outside the safe integer range", () => {
    expect(() => parseInfo({ ...fixture, height: 1e21 })).toThrow(/height/)
    expect(() =>
      parseInfo({ ...fixture, height: Number.MAX_SAFE_INTEGER + 2 })
    ).toThrow(/height/)
    expect(() =>
      parseInfo({ ...fixture, height: Number.POSITIVE_INFINITY })
    ).toThrow(/height/)
  })

  it("rejects a fractional height", () => {
    expect(() => parseInfo({ ...fixture, height: 3747943.5 })).toThrow(/height/)
  })

  it("returns the height of the hashed block, not the chain height", () => {
    expect(parseInfo(fixture)).toEqual({
      hash: fixture.top_block_hash,
      height: fixture.height - 1,
    })
  })

  it("pins the height-1 correction: top_block_hash names the block below the reported chain height", () => {
    const chainHeight = 3_800_000
    const topBlockHash = "b".repeat(64)

    expect(
      parseInfo({ height: chainHeight, top_block_hash: topBlockHash })
    ).toEqual({ hash: topBlockHash, height: chainHeight - 1 })
  })
})

describe("fetchLatestBlock", () => {
  it("gets the info url under a timeout and returns hash and height", async () => {
    const fetchMock = crossCheckedFetch()
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchLatestBlock(checkedAt)).resolves.toEqual({
      hash: fixture.top_block_hash,
      height: fixture.height - 1,
    })
    expect(fetchMock).toHaveBeenCalledWith(infoUrl, {
      signal: expect.any(AbortSignal),
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("retries once when the request is rejected", async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(jsonResponse())
      .mockResolvedValueOnce(blockResponse())
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchLatestBlock(checkedAt)).resolves.toEqual({
      hash: fixture.top_block_hash,
      height: fixture.height - 1,
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("gives up after one retry", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down")
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchLatestBlock()).rejects.toThrow(/network down/)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("reports an unreadable body instead of a bare syntax error", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("<html>maintenance</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        })
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchLatestBlock()).rejects.toThrow(
      /Failed to read the latest block response/
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("rejects a hash that the independent node does not confirm", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) =>
      String(input).includes("json_rpc")
        ? blockResponse("a".repeat(64))
        : jsonResponse()
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchLatestBlock()).rejects.toThrow(/does not match/)
  })

  it("accepts a block mined at the signing instant", async () => {
    vi.stubGlobal("fetch", crossCheckedFetch(checkedAtSeconds))

    await expect(fetchLatestBlock(checkedAt)).resolves.toEqual({
      hash: fixture.top_block_hash,
      height: fixture.height - 1,
    })
  })

  it("rejects a block mined after the signing instant", async () => {
    vi.stubGlobal("fetch", crossCheckedFetch(checkedAtSeconds + 1))

    await expect(fetchLatestBlock(checkedAt)).rejects.toThrow(
      /after the signing instant/
    )
  })

  it("accepts a block mined at the far edge of the recency window", async () => {
    vi.stubGlobal("fetch", crossCheckedFetch(checkedAtSeconds - oneHourSeconds))

    await expect(fetchLatestBlock(checkedAt)).resolves.toEqual({
      hash: fixture.top_block_hash,
      height: fixture.height - 1,
    })
  })

  it("rejects a block one second older than the recency window", async () => {
    vi.stubGlobal(
      "fetch",
      crossCheckedFetch(checkedAtSeconds - oneHourSeconds - 1)
    )

    await expect(fetchLatestBlock(checkedAt)).rejects.toThrow(/stale/)
  })

  it("rejects a correctly paired block that is a day old", async () => {
    vi.stubGlobal(
      "fetch",
      crossCheckedFetch(checkedAtSeconds - 24 * oneHourSeconds)
    )

    await expect(fetchLatestBlock(checkedAt)).rejects.toThrow(
      /is 1440 minutes old: the block endpoint is stale/
    )
  })

  it("rejects a check instant it cannot parse instead of skipping both bounds", async () => {
    vi.stubGlobal("fetch", crossCheckedFetch())

    await expect(fetchLatestBlock("not an instant")).rejects.toThrow(
      /Invalid check instant/
    )
  })
})

describe("fetchLatestBlockHash", () => {
  it("gets the info url, parses the body, and returns the hash", async () => {
    const fetchMock = crossCheckedFetch(Math.floor(Date.now() / 1000) - 120)
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchLatestBlockHash()).resolves.toBe(fixture.top_block_hash)
    expect(fetchMock).toHaveBeenCalledWith(infoUrl, {
      signal: expect.any(AbortSignal),
    })
  })

  it("throws on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(null, { status: 503, statusText: "Service Unavailable" })
    )

    await expect(fetchLatestBlockHash()).rejects.toThrow(
      /Failed to fetch latest block hash \(503\)/
    )
  })
})
