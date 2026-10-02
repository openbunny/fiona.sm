import type { ReactElement, ReactNode } from "react"

import { cn } from "@/lib/utils"

export function PageSection({
  id,
  className,
  children,
}: {
  readonly id: string
  readonly className?: string
  readonly children: ReactNode
}): ReactElement {
  return (
    <section
      id={id}
      className={cn(
        "mt-14 flex flex-col gap-3 border-t border-line pt-6",
        className
      )}
    >
      {children}
    </section>
  )
}
