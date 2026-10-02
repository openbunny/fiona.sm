import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"

import { Command } from "commander"
import { consola } from "consola"

import { canary } from "@/lib/canary/canary"
import { hashArticleText } from "@/lib/manifest/article-hash"
import {
  publishedDigestsFor,
  pruneUnpublishedRevisions,
} from "@/lib/manifest/archive-prune"
import { manifestEnforcementEnabled } from "@/lib/manifest/manifest-policy"
import { generateManifest } from "@/lib/manifest/manifest-generate"
import {
  articleTextArchiveDir,
  articleTextPath,
  archivedArticleTextPath,
  defaultArticleTextDir,
  defaultBuildOutputDir,
  defaultManifestPath,
  defaultPublicKeyPath,
} from "@/lib/manifest/manifest-paths"
import {
  manifestEntryForSlug,
  readManifestLookup,
} from "@/lib/manifest/manifest-lookup"
import { manifestProcessExitCode } from "@/lib/manifest/manifest-report"
import { runManifestGate } from "@/lib/manifest/manifest-run"
import { signManifest } from "@/lib/manifest/manifest-sign"

const log = consola.withTag("manifest")

const program = new Command()
  .name("manifest")
  .description(
    "Generate and verify the clearsigned manifest attesting to built post content"
  )

program
  .command("generate")
  .description(
    "Hash every published post's built article text, write the unsigned manifest, and publish each post's normalised text"
  )
  .option("--manifest <path>", "Manifest output path", defaultManifestPath())
  .option(
    "--build-output <dir>",
    "Directory of built blog pages",
    defaultBuildOutputDir()
  )
  .option(
    "--article-text-dir <dir>",
    "Directory to publish each post's normalised article text to, as <slug>.txt",
    defaultArticleTextDir()
  )
  .action(
    (options: {
      manifest: string
      buildOutput: string
      articleTextDir: string
    }) => {
      try {
        const previouslySigned = readManifestLookup(options.manifest)
        const signedDigestFor = (slug: string): string | undefined =>
          previouslySigned.kind === "present" && previouslySigned.signed
            ? manifestEntryForSlug(slug, previouslySigned)?.sha256
            : undefined

        const { manifestText, articleTexts } = generateManifest({
          fingerprint: canary.fingerprint,
          buildOutputDir: options.buildOutput,
        })
        writeFileSync(options.manifest, manifestText, "utf8")
        log.success(`Wrote unsigned manifest to ${options.manifest}`)

        mkdirSync(options.articleTextDir, { recursive: true })
        for (const { slug, text } of articleTexts) {
          const path = articleTextPath(options.articleTextDir, slug)
          writeFileSync(path, text, "utf8")
          log.success(`Wrote ${path}`)

          const digest = hashArticleText(text)
          mkdirSync(articleTextArchiveDir(options.articleTextDir, slug), {
            recursive: true,
          })
          const archived = archivedArticleTextPath(
            options.articleTextDir,
            slug,
            digest
          )
          if (existsSync(archived)) {
            log.info(`Kept ${archived}`)
          } else {
            writeFileSync(archived, text, "utf8")
            log.success(`Archived ${archived}`)
          }

          const dropped = pruneUnpublishedRevisions(
            options.articleTextDir,
            slug,
            publishedDigestsFor(signedDigestFor(slug), digest)
          )
          for (const stale of dropped) {
            log.info(
              `Dropped ${archivedArticleTextPath(options.articleTextDir, slug, stale)}: no signed manifest ever attested it`
            )
          }
        }

        log.info(
          "The manifest is not signed, and the build fails without a signature."
        )
        log.info("Sign it with `bun run manifest sign`, which regenerates and")
        log.info("clearsigns in one step and overwrites the manifest file.")
        log.info(
          "The article text files above are not signed directly; `bun run manifest verify`"
        )
        log.info(
          "checks each one against the signed manifest and against a fresh build."
        )
      } catch (error) {
        log.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    }
  )

program
  .command("sign")
  .description(
    "Generate the manifest and clearsign it with the OpenPGP card in one step"
  )
  .option("--manifest <path>", "Manifest output path", defaultManifestPath())
  .option(
    "--build-output <dir>",
    "Directory of built blog pages",
    defaultBuildOutputDir()
  )
  .option(
    "--public-key <path>",
    "Published public key armor to verify the signature against",
    defaultPublicKeyPath()
  )
  .option("--dry-run", "Print the unsigned manifest without signing")
  .action(
    async (options: {
      manifest: string
      buildOutput: string
      publicKey: string
      dryRun?: boolean
    }) => {
      try {
        const output = await signManifest({
          manifestPath: options.manifest,
          buildOutputDir: options.buildOutput,
          publicKeyPath: options.publicKey,
          dryRun: options.dryRun === true,
          logger: log,
        })
        process.stdout.write(output.endsWith("\n") ? output : `${output}\n`)
      } catch (error) {
        log.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    }
  )

program
  .command("verify")
  .description(
    "Recompute built article hashes and compare them against the manifest and the published .txt files"
  )
  .option("--manifest <path>", "Manifest path to verify", defaultManifestPath())
  .option(
    "--build-output <dir>",
    "Directory of built blog pages",
    defaultBuildOutputDir()
  )
  .option(
    "--article-text-dir <dir>",
    "Directory of each post's published normalised article text, as <slug>.txt",
    defaultArticleTextDir()
  )
  .option(
    "--public-key <path>",
    "PGP public key armor to verify against",
    defaultPublicKeyPath()
  )
  .option(
    "--enforce",
    "Exit non-zero on drift instead of only reporting it",
    manifestEnforcementEnabled
  )
  .option(
    "--no-enforce",
    "Report drift without failing the run, overriding manifestEnforcementEnabled"
  )
  .action(
    async (options: {
      manifest: string
      buildOutput: string
      articleTextDir: string
      publicKey: string
      enforce: boolean
    }) => {
      let result
      try {
        const publicKeyArmor = readFileSync(options.publicKey, "utf8")
        result = await runManifestGate({
          manifestPath: options.manifest,
          publicKeyArmor,
          expectedFingerprint: canary.fingerprint,
          buildOutputDir: options.buildOutput,
          articleTextDir: options.articleTextDir,
          enforced: options.enforce,
        })
      } catch (error) {
        log.error(error instanceof Error ? error.message : String(error))
        process.exit(64)
      }

      if (result.messages.length === 0) {
        log.success("Every published post matches the signed manifest.")
      }

      for (const message of result.messages) {
        if (result.enforced) {
          log.error(message)
        } else {
          log.warn(message)
        }
      }

      if (!result.enforced && result.messages.length > 0) {
        log.info(
          "Not enforced: this run reports drift without failing. Pass --enforce to fail on it."
        )
      }

      process.exit(manifestProcessExitCode(result.exitCode))
    }
  )

await program.parseAsync(process.argv)
