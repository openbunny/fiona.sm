"use client"

import { track } from "@vercel/analytics"
import type { ReactElement, ReactNode } from "react"

type CitationLinkProps = {
  readonly id: string
  readonly href: string
  readonly className?: string
  readonly children: ReactNode
}

export function CitationLink({
  id,
  href,
  className,
  children,
}: CitationLinkProps): ReactElement {
  function handleClick(): void {
    try {
      track("citation-click", { ref: id })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("Citation-click analytics failed:", message)
    }
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  )
}
