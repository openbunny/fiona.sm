import type { ReactElement } from "react"

import { canary } from "@/lib/canary/canary"
import { fingerprintLine } from "@/lib/canary/fingerprint"

export function Fingerprint(): ReactElement {
  const line = fingerprintLine(canary.fingerprint)

  return (
    <p
      tabIndex={0}
      className="min-w-0 overflow-x-auto text-center font-mono text-[clamp(0.72rem,2vw,0.95rem)] leading-[1.85]"
    >
      <span className="sr-only">
        {`openpgp fingerprint, in ten groups of four: ${line}`}
      </span>
      <span aria-hidden="true" className="block whitespace-nowrap">
        {line}
      </span>
    </p>
  )
}
