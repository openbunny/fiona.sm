import type { ReactElement } from "react"

export function SkipLink(): ReactElement {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
    >
      skip to content
    </a>
  )
}
