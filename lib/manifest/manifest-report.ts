import type { ManifestGateState, PostDrift } from "@/lib/manifest/manifest-gate"

export const manifestExitCode = {
  clean: 0,
  differing: 1,
  missingFromManifest: 2,
  orphanInManifest: 4,
  signatureInvalid: 8,
  manifestUnsigned: 16,
  manifestMissing: 32,
  verifierFailed: 64,
  noPublishedPosts: 128,
  articleTextMissing: 256,
  articleTextStale: 512,
  articleTextOrphan: 1024,
  archiveMissing: 2048,
  archiveCorrupt: 4096,
} as const

function driftMessage(entry: PostDrift): string | undefined {
  if (entry.state === "differing") {
    return `Post "${entry.slug}" has built hash ${entry.builtHash ?? ""}; the manifest records ${entry.manifestHash ?? ""}. The deployed article text does not match the signed manifest: regenerate with \`bun run manifest generate\` and have the owner re-sign if the change was deliberate, or treat the deployment as suspect if it was not.`
  }

  if (entry.state === "missingFromManifest") {
    return `Post "${entry.slug}" is published but has no entry in the manifest. Run \`bun run manifest generate\` and have the owner re-sign.`
  }

  if (entry.state === "orphanInManifest") {
    return `The manifest attests to "${entry.slug}", which lib/blog/posts.ts no longer publishes. Run \`bun run manifest generate\` and have the owner re-sign to drop it.`
  }

  return undefined
}

function articleTextMessage(entry: PostDrift): string | undefined {
  if (entry.articleText === "missing") {
    return `public/posts/${entry.slug}.txt is missing. Run \`bun run manifest generate\` to write it, then have the owner re-sign if the manifest changed.`
  }

  if (entry.articleText === "stale") {
    return `public/posts/${entry.slug}.txt does not match "${entry.slug}"'s freshly built article text, or its sha-256 no longer equals the manifest's entry for it. Regenerate with \`bun run manifest generate\` and have the owner re-sign if the change was deliberate, or treat the published file as tampered if it was not.`
  }

  return undefined
}

function archiveMessage(entry: PostDrift): string | undefined {
  if (entry.archive === "missing") {
    return `public/posts/${entry.slug}/${entry.manifestHash ?? ""}.txt is missing, so a citation carrying that digest resolves to nothing. Run \`bun run manifest generate\` to archive the text under its own digest.`
  }

  return undefined
}

export function manifestStateMessages(state: ManifestGateState): string[] {
  if (state.kind === "manifestMissing") {
    return [
      "public/posts.asc is missing. Generate it with `bun run manifest generate`, then have the owner clearsign it: see docs/post-manifest.md.",
    ]
  }

  if (state.kind === "manifestUnsigned") {
    return [
      "public/posts.asc exists but is not a clearsigned PGP message. Sign it with the command docs/post-manifest.md prints, or regenerate it with `bun run manifest generate` if it was left unsigned by mistake.",
    ]
  }

  if (state.kind === "signatureInvalid") {
    return [
      `public/posts.asc does not verify against public/fiona.asc: ${state.detail}. Re-sign the manifest with the owner's key, regenerating first with \`bun run manifest generate\` if the content has changed.`,
    ]
  }

  if (state.kind === "noPublishedPosts") {
    return [
      "lib/blog/posts.ts publishes no posts, so there is nothing for the manifest to attest. This is treated as a failure, not a vacuous pass: publish at least one post, or the manifest and its per-post checks verify nothing.",
    ]
  }

  const driftMessages = state.drift.flatMap((entry) =>
    [
      driftMessage(entry),
      articleTextMessage(entry),
      archiveMessage(entry),
    ].filter((message): message is string => message !== undefined)
  )

  const orphanMessages = state.orphanArticleTextFiles.map(
    (slug) =>
      `public/posts/${slug}.txt exists but "${slug}" is not published. Delete it, or restore the post in lib/blog/posts.ts.`
  )

  const corruptMessages = state.corruptArchiveFiles.map(
    (path) =>
      `${path} does not hash to the digest its name claims. An archived revision is addressed by its own sha-256, so a file that no longer matches is either corrupt or was not written by \`bun run manifest generate\`. Restore it, or delete it if no citation can reach it.`
  )

  return [...driftMessages, ...orphanMessages, ...corruptMessages]
}

export function manifestStateExitCode(state: ManifestGateState): number {
  if (state.kind === "manifestMissing") {
    return manifestExitCode.manifestMissing
  }

  if (state.kind === "manifestUnsigned") {
    return manifestExitCode.manifestUnsigned
  }

  if (state.kind === "signatureInvalid") {
    return manifestExitCode.signatureInvalid
  }

  if (state.kind === "noPublishedPosts") {
    return manifestExitCode.noPublishedPosts
  }

  const orphanCode =
    (state.orphanArticleTextFiles.length > 0
      ? manifestExitCode.articleTextOrphan
      : manifestExitCode.clean) |
    (state.corruptArchiveFiles.length > 0
      ? manifestExitCode.archiveCorrupt
      : manifestExitCode.clean)

  return state.drift.reduce<number>((code, entry) => {
    let next = code

    if (entry.state === "differing") {
      next |= manifestExitCode.differing
    }

    if (entry.state === "missingFromManifest") {
      next |= manifestExitCode.missingFromManifest
    }

    if (entry.state === "orphanInManifest") {
      next |= manifestExitCode.orphanInManifest
    }

    if (entry.articleText === "missing") {
      next |= manifestExitCode.articleTextMissing
    }

    if (entry.articleText === "stale") {
      next |= manifestExitCode.articleTextStale
    }

    if (entry.archive === "missing") {
      next |= manifestExitCode.archiveMissing
    }

    return next
  }, orphanCode)
}

export function manifestProcessExitCode(code: number): number {
  if (code === 0) {
    return 0
  }

  return code & 0xff || 1
}
