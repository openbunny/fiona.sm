/** @vitest-environment jsdom */

import { StrictMode } from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PostReadMarker } from "@/components/blog/post-read-marker"

const analytics = vi.hoisted(() => ({ track: vi.fn() }))

vi.mock("@vercel/analytics", () => ({ track: analytics.track }))

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  readonly callback: IntersectionObserverCallback
  disconnected = false

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    FakeIntersectionObserver.instances.push(this)
  }

  observe(): void {}

  unobserve(): void {}

  disconnect(): void {
    this.disconnected = true
  }

  intersect(isIntersecting: boolean): void {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    )
  }
}

beforeEach(() => {
  analytics.track.mockReset()
  FakeIntersectionObserver.instances = []
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("PostReadMarker", () => {
  it("does not fire before the marker intersects", () => {
    render(<PostReadMarker post="tickerbox-cli" />)
    const observer = FakeIntersectionObserver.instances.at(-1)
    expect(observer).toBeDefined()

    observer?.intersect(false)

    expect(analytics.track).not.toHaveBeenCalled()
  })

  it("fires post-read with the slug once the marker intersects", () => {
    render(<PostReadMarker post="tickerbox-cli" />)
    const observer = FakeIntersectionObserver.instances.at(-1)

    observer?.intersect(true)

    expect(analytics.track).toHaveBeenCalledWith("post-read", {
      post: "tickerbox-cli",
    })
  })

  it("disconnects the observer once it has fired", () => {
    render(<PostReadMarker post="tickerbox-cli" />)
    const observer = FakeIntersectionObserver.instances.at(-1)

    observer?.intersect(true)

    expect(observer?.disconnected).toBe(true)
  })

  it("fires at most once across repeated intersections", () => {
    render(<PostReadMarker post="tickerbox-cli" />)
    const observer = FakeIntersectionObserver.instances.at(-1)

    observer?.intersect(true)
    observer?.intersect(true)
    observer?.intersect(true)

    expect(analytics.track).toHaveBeenCalledTimes(1)
  })

  it("double-invokes the effect under StrictMode, yet still fires once", () => {
    render(
      <StrictMode>
        <PostReadMarker post="tickerbox-cli" />
      </StrictMode>
    )

    expect(FakeIntersectionObserver.instances).toHaveLength(2)

    for (const observer of FakeIntersectionObserver.instances) {
      observer.intersect(true)
    }

    expect(analytics.track).toHaveBeenCalledTimes(1)
  })

  it("still reports once when analytics throws", () => {
    analytics.track.mockImplementation(() => {
      throw new Error("blocked")
    })
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)

    render(<PostReadMarker post="tickerbox-cli" />)
    const observer = FakeIntersectionObserver.instances.at(-1)

    expect(() => observer?.intersect(true)).not.toThrow()
    expect(analytics.track).toHaveBeenCalledTimes(1)
    error.mockRestore()
  })
})
