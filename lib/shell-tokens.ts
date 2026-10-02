export type ShellToken = {
  readonly kind: "cmd" | "flag" | "str" | "text" | "space"
  readonly text: string
}

const pieces = /\s+|'[^']*'|"[^"]*"|[^\s'"]+/g

export function shellTokens(command: string): ReadonlyArray<ShellToken> {
  const texts = command.match(pieces) ?? []
  if (texts.join("") !== command) {
    throw new Error(`Unbalanced quotes in command: ${command}`)
  }

  let atCommand = true
  return texts.map((text): ShellToken => {
    if (/^\s+$/.test(text)) {
      return { kind: "space", text }
    }

    const kind = atCommand
      ? "cmd"
      : text.startsWith("'") || text.startsWith('"')
        ? "str"
        : /^--?[a-z]/i.test(text)
          ? "flag"
          : "text"
    atCommand = ["|", "||", "&&", ";"].includes(text)
    return { kind, text }
  })
}
