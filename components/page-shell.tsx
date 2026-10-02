import type { ReactElement, ReactNode } from "react"

export function PageShell({
  children,
}: {
  readonly children: ReactNode
}): ReactElement {
  return (
    <div className="flex min-h-svh justify-center px-6 py-8 md:px-8 md:py-10">
      <div className="flex w-full max-w-[65ch] min-w-0 flex-col">
        {children}
      </div>
    </div>
  )
}
