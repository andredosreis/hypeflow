import { test, expect } from '@playwright/test'

// Story 03.2 / FDD lead-ingestion-hub-fdd.md — Tally adapter end-to-end.
// Validates the user-visible behaviour of the webhook endpoint without needing
// the full admin login flow. Signing secret isn't configured for the test
// client in this environment, so we exercise the auth + 200-silent paths that
// don't require a live secret.

const NON_EXISTENT_CLIENT = '00000000-0000-0000-0000-000000000000'
const FAKE_VALID_PAYLOAD = {
  eventId: 'evt-e2e',
  eventType: 'FORM_RESPONSE',
  createdAt: '2026-04-28T10:00:00.000Z',
  data: {
    responseId: 'resp-e2e',
    formId: 'form-e2e',
    formName: 'E2E test form',
    createdAt: '2026-04-28T10:00:00.000Z',
    fields: [
      { key: 'q1', label: 'Email', type: 'INPUT_EMAIL', value: 'e2e@example.com' },
    ],
  },
}

test.describe('Tally webhook — story 03.2', () => {
  test('GET returns the active health check JSON', async ({ request }) => {
    const res = await request.get(`/api/webhooks/tally/${NON_EXISTENT_CLIENT}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toContain('tally')
  })

  test('POST without Tally-Signature header returns 401', async ({ request }) => {
    const res = await request.post(`/api/webhooks/tally/${NON_EXISTENT_CLIENT}`, {
      data: FAKE_VALID_PAYLOAD,
    })
    expect(res.status()).toBe(401)
  })

  test('POST with invalid Tally-Signature returns 401', async ({ request }) => {
    const res = await request.post(`/api/webhooks/tally/${NON_EXISTENT_CLIENT}`, {
      data: FAKE_VALID_PAYLOAD,
      headers: { 'Tally-Signature': 'not-a-real-base64-signature' },
    })
    expect(res.status()).toBe(401)
  })
})
