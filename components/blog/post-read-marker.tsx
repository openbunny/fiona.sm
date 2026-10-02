"use client"

import { track } from "@vercel/analytics"
import { useEffect, useRef } from "react"
import type { ReactElement } from "react"

type PostReadMarkerProps = {
  readonly post: string
}

export function PostReadMarker({ post }: PostReadMarkerProps): ReactElement {
  const target = useRef<HTMLDivElement>(null)
  const fired = useRef(false)

  useEffect(() => {
    const node = target.current
    if (node === null) {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry === undefined || !entry.isIntersecting || fired.current) {
        return
      }

      fired.current = true
      observer.disconnect()

      try {
        track("post-read", { post })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("Post-read analytics failed:", message)
      }
    })

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [post])

  return <div ref={target} aria-hidden="true" />
}
