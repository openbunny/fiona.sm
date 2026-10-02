import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"

import { canary } from "@/lib/canary/canary"
import { proofOfDateCommands } from "@/lib/canary/proof-of-date"

function commandsUnder(page: Page, title: string): Locator {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    .getByRole("listitem")
}

function firstProofOfDateCommand(): string {
  const [request] = proofOfDateCommands(canary.moneroBlockHeight)
  if (request === undefined) {
    throw new Error("proofOfDateCommands returned nothing to assert against")
  }
  return request
}

function copyControlUnder(page: Page, title: string): Locator {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    .getByRole("button")
    .first()
}

const failureCaption =
  "copy statement failed. use the download link beside this button."

const MINIMUM_COPY_CONTROLS = 6

async function copyControlCountOf(page: Page): Promise<number> {
  const count = await page.getByRole("button", { name: /^copy/ }).count()
  expect(
    count,
    "the canary page rendered too few copy controls to be the page under test"
  ).toBeGreaterThanOrEqual(MINIMUM_COPY_CONTROLS)
  return count
}

test("copies the signed statement", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto("/canary")
  const button = page.getByRole("button", { name: "copy statement" })
  await button.click()
  await expect(button).toHaveText("copied")
  await expect(page.getByRole("status").first()).toHaveText("")
  await expect(button).toHaveText("copy")
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain("BEGIN PGP SIGNED MESSAGE")
})

test("never renames the copy control, in any state", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto("/canary")

  const button = copyControlUnder(page, "statement")
  const names: Array<string | null> = []

  names.push(await button.getAttribute("aria-label"))
  await button.click()
  await expect(button).toHaveText("copied")
  names.push(await button.getAttribute("aria-label"))
  await expect(button).toHaveText("copy")
  names.push(await button.getAttribute("aria-label"))

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error("Clipboard denied")),
      },
    })
  })
  await page.goto("/canary")
  const denied = copyControlUnder(page, "statement")
  await denied.click()
  await expect(page.getByRole("status").first()).toHaveText(failureCaption)
  names.push(await denied.getAttribute("aria-label"))

  expect(names).toEqual([
    "copy statement",
    "copy statement",
    "copy statement",
    "copy statement",
  ])
})

test("offers one copy field per verify command", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto("/canary")
  const commands = commandsUnder(page, "verify")
  await expect(commands).toHaveCount(5)

  await commands
    .first()
    .getByRole("button", {
      name: "copy command: curl -fsSO https://fiona.sm/fiona.asc",
    })
    .click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe("curl -fsSO https://fiona.sm/fiona.asc")
  expect(clip).not.toContain("$")
})

test("offers the proof-of-date request as one copyable command", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto("/canary")

  const request = firstProofOfDateCommand()

  const commands = commandsUnder(page, "proof of date")
  await expect(commands).toHaveCount(1)

  await commands
    .getByRole("button", { name: `copy command: ${request}` })
    .click()

  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe(request)
  expect(clip).toContain(String(canary.moneroBlockHeight))
  expect(clip).not.toContain("$")
})

test("confirms the copy visibly, and silently", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto("/canary")

  const button = page.getByRole("button", { name: "copy statement" })
  await expect(button).toHaveText("copy")

  await button.click()
  await expect(button).toHaveText("copied")
  await expect(button).toHaveAccessibleName("copy statement")
  await expect(page.getByRole("status")).toHaveCount(
    await copyControlCountOf(page)
  )
  await expect(page.getByRole("status").first()).toHaveText("")

  await expect(button).toHaveText("copy")
})

test("shows a useful fallback when clipboard access fails", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error("Clipboard denied")),
      },
    })
  })
  await page.goto("/canary")

  const statuses = page.getByRole("status")
  const silence = Array.from(
    { length: (await copyControlCountOf(page)) - 1 },
    () => ""
  )
  await expect(statuses).toHaveCount(silence.length + 1)
  await expect(statuses).toHaveText(["", ...silence])

  await page.getByRole("button", { name: "copy statement" }).click()

  await expect(page.getByRole("button", { name: "copy statement" })).toHaveText(
    "copy"
  )
  await expect(statuses.first()).toBeVisible()
  await expect(statuses).toHaveText([failureCaption, ...silence])
})
