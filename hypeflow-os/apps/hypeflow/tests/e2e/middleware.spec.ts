import { test, expect } from '@playwright/test'

// C1 (story 01.11) — middleware try/catch + explicit preview gate.
// These tests run against a real local dev server (see playwright.config.ts → webServer).
// They verify the user-visible behaviour of the C1 fixes; unit-level branches (throw → redirect)
// are covered in __tests__/lib/supabase/middleware.test.ts.

test.describe('Middleware C1 — auth gate behaviour', () => {
  test('middleware: anonymous → /admin/* redirects to /login', async ({ page }) => {
    const res = await page.goto('/admin/dashboard')
    // Either the response is a redirect already followed by Playwright,
    // or the final URL is /login — both are acceptable.
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
    expect(res?.status()).toBeLessThan(500)
  })

  test('middleware: anonymous → /client/* redirects to /login', async ({ page }) => {
    await page.goto('/client/dashboard')
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('middleware: /login query params survive the redirect handler', async ({ page }) => {
    // Simulate the user landing on /login with the C1 error query param.
    // Even without backend-triggered redirect we can verify the page renders
    // and exposes the param to the URL (no 500, no strip).
    await page.goto('/login?error=session')
    await expect(page).toHaveURL(/error=session/)
    await expect(page.getByText('Acesso à Plataforma')).toBeVisible()
  })

  test('middleware: /login?status=account-disabled renders without 500', async ({ page }) => {
    // Verifies the new query param introduced by C1 (inactive-user routing fix)
    // is accepted by the /login page handler.
    const res = await page.goto('/login?status=account-disabled')
    expect(res?.status()).toBeLessThan(500)
    await expect(page).toHaveURL(/status=account-disabled/)
    await expect(page.getByText('Acesso à Plataforma')).toBeVisible()
  })
})
