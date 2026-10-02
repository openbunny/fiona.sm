import type { ManifestLookup } from "@/lib/manifest/manifest-lookup"

export function manifestStatusText(lookup: ManifestLookup): string {
  if (lookup.kind === "absent") {
    return "this build publishes no file at /posts.asc. the checks below describe what to run once one exists."
  }

  if (!lookup.signed) {
    return "this build publishes /posts.asc unsigned: the file is plain text, not a pgp message. a signature needs the key held on a yubikey; nothing here can add one automatically."
  }

  return "this build publishes /posts.asc as a clearsigned message, signed with the key the canary page verifies."
}
