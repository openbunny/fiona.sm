import type { ReactElement } from "react"

import type { PlateAsset } from "@/lib/images/plates"
import { cn } from "@/lib/utils"

export function Plate({
  asset,
  className,
}: {
  readonly asset: PlateAsset
  readonly className?: string
}): ReactElement {
  return (
    <span aria-hidden="true" className={cn("inline-block", className)}>
      <img
        src={asset.gifSrc}
        alt=""
        width={asset.width}
        height={asset.height}
        className="plate h-auto w-full motion-reduce:hidden"
      />
      <img
        src={asset.staticSrc}
        alt=""
        width={asset.width}
        height={asset.height}
        className="plate hidden h-auto w-full motion-reduce:block"
      />
    </span>
  )
}
