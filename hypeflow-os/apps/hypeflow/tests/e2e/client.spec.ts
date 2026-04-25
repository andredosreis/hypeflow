import { test, expect, type Page } from '@playwright/test'

const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL ?? 'test-client@hypeflow.dev'
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD ?? 'TestHype2026!'

async function loginAsClient(page: Page) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(CLIENT_EMAIL)
  await page.locator('input[type="password"]').fill(CLIENT_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/client/dashboard', { timeout: 15_000 })
}

// sidebar nav links may also appear in page content — always use .first()
function sidebarLink(page: Page, href: string) {
  return page.locator(`a[href="${href}"]`).first()
}

// ─── T01 ─────────────────────────────────────────────────────────────────────

test('T01 client dashboard loads after login', async ({ page }) => {
  await loginAsClient(page)
  await expect(page).toHaveURL(/\/client\/dashboard/)
  await expect(sidebarLink(page, '/client/roi')).toBeVisible()
  await expect(page.locator('main').first()).toBeVisible()
})

// ─── T02–T06: authenticated navigation ───────────────────────────────────────

test.describe('Client authenticated navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page)
  })

  test('T02 navigate to ROI & Métricas', async ({ page }) => {
    await sidebarLink(page, '/client/roi').click()
    await expect(page).toHaveURL(/\/client\/roi/)
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T03 navigate to As Minhas Leads', async ({ page }) => {
    await sidebarLink(page, '/client/leads').click()
    await expect(page).toHaveURL(/\/client\/leads/)
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T04 navigate to Calls', async ({ page }) => {
    await sidebarLink(page, '/client/calls').click()
    await expect(page).toHaveURL(/\/client\/calls/)
  })

  test('T05 navigate to Pipeline', async ({ page }) => {
    await sidebarLink(page, '/client/pipeline').click()
    await expect(page).toHaveURL(/\/client\/pipeline/)
  })

  test('T06 logout from client area → /login', async ({ page }) => {
    await page.getByRole('button', { name: /Sair/i }).click()
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('Acesso à Plataforma')).toBeVisible()
  })
})

// ─── T07: role isolation ──────────────────────────────────────────────────────

test('T07 client user accessing /admin → redirect to /client/dashboard', async ({ page }) => {
  await loginAsClient(page)
  await page.goto('/admin/dashboard')
  await page.waitForURL('**/client/dashboard', { timeout: 10_000 })
  await expect(page).toHaveURL(/\/client\/dashboard/)
  await expect(sidebarLink(page, '/client/roi')).toBeVisible()
})
