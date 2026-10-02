"use client"

import { useEffect } from "react"
import type { ReactElement } from "react"

import { fontClassName } from "@/app/fonts"
import { ChevronIcon } from "@/components/chevron-icon"
import { StatusPage } from "@/components/status-page"
import { GLOBAL_ERROR_PLATE } from "@/lib/images/plates"

import "./globals.css"

export default function GlobalError({
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
    <html lang="en" className={fontClassName} data-scroll-behavior="smooth">
      <body>
        <StatusPage
          asset={GLOBAL_ERROR_PLATE}
          plateClassName="w-[212px] md:w-[424px]"
          heading="the site failed to load"
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
              <a href="/" aria-label="return home" className="chip">
                <ChevronIcon direction="left" />
              </a>
            </div>
          }
        >
          this is not a signature failure or an expired canary; it means the
          page itself broke. check /canary directly, and verify any published
          statement against the key at /fiona.asc, not this page.
        </StatusPage>
      </body>
    </html>
  )
}
