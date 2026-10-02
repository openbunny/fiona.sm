import type { ReactElement } from "react"

import { Plate } from "@/components/plate"
import { HOME_PLATE } from "@/lib/images/plates"
import { cn } from "@/lib/utils"

export function Logo({
  className,
}: {
  readonly className?: string
}): ReactElement {
  return <Plate asset={HOME_PLATE} className={cn("w-24", className)} />
}
