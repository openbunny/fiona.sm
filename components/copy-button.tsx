"use client"

import { CopyButton as SharedCopyButton } from "@openbunny/react"
import type { ReactElement } from "react"

import { copyText } from "@/lib/copy-text"

export function CopyButton(props: {
  readonly text: string
  readonly label: string
  readonly failureHint?: string
  readonly caption?: string
}): ReactElement {
  return <SharedCopyButton {...copyText} {...props} />
}
