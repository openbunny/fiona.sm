import type { ReactElement, ReactNode } from "react"

import { Plate } from "@/components/plate"
import type { PlateAsset } from "@/lib/images/plates"

export function StatusPage({
  asset,
  plateClassName,
  heading,
  children,
  actions,
}: {
  readonly asset: PlateAsset
  readonly plateClassName: string
  readonly heading: ReactNode
  readonly children: ReactNode
  readonly actions: ReactNode
}): ReactElement {
  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <main id="main" className="flex max-w-[38rem] flex-col gap-6">
        <Plate asset={asset} className={plateClassName} />
        <h1 className="font-display text-[1.4rem]">{heading}</h1>
        <p className="font-display text-[0.92rem] leading-[1.7]">{children}</p>
        {actions}
      </main>
    </div>
  )
}
