"use client"

import { track } from "@vercel/analytics"
import { useEffect, useRef, useState } from "react"
import type { ReactElement } from "react"

import { Button } from "@/components/ui/button"

type CopyState = "idle" | "copied" | "failed"

const DIM_MS = 450
const ANNOUNCE_MS = 1600

type CopyButtonProps = {
  readonly text: string
  readonly label: string
  readonly failureHint?: string
  readonly caption?: string
}

export function CopyButton({
  text,
  label,
  failureHint = "select the text and copy by hand.",
  caption = "copy",
}: CopyButtonProps): ReactElement {
  const [state, setState] = useState<CopyState>("idle")
  const [dimmed, setDimmed] = useState(false)
  const resetRef = useRef<number | undefined>(undefined)
  const dimRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      window.clearTimeout(resetRef.current)
      window.clearTimeout(dimRef.current)
    }
  }, [])

  async function copy(): Promise<void> {
    window.clearTimeout(resetRef.current)
    window.clearTimeout(dimRef.current)

    try {
      await navigator.clipboard.writeText(text)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("Copy failed:", message)
      setDimmed(false)
      setState("failed")
      return
    }

    setState("copied")
    setDimmed(true)
    dimRef.current = window.setTimeout(() => {
      setDimmed(false)
    }, DIM_MS)
    resetRef.current = window.setTimeout(() => {
      setState("idle")
    }, ANNOUNCE_MS)

    try {
      track("copy")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("Copy analytics failed:", message)
    }
  }

  const status = state === "failed" ? `${label} failed. ${failureHint}` : ""

  return (
    <span className="js-only inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        onClick={() => {
          void copy()
        }}
        aria-label={label}
        data-copied={dimmed ? "" : undefined}
        className="border-foreground/45 bg-paper font-sc text-[0.65rem] hover:border-ink hover:bg-paper hover:text-ink"
      >
        <span aria-hidden="true">{dimmed ? "copied" : caption}</span>
      </Button>
      <span
        role="status"
        className={
          state === "failed"
            ? "max-w-64 text-right font-display text-xs leading-relaxed text-foreground/70"
            : "sr-only"
        }
      >
        {status}
      </span>
    </span>
  )
}
