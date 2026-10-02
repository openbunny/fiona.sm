import {
  evaluateManifestGate,
  type ManifestGateOptions,
} from "@/lib/manifest/manifest-gate"
import {
  manifestExitCode,
  manifestStateExitCode,
  manifestStateMessages,
} from "@/lib/manifest/manifest-report"

export type ManifestRunOptions = ManifestGateOptions & {
  readonly enforced: boolean
}

export type ManifestRunResult = {
  readonly exitCode: number
  readonly messages: readonly string[]
  readonly enforced: boolean
}

export async function runManifestGate(
  options: ManifestRunOptions
): Promise<ManifestRunResult> {
  const state = await evaluateManifestGate(options)
  const messages = manifestStateMessages(state)

  if (!options.enforced) {
    return { exitCode: manifestExitCode.clean, messages, enforced: false }
  }

  return { exitCode: manifestStateExitCode(state), messages, enforced: true }
}
