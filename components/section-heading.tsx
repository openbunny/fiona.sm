import type { ReactElement, ReactNode } from "react"

export function SectionHeading({
  number,
  children,
}: {
  readonly number: string
  readonly children: ReactNode
}): ReactElement {
  return (
    <h2 className="flex items-baseline gap-3 font-sc text-[1.05rem]">
      <span aria-hidden="true" className="font-mono text-[0.7rem] text-muted">
        {number}
      </span>
      {children}
    </h2>
  )
}
