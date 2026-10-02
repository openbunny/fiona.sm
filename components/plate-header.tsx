import type { ReactElement } from "react"

import { Plate } from "@/components/plate"
import type { PlateAsset } from "@/lib/images/plates"

export function PlateHeader({
  asset,
  plateClassName,
}: {
  readonly asset: PlateAsset
  readonly plateClassName: string
}): ReactElement {
  return (
    <header className="mt-6 border-b border-line">
      <Plate asset={asset} className={plateClassName} />
    </header>
  )
}
