import type { ReactElement } from "react"

import { canary } from "@/lib/canary/canary"
import { cn } from "@openbunny/react"

export function MailLink({
  className,
}: {
  readonly className?: string
}): ReactElement {
  return (
    <a
      href={`mailto:${canary.email}`}
      className={cn("link font-mono text-[0.72rem]", className)}
    >
      {canary.email}
    </a>
  )
}
