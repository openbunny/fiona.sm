import type { ReactElement } from "react"

import { CopyButton } from "@/components/copy-button"
import { ShellCommand } from "@/components/shell-command"

export function CommandLine({
  command,
}: {
  readonly command: string
}): ReactElement {
  return (
    <div className="flex items-center gap-3 border border-line bg-paper-inset px-4 py-2">
      <code className="flex min-w-0 flex-1 items-baseline gap-2 font-mono text-[0.68rem] leading-[1.65] [overflow-wrap:anywhere] whitespace-break-spaces">
        <span aria-hidden="true" className="text-muted select-none">
          $
        </span>
        <span className="min-w-0">
          <ShellCommand command={command} />
        </span>
      </code>
      <CopyButton text={command} label={`copy command: ${command}`} />
    </div>
  )
}
