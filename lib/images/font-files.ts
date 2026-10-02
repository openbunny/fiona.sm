import { join } from "node:path"

const themeFonts = "node_modules/@openbunny/theme/fonts"

export const fontFiles = {
  courierPrime: join(
    process.cwd(),
    themeFonts,
    "courier-prime-latin-400-normal.woff"
  ),
  jetbrainsMono: join(
    process.cwd(),
    themeFonts,
    "jetbrains-mono-latin-400-normal.woff"
  ),
} as const
