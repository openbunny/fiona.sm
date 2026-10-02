import { describe, expect, it } from "vitest"

import {
  buildWkdPolicy,
  wkdHash,
  wkdKeyHref,
  wkdPolicyHref,
  zBase32,
} from "@/lib/publish/wkd"

describe("zBase32", () => {
  it("encodes twenty zero octets as thirty-two y", () => {
    expect(zBase32(new Uint8Array(20))).toBe("y".repeat(32))
  })

  it("encodes five 0xff octets as eight 9", () => {
    expect(zBase32(new Uint8Array([255, 255, 255, 255, 255]))).toBe("99999999")
  })

  it("does not carry stale high bits between octets", () => {
    expect(zBase32(new Uint8Array([0, 1, 2, 3, 4]))).toBe("yyyoryar")
  })

  it("pads the final group when the input is not a multiple of five bits", () => {
    expect(zBase32(new Uint8Array([0]))).toBe("yy")
  })
})

describe("wkdHash", () => {
  it("matches the draft example for joe.doe", () => {
    expect(wkdHash("joe.doe")).toBe("iy9q119eutrkn8s1mk4r39qejnbu3n5q")
  })

  it("matches gpg-wks-client --print-wkd-hash for mail@fiona.sm", () => {
    expect(wkdHash("mail")).toBe("dizb37aqa5h4skgu7jf1xjr4q71w4paq")
  })

  it("lowercases the local part before hashing", () => {
    expect(wkdHash("Joe.Doe")).toBe(wkdHash("joe.doe"))
  })

  it("hashes the local part only, never the whole address", () => {
    expect(wkdHash("mail")).not.toBe(wkdHash("mail@fiona.sm"))
  })
})

describe("wkdKeyHref", () => {
  it("builds the direct-method path for fiona's email address", () => {
    expect(wkdKeyHref("mail@fiona.sm")).toBe(
      "/.well-known/openpgpkey/hu/dizb37aqa5h4skgu7jf1xjr4q71w4paq"
    )
  })

  it("splits on the last at sign", () => {
    expect(wkdKeyHref("a@b@fiona.sm")).toBe(
      `/.well-known/openpgpkey/hu/${wkdHash("a@b")}`
    )
  })

  it("rejects a string that is not an addr-spec", () => {
    expect(() => wkdKeyHref("fiona.sm")).toThrow(/addr-spec/)
    expect(() => wkdKeyHref("@fiona.sm")).toThrow(/addr-spec/)
    expect(() => wkdKeyHref("mail@")).toThrow(/addr-spec/)
  })
})

describe("wkdPolicyHref", () => {
  it("is the direct-method policy path", () => {
    expect(wkdPolicyHref).toBe("/.well-known/openpgpkey/policy")
  })
})

describe("buildWkdPolicy", () => {
  it("names the mail domain and sets no flags", () => {
    expect(buildWkdPolicy("mail@fiona.sm")).toBe(
      "# policy flags for fiona.sm\n"
    )
  })
})
