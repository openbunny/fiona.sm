"use client"

import Link from "next/link"
import { useEffect } from "react"
import type { ReactElement } from "react"

import { ChevronIcon } from "@/components/chevron-icon"
import { StatusPage } from "@/components/status-page"
import { ERROR_PLATE } from "@/lib/images/plates"

export default function Error({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string }
  readonly reset: () => void
}): ReactElement {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusPage
      asset={ERROR_PLATE}
      plateClassName="w-[250px] md:w-[500px]"
      heading="this page failed to render"
      actions={
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => {
              reset()
            }}
            className="font-sc text-[0.7rem] underline-offset-4 hover:underline"
          >
            try again
          </button>
          <Link href="/" aria-label="return home" className="chip">
            <ChevronIcon direction="left" />
          </Link>
        </div>
      }
    >
      this is a bug in this page. it is not a failed signature check and does
      not affect the canary&apos;s signature or freshness, which can be verified
      independently with the commands on the canary page.
    </StatusPage>
  )
}
