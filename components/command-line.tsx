"use client"

import { CommandLine as SharedCommandLine } from "@openbunny/react"
import type { ReactElement } from "react"

import { copyText } from "@/lib/copy-text"

export function CommandLine(props: { readonly command: string }): ReactElement {
  return (
    <SharedCommandLine
      {...props}
      copy={copyText}
      copyLabel={(command) => `copy command: ${command}`}
    />
  )
}
