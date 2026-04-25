import { test, expect, type Page } from '@playwright/test'

// C2 (story 01.12) — workspace bootstrap hardening.
// Verifies user-visible behaviour: an authenticated agency user can navigate
// multiple admin pages without 500s after the bootstrapped flag is set, and
// anonymous users never reach bootstrap (middleware redirect from C1 still works).

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'test-agency@hypeflow.dev'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'TestHype2026!'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL)
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/admin/dashboard', { timeout: 15_000 })
}

test.describe('Bootstrap C2 — workspace hardening', () => {
  test('bootstrap: anonymous user → /admin/dashboard redirects to /login (no service-role writes)', async ({ page }) => {
    // Confirms C1 middleware still blocks anon before the bootstrap function runs.
    // After the C2 fix, ensureWorkspaceForCurrentUser would throw if reached anonymously,
    // but middleware should never let it get that far.
    const res = await page.goto('/admin/dashboard')
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
    expect(res?.status()).toBeLessThan(500)
  })

  test('bootstrap: authenticated agency user navigates multiple admin pages without 500', async ({ page }) => {
    await loginAsAdmin(page)

    // Visit dashboard (already there) → contactos → pipeline → trafego.
    // After bootstrap, all should render without 500. The bootstrapped flag
    // means subsequent navigations skip the service-role bootstrap path.
    const paths = ['/admin/contactos', '/admin/pipeline', '/admin/trafego']
    for (const path of paths) {
      const res = await page.goto(path)
      await page.waitForLoadState('domcontentloaded')
      expect(res?.status(), `expected non-5xx on ${path}`).toBeLessThan(500)
      expect(page.url(), `expected to stay within /admin on ${path}`).toContain(path)
    }
  })
})
