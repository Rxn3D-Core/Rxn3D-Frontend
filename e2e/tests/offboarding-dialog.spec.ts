import { test, expect, type Page } from "@playwright/test"

// RXN-51 / RXN-48: leave office / remove member dialog, against the mock API (e2e/mock/rxn-48-mock-api.mjs).
// Start the mock on the task's API port (8151) and the app with NEXT_PUBLIC_API_BASE_URL pointing at it.
const API = process.env.E2E_API_URL ?? "http://127.0.0.1:8151"

// The mock keeps one scenario at a time, so these tests must not run in parallel.
test.describe.configure({ mode: "serial", timeout: 90_000 }) // the first test pays the dev-server compile

type Scenario = { preview?: string; submit?: "ok" | "stale" | "last-admin" | "invalid" | "inactive" }

async function setScenario(page: Page, scenario: Scenario) {
  await page.request.post(`${API}/__mock/reset`)
  await page.request.post(`${API}/__mock/scenario`, { data: scenario })
}

async function recordedPosts(page: Page, { includeSessionCalls = false } = {}) {
  const all = (await (await page.request.get(`${API}/__mock/requests`)).json()) as Array<{
    method: string
    path: string
    body?: Record<string, unknown>
  }>
  return all.filter((r) => r.method === "POST" && (includeSessionCalls || r.path !== "/set-customer-id"))
}

async function signIn(page: Page, role: "office_admin" | "lab_admin", customer: { id: number; type: "office" | "lab" }) {
  await page.addInitScript(
    ({ role, customer }) => {
      const customers = [
        { id: 55, name: "Smile Dental", type: "office" },
        { id: 56, name: "Bright Smiles", type: "office" },
        { id: 7, name: "Precision Lab", type: "lab" },
      ]
      localStorage.setItem("token", "mock-token")
      localStorage.setItem("role", role)
      localStorage.setItem("customerId", String(customer.id))
      localStorage.setItem("customerType", customer.type)
      localStorage.setItem(
        "profilePermissions",
        JSON.stringify(["view_users", "view_user", "edit_user", "delete_user", "create_user"]),
      )
      localStorage.setItem(
        "user",
        JSON.stringify({ id: 1, first_name: "Olivia", last_name: "Admin", email: "olivia@example.test", roles: [role], customers }),
      )
      localStorage.setItem("i18nextLng", "en")
    },
    { role, customer },
  )
}

async function openRemoveDialog(page: Page, userId = 812) {
  await signIn(page, "office_admin", { id: 55, type: "office" })
  await page.goto("/office-administrator/user-management")
  await page.getByTestId(`user-offboard-${userId}`).click()
  await expect(page.getByTestId("offboarding-dialog")).toBeVisible()
}

async function expectNoHorizontalOverflow(page: Page) {
  const dialog = page.getByTestId("offboarding-dialog")
  const box = await dialog.boundingBox()
  const viewport = page.viewportSize()!
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 0.5)
  const overflow = await dialog.evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

for (const width of [375, 768, 1280]) {
  test.describe(`offboarding dialog @ ${width}px`, () => {
    test.use({ viewport: { width, height: width === 375 ? 740 : 900 } })

    test("admin removes a doctor with one doctor for all cases", async ({ page }) => {
      await setScenario(page, { preview: "open-cases" })
      await openRemoveDialog(page)

      await expect(page.getByTestId("offboarding-title")).toContainText("Remove Ana Ruiz from Smile Dental")
      await expect(page.getByTestId("offboarding-case-9001")).toContainText("C01234")
      await expect(page.getByTestId("offboarding-case-9001")).toContainText("S0002")
      await expect(page.getByTestId("offboarding-staying")).toContainText("automatic case note")
      await expect(page.getByTestId("offboarding-staying-9002")).toContainText("Late stage")
      await expect(page.getByTestId("offboarding-closed-count")).toContainText("14")
      await expect(page.getByTestId("offboarding-confirm")).toBeDisabled()
      await expectNoHorizontalOverflow(page)

      await page.getByTestId("offboarding-default-target").selectOption({ label: "Ben Ortiz" })
      await page.getByTestId("offboarding-reason").fill("Moved to another practice")
      const confirm = page.getByTestId("offboarding-confirm")
      await expect(confirm).toBeEnabled()
      await confirm.scrollIntoViewIfNeeded()
      await expect(confirm).toBeInViewport()
      await confirm.click()

      await expect(page.getByTestId("offboarding-dialog")).toBeHidden()
      const [post] = await recordedPosts(page)
      expect(post.path).toBe("/customers/55/users/812/offboard")
      expect(post.body).toEqual({ default_target_doctor_id: 813, reason: "Moved to another practice" })
    })

    test("per-case override sends only the differing case", async ({ page }) => {
      await setScenario(page, { preview: "open-cases" })
      await openRemoveDialog(page)

      await page.getByTestId("offboarding-default-target").selectOption({ label: "Ben Ortiz" })
      await page.getByTestId("offboarding-case-target-9003").selectOption({ label: "Carla Mendes" })
      await page.getByTestId("offboarding-confirm").click()
      await expect(page.getByTestId("offboarding-dialog")).toBeHidden()

      const [post] = await recordedPosts(page)
      expect(post.body).toEqual({ default_target_doctor_id: 813, transfers: [{ case_id: 9003, target_doctor_id: 814 }] })
    })

    test("every case can get its own doctor without a default", async ({ page }) => {
      await setScenario(page, { preview: "open-cases" })
      await openRemoveDialog(page)

      for (const id of [9001, 9003, 9004]) {
        await page.getByTestId(`offboarding-case-target-${id}`).selectOption({ label: "Carla Mendes" })
      }
      await page.getByTestId("offboarding-confirm").click()
      await expect(page.getByTestId("offboarding-dialog")).toBeHidden()
      const [post] = await recordedPosts(page)
      expect(post.body).toEqual({
        transfers: [
          { case_id: 9001, target_doctor_id: 814 },
          { case_id: 9003, target_doctor_id: 814 },
          { case_id: 9004, target_doctor_id: 814 },
        ],
      })
    })

    test("no open cases goes straight to the confirmation", async ({ page }) => {
      await setScenario(page, { preview: "no-open-cases" })
      await openRemoveDialog(page)

      await expect(page.getByTestId("offboarding-no-open-cases")).toBeVisible()
      await expect(page.getByTestId("offboarding-transfer")).toHaveCount(0)
      await page.getByTestId("offboarding-confirm").click()
      await expect(page.getByTestId("offboarding-dialog")).toBeHidden()
      const [post] = await recordedPosts(page)
      expect(post.body).toEqual({})
    })

    test("last admin is blocked with a clear message", async ({ page }) => {
      await setScenario(page, { preview: "last-admin" })
      await openRemoveDialog(page)

      await expect(page.getByTestId("offboarding-blocker-last_admin")).toContainText("last admin of Smile Dental")
      await expect(page.getByTestId("offboarding-confirm")).toBeDisabled()
    })

    test("no other doctor says to invite a doctor first, with no invite action and no admin fallback", async ({ page }) => {
      await setScenario(page, { preview: "no-target" })
      await openRemoveDialog(page)

      await expect(page.getByTestId("offboarding-blocker-no_eligible_target")).toContainText("Invite a doctor first")
      await expect(page.getByTestId("offboarding-confirm")).toBeDisabled()
      await expect(page.getByTestId("offboarding-transfer")).toHaveCount(0)
      await expect(page.getByTestId("offboarding-dialog").getByRole("button", { name: /invite/i })).toHaveCount(0)
    })

    test("stale list (409) refreshes the cases and keeps the dialog open", async ({ page }) => {
      await setScenario(page, { preview: "open-cases", submit: "stale" })
      await openRemoveDialog(page)

      await page.getByTestId("offboarding-default-target").selectOption({ label: "Ben Ortiz" })
      await page.getByTestId("offboarding-confirm").click()

      await expect(page.getByTestId("offboarding-form-error")).toContainText("The open cases changed")
      await expect(page.getByTestId("offboarding-case-9004")).toHaveCount(0)
      await expect(page.getByTestId("offboarding-case-9001")).toBeVisible()
    })

    test("invalid doctor (422) shows an inline error on the picker", async ({ page }) => {
      await setScenario(page, { preview: "open-cases", submit: "invalid" })
      await openRemoveDialog(page)

      await page.getByTestId("offboarding-default-target").selectOption({ label: "Ben Ortiz" })
      await page.getByTestId("offboarding-confirm").click()

      await expect(page.getByTestId("offboarding-default-error")).toContainText("Choose an active doctor")
      await expect(page.getByTestId("offboarding-dialog")).toBeVisible()
    })

    test("the Offboarded option in the status list opens the dialog", async ({ page }) => {
      await setScenario(page, { preview: "no-open-cases" })
      await signIn(page, "office_admin", { id: 55, type: "office" })
      await page.goto("/office-administrator/user-management")
      await page.locator('[data-status-dropdown="813"]').click()
      await page.getByText("Offboarded", { exact: true }).click()
      await expect(page.getByTestId("offboarding-dialog")).toBeVisible()
      await expect(page.getByTestId("offboarding-title")).toContainText("Remove Ben Ortiz")
    })

    test("a 403 membership_inactive sends the user to profile selection", async ({ page }) => {
      await setScenario(page, { preview: "no-open-cases", submit: "inactive" })
      await openRemoveDialog(page)
      await page.getByTestId("offboarding-confirm").click()
      // Which keys are cleared is covered by the unit tests (the mock permissions call would re-set customerId).
      await page.waitForURL("**/multiple-location")
    })

    test("a doctor leaves from the profile modal, then switches to another office", async ({ page }) => {
      await setScenario(page, { preview: "open-cases" })
      await signIn(page, "office_admin", { id: 55, type: "office" })
      await page.goto("/office-administrator/user-management")
      await page.getByTestId("header-user-menu").click()
      await page.getByRole("menuitem", { name: "Profile" }).click()
      await page.getByTestId("profile-leave-55").click()

      await expect(page.getByTestId("offboarding-title")).toContainText("Leave Smile Dental")
      await page.getByTestId("offboarding-default-target").selectOption({ label: "Ben Ortiz" })
      await page.getByTestId("offboarding-confirm").click()

      await expect
        .poll(async () => (await recordedPosts(page, { includeSessionCalls: true })).map((r) => r.path))
        .toContain("/me/customers/55/leave")
      // The app first syncs the current office (55); after leaving it must switch to the other one (56).
      await expect
        .poll(async () => (await recordedPosts(page, { includeSessionCalls: true })).filter((r) => r.path === "/set-customer-id").map((r) => r.body?.customer_id))
        .toContain(56)
      const leave = (await recordedPosts(page)).find((r) => r.path === "/me/customers/55/leave")
      expect(leave?.body).toEqual({ default_target_doctor_id: 813 })
    })

    test("lab staff removal has no transfer step", async ({ page }) => {
      await setScenario(page, { preview: "lab-member" })
      await signIn(page, "lab_admin", { id: 7, type: "lab" })
      await page.goto("/lab-administrator/staff-management")
      await page.getByTitle("Mark as Offboarded").first().click()
      await expect(page.getByTestId("offboarding-dialog")).toBeVisible()
      await expect(page.getByTestId("offboarding-transfer")).toHaveCount(0)
      await expect(page.getByTestId("offboarding-no-open-cases")).toHaveCount(0)
      await expect(page.getByTestId("offboarding-confirm")).toBeEnabled()
    })
  })
}
