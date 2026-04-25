import { test, expect, type Page } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'test-agency@hypeflow.dev'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'TestHype2026!'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL)
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/admin/dashboard', { timeout: 15_000 })
}

// sidebar nav links may also appear in page content — always use .first()
function sidebarLink(page: Page, href: string) {
  return page.locator(`a[href="${href}"]`).first()
}

// ─── T26: no auth ────────────────────────────────────────────────────────────

test('T26 unauthenticated access to /admin → redirect to /login', async ({ page }) => {
  await page.goto('/admin/dashboard')
  await page.waitForURL('**/login', { timeout: 10_000 })
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Acesso à Plataforma')).toBeVisible()
})

// ─── T01 ─────────────────────────────────────────────────────────────────────

test('T01 login page loads', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Acesso à Plataforma')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

// ─── T02 ─────────────────────────────────────────────────────────────────────

test('T02 login → /admin/dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL)
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/admin/dashboard', { timeout: 15_000 })
  await expect(page).toHaveURL(/admin\/dashboard/)
  // sidebar is present (at least one of its links is visible)
  await expect(sidebarLink(page, '/admin/dashboard')).toBeVisible()
})

// ─── T03–T25: authenticated navigation ───────────────────────────────────────

test.describe('Admin authenticated navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('T03 navigate to Contactos', async ({ page }) => {
    await sidebarLink(page, '/admin/contactos').click()
    await expect(page).toHaveURL(/\/admin\/contactos$/)
    await expect(page.getByRole('heading', { name: /Contactos/i })).toBeVisible()
  })

  test('T04 contact detail', async ({ page }) => {
    await page.goto('/admin/contactos')
    await page.locator('table tbody tr').first().click()
    await expect(page).toHaveURL(/\/admin\/contactos\/.+/)
  })

  test('T05 navigate to Pipeline', async ({ page }) => {
    await sidebarLink(page, '/admin/pipeline').click()
    await expect(page).toHaveURL(/\/admin\/pipeline/)
    await expect(
      page.getByText(/Nova|Qualificando|Agendada|Proposta|Fechada/).first()
    ).toBeVisible()
  })

  test('T06 navigate to Conversas', async ({ page }) => {
    await sidebarLink(page, '/admin/conversas').click()
    await expect(page).toHaveURL(/\/admin\/conversas/)
  })

  test('T07 navigate to Calendário', async ({ page }) => {
    await sidebarLink(page, '/admin/calendario').click()
    await expect(page).toHaveURL(/\/admin\/calendario/)
  })

  test('T08 navigate to Calls', async ({ page }) => {
    await sidebarLink(page, '/admin/calls').click()
    await expect(page).toHaveURL(/\/admin\/calls/)
  })

  test('T09 navigate to Marketing', async ({ page }) => {
    await sidebarLink(page, '/admin/marketing').click()
    await expect(page).toHaveURL(/\/admin\/marketing/)
  })

  test('T10 navigate to Automações', async ({ page }) => {
    await sidebarLink(page, '/admin/automacoes').click()
    await expect(page).toHaveURL(/\/admin\/automacoes/)
    await expect(page.locator('main').first()).toBeVisible()
  })

  // T11: the Disparos sub-nav link is inside the automacoes page (not in sidebar)
  test('T11 navigate to Disparos', async ({ page }) => {
    await page.goto('/admin/automacoes')
    // try sub-nav link by visible text first; fall back to direct navigation
    const disparosLink = page.getByRole('link', { name: /^Disparos$/i })
    if (await disparosLink.count() > 0) {
      await disparosLink.first().click()
    } else {
      await page.goto('/admin/automacoes/disparos')
    }
    await expect(page).toHaveURL(/\/admin\/automacoes\/disparos$/)
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T12 navigate to Sequências', async ({ page }) => {
    await page.goto('/admin/automacoes/disparos')
    await page.getByRole('button', { name: 'Sequências' }).click()
    await expect(page).toHaveURL(/\/admin\/automacoes\/disparos\/sequencias/)
  })

  test('T13 navigate to Playbooks', async ({ page }) => {
    await sidebarLink(page, '/admin/playbooks').click()
    await expect(page).toHaveURL(/\/admin\/playbooks/)
  })

  test('T14 navigate to Formulários', async ({ page }) => {
    await sidebarLink(page, '/admin/formularios').click()
    await expect(page).toHaveURL(/\/admin\/formularios/)
  })

  test('T15 navigate to Tráfego', async ({ page }) => {
    await sidebarLink(page, '/admin/trafego').click()
    await expect(page).toHaveURL(/\/admin\/trafego/)
  })

  test('T16 navigate to Pagamentos', async ({ page }) => {
    await sidebarLink(page, '/admin/pagamentos').click()
    await expect(page).toHaveURL(/\/admin\/pagamentos/)
  })

  test('T17 navigate to Reputação', async ({ page }) => {
    await sidebarLink(page, '/admin/reputacao').click()
    await expect(page).toHaveURL(/\/admin\/reputacao/)
  })

  test('T18 navigate to Clientes', async ({ page }) => {
    await sidebarLink(page, '/admin/clientes').click()
    await expect(page).toHaveURL(/\/admin\/clientes/)
  })

  test('T19 navigate to Parceiros', async ({ page }) => {
    await sidebarLink(page, '/admin/parceiros').click()
    await expect(page).toHaveURL(/\/admin\/parceiros/)
  })

  test('T20 navigate to Check-ins', async ({ page }) => {
    await sidebarLink(page, '/admin/equipa/check-ins').click()
    await expect(page).toHaveURL(/\/admin\/equipa\/check-ins/)
  })

  test('T21 navigate to Actividade', async ({ page }) => {
    await sidebarLink(page, '/admin/equipa/actividade').click()
    await expect(page).toHaveURL(/\/admin\/equipa\/actividade/)
  })

  test('T22 navigate to Gamificação', async ({ page }) => {
    await sidebarLink(page, '/admin/equipa/gamificacao').click()
    await expect(page).toHaveURL(/\/admin\/equipa\/gamificacao/)
  })

  test('T23 navigate to Config', async ({ page }) => {
    await sidebarLink(page, '/admin/config').click()
    await expect(page).toHaveURL(/\/admin\/config/)
  })

  test('T24 open and close Campfire panel', async ({ page }) => {
    // open
    await page.getByRole('button', { name: 'Campfire' }).click()
    // channels use "# geral" format (hash + space + name)
    await expect(page.getByText(/geral/)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/pipeline/).first()).toBeVisible()
    // close: find the X button inside the panel (icon-only button adjacent to panel title)
    const closeBtn = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .filter({ hasNot: page.locator('text=/Campfire|geral|pipeline/') })
      .last()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    } else {
      // fallback: re-click sidebar button to toggle
      await page.getByRole('button', { name: 'Campfire' }).click()
    }
    await expect(page.getByText(/# geral|#geral/)).not.toBeVisible({ timeout: 5_000 })
  })

  test('T25 logout → /login', async ({ page }) => {
    // user dropdown is the last button in the topbar
    await page.locator('header button').last().click()
    await page.getByRole('button', { name: /Terminar sessão/i }).click()
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─── T27: role isolation ──────────────────────────────────────────────────────

test('T27 agency user accessing /client → redirect to /admin/dashboard', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/client/dashboard')
  await page.waitForURL('**/admin/dashboard', { timeout: 10_000 })
  await expect(page).toHaveURL(/admin\/dashboard/)
  await expect(sidebarLink(page, '/admin/pipeline')).toBeVisible()
})
