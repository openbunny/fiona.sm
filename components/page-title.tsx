import { PageTitle as SharedPageTitle } from "@openbunny/react"
import type { ReactElement } from "react"

import { formatLongDate } from "@/lib/iso-date"

export function PageTitle(props: {
  readonly title: string
  readonly lastChangedAt?: string
}): ReactElement {
  return (
    <SharedPageTitle
      {...props}
      changedLabel="site last changed"
      formatDate={formatLongDate}
    />
  )
}
