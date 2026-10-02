import { Command, InvalidArgumentError } from "commander"
import { consola } from "consola"

import { renewCanary } from "@/lib/renew/canary-renew"
import { maxRenewDays, parseRenewDays } from "@/lib/renew/renew-days"

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function parseDays(value: string): number {
  try {
    return parseRenewDays(value)
  } catch (error) {
    throw new InvalidArgumentError(toErrorMessage(error))
  }
}

const log = consola.withTag("canary")

const program = new Command()
  .name("canary")
  .description("Renew the OpenPGP key canary using a YubiKey")

program
  .command("renew")
  .description("Clearsign a new statement with the OpenPGP card (PIN + touch)")
  .option(
    "--days <n>",
    `Days until renew-by (1-${maxRenewDays})`,
    parseDays,
    90
  )
  .option("--dry-run", "Print plaintext without signing")
  .option("--rotate", "Allow a signing key whose fingerprint differs")
  .action(
    async (options: { days: number; dryRun?: boolean; rotate?: boolean }) => {
      try {
        const output = await renewCanary({
          days: options.days,
          dryRun: options.dryRun === true,
          rotate: options.rotate === true,
          logger: log,
        })
        process.stdout.write(output.endsWith("\n") ? output : `${output}\n`)
      } catch (error) {
        log.error(toErrorMessage(error))
        process.exit(1)
      }
    }
  )

await program.parseAsync(process.argv)
