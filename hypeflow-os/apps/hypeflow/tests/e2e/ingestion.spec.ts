import { test, expect } from '@playwright/test'

// Story 03.1 / FDD lead-ingestion-hub-fdd.md — Evolution adapter end-to-end.
// Validates the user-visible behaviour of the webhook endpoint without needing
// the full admin login flow. Token isn't configured for the test client in
// this environment, so we exercise the auth + 200-silent paths that don't
// require a live token.

const NON_EXISTENT_CLIENT = '00000000-0000-0000-0000-000000000000'
const FAKE_VALID_PAYLOAD = {
  event: 'messages.upsert',
  instance: 'e2e-instance',
  data: {
    key: { remoteJid: '351900000000@s.whatsapp.net' },
    pushName: 'E2E Test',
    message: { conversation: 'e2e' },
    messageTimestamp: 1713801600,
  },
}

test.describe('Evolution webhook — story 03.1', () => {
  test('GET returns the active health check JSON', async ({ request }) => {
    const res = await request.get(`/api/webhooks/evolution/${NON_EXISTENT_CLIENT}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toContain('evolution')
  })

  test('POST without bearer token returns 401', async ({ request }) => {
    const res = await request.post(`/api/webhooks/evolution/${NON_EXISTENT_CLIENT}`, {
      data: FAKE_VALID_PAYLOAD,
    })
    expect(res.status()).toBe(401)
  })

  test('POST with wrong bearer token returns 401', async ({ request }) => {
    const res = await request.post(`/api/webhooks/evolution/${NON_EXISTENT_CLIENT}`, {
      data: FAKE_VALID_PAYLOAD,
      headers: { Authorization: 'Bearer not-the-real-token' },
    })
    expect(res.status()).toBe(401)
  })
})
