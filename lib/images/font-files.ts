import { join } from "node:path"

const fontsourceFiles = "node_modules/@fontsource"

export const fontFiles = {
  courierPrime: join(
    process.cwd(),
    fontsourceFiles,
    "courier-prime/files/courier-prime-latin-400-normal.woff"
  ),
  jetbrainsMono: join(
    process.cwd(),
    fontsourceFiles,
    "jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff"
  ),
} as const
