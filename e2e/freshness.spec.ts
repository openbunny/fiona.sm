import { expect, test } from "@playwright/test"

import { canary } from "@/lib/canary/canary"
import { addIsoDays, formatLongDate, formatLongDateTime } from "@/lib/iso-date"

const noonUtc = "T12:00:00Z"
const afterRenewBy = new Date(`${addIsoDays(canary.renewBy, 1)}${noonUtc}`)
const beforeRenewBy = new Date(`${addIsoDays(canary.renewBy, -1)}${noonUtc}`)
const beforeSignedOn = new Date(`${addIsoDays(canary.signedOn, -1)}${noonUtc}`)
const staticSentence = `this statement must be replaced by ${formatLongDate(
  canary.renewBy
)}. compare that date with today.`
const futureSentence = `${staticSentence} this statement was signed on ${formatLongDate(
  canary.signedOn
)}, a date the device clock places in the future. the device clock is therefore wrong; compare the dates against an independent clock.`

test("raises an alert once the visitor clock passes renew-by", async ({
  page,
}) => {
  await page.clock.setFixedTime(afterRenewBy)
  await page.goto("/canary")

  const alert = page.getByRole("main").getByRole("alert")
  await expect(alert).toHaveCount(1)
  await expect(alert).toBeVisible()
  await expect(alert).toContainText(/expired|out of date/i)
  await expect(alert).toContainText(formatLongDate(canary.renewBy))
  await expect(alert).toContainText("says nothing about today")
  await expect(page.locator("[data-clock]")).toHaveCount(0)
})

test("explains a visitor clock that predates the signing date", async ({
  page,
}) => {
  await page.clock.setFixedTime(beforeSignedOn)
  await page.goto("/canary")

  const status = page.locator("[data-clock]")
  await expect(status).toHaveAttribute("data-clock", "visitor")
  await expect(status).toHaveText(futureSentence)
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0)
})

test("reads the visitor clock and raises no alert while the canary is current", async ({
  page,
}) => {
  await page.clock.setFixedTime(beforeRenewBy)
  await page.goto("/canary")

  const status = page.locator("[data-clock]")
  await expect(status).toHaveAttribute("data-clock", "visitor")
  await expect(status).toHaveText(staticSentence)
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0)
  await expect(
    page.locator(`time[datetime='${canary.renewBy}']`).first()
  ).toHaveText(formatLongDate(canary.renewBy))
  await expect(
    page.locator(`time[datetime='${canary.signedAt}']`).first()
  ).toHaveText(formatLongDateTime(canary.signedAt))
})

test("raises an alert when an open page crosses the renew-by boundary", async ({
  page,
}) => {
  await page.clock.install({
    time: new Date(`${canary.renewBy}T23:30:00Z`),
  })
  await page.goto("/canary")

  await expect(page.locator("[data-clock]")).toHaveAttribute(
    "data-clock",
    "visitor"
  )
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0)

  await page.clock.fastForward("01:00:00")

  await expect(page.getByRole("main").getByRole("alert")).toBeVisible()
})

test.describe("with javascript off", () => {
  test.use({ javaScriptEnabled: false })

  test("still warns the reader to compare the renew-by date", async ({
    page,
  }) => {
    await page.goto("/canary")

    const status = page.locator("[data-clock]")
    await expect(status).toHaveAttribute("data-clock", "static")
    await expect(status).toHaveText(staticSentence)
  })

  test("states the renew-by date in the register the alert uses", async ({
    page,
  }) => {
    await page.goto("/canary")

    const notice = page.getByText(/with today directly/)
    await expect(notice).toBeVisible()
    await expect(notice).toContainText(formatLongDate(canary.renewBy))
    await expect(notice).toContainText("says nothing about today")
    await expect(notice).not.toContainText("expired")
  })
})
