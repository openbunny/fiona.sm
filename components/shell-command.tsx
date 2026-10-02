import type { ReactElement } from "react"

import { shellTokens } from "@/lib/shell-tokens"

const tokenClass = {
  cmd: "tok-cmd",
  flag: "tok-flag",
  str: "tok-str",
  text: undefined,
  space: undefined,
} as const

export function ShellCommand({
  command,
}: {
  readonly command: string
}): ReactElement {
  return (
    <>
      {shellTokens(command).map((token, index) => (
        <span key={index} className={tokenClass[token.kind]}>
          {token.text}
        </span>
      ))}
    </>
  )
}
