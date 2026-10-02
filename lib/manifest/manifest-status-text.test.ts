import { describe, expect, it } from "vitest"

import { manifestStatusText } from "@/lib/manifest/manifest-status-text"

describe("manifestStatusText", () => {
  it("never claims a signature when the manifest is absent", () => {
    const text = manifestStatusText({ kind: "absent" })

    expect(text).not.toMatch(/signed/)
    expect(text).toMatch(/no file/)
  })

  it("never claims a signature when the file is plain text", () => {
    const text = manifestStatusText({
      kind: "present",
      signed: false,
      entries: [],
    })

    expect(text).toMatch(/unsigned/)
    expect(text).not.toMatch(/is signed|as a clearsigned/)
  })

  it("states the clearsign wrapper only once the file carries one", () => {
    const text = manifestStatusText({
      kind: "present",
      signed: true,
      entries: [],
    })

    expect(text).toMatch(/clearsigned/)
  })
})
