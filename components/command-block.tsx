"use client"

import { CommandBlock as SharedCommandBlock } from "@openbunny/react"
import type { CommandStep } from "@openbunny/react"
import type { ReactElement, ReactNode } from "react"

import { copyText } from "@/lib/copy-text"

export function CommandBlock(props: {
  readonly id: string
  readonly number: string
  readonly title: string
  readonly steps: ReadonlyArray<CommandStep>
  readonly note?: string
  readonly copyAll?: boolean
  readonly lead?: ReactNode
}): ReactElement {
  return (
    <SharedCommandBlock
      {...props}
      copy={copyText}
      copyLabel={(command) => `copy command: ${command}`}
      copyAllCaption="copy all"
      copyAllLabel={`copy all ${props.title} commands`}
    />
  )
}
