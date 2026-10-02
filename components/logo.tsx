import { Plate, cn } from "@openbunny/react"
import type { ReactElement } from "react"

import { HOME_PLATE } from "@/lib/images/plates"

export function Logo({
  className,
}: {
  readonly className?: string
}): ReactElement {
  return <Plate asset={HOME_PLATE} className={cn("w-24", className)} />
}
