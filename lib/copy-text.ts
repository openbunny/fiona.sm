"use client"

import type { CopyText } from "@openbunny/react"
import { track } from "@vercel/analytics"

export const copyText: CopyText = {
  caption: "copy",
  copiedCaption: "copied",
  failureHint: "select the text and copy by hand.",
  onCopy: () => track("copy"),
}
