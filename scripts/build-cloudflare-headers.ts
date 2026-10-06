import { readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { cloudflareHeaders } from "@/lib/site/cloudflare-headers"

const directory = "out"
const assets = readdirSync(directory, { recursive: true, encoding: "utf8" })
  .filter((path) => !path.startsWith("_") || path.startsWith("_next/"))
  .filter((path) => statSync(join(directory, path)).isFile())
  .map((path) => `/${path}`)

writeFileSync(join(directory, "_headers"), cloudflareHeaders(assets))
