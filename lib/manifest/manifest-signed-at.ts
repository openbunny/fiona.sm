import { existsSync, readFileSync } from "node:fs"

import { canary } from "@/lib/canary/canary"
import { manifestClearsignMarker } from "@/lib/manifest/manifest-lookup"
import { defaultManifestPath } from "@/lib/manifest/manifest-paths"
import { verifiedClearsigned } from "@/lib/openpgp-armor"

export async function signedManifestInstant(
  raw: string,
  publicKeyArmor: string
): Promise<string> {
  if (!raw.trimStart().startsWith(manifestClearsignMarker)) {
    throw new Error(
      "public/posts.asc is not a clearsigned message, so it carries no signing time. sign it with `bun run manifest sign`."
    )
  }

  const { signatureCreatedAt } = await verifiedClearsigned(raw, publicKeyArmor)
  return signatureCreatedAt
}

export async function manifestSignedAt(
  manifestPath: string = defaultManifestPath()
): Promise<string> {
  if (!existsSync(manifestPath)) {
    throw new Error(
      `${manifestPath} is missing, so the verify page has no signing time to show. generate and sign it with \`bun run manifest sign\`.`
    )
  }

  return signedManifestInstant(
    readFileSync(manifestPath, "utf8"),
    canary.publicKey
  )
}
