import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'

// vi.hoisted lets us share mock fns between vi.mock() factories (which run
// before any module-level code) and the test body.
const mocks = vi.hoisted(() => ({
  clientLookup: vi.fn(),
  insertWebhookFailure: vi.fn(),
  findDuplicateMock: vi.fn(),
  persistLeadMock: vi.fn(),
  rateLimitMock: vi.fn(),
}))
const { clientLookup, insertWebhookFailure, findDuplicateMock, persistLeadMock, rateLimitMock } = mocks

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === 'clients') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mocks.clientLookup }),
          }),
        }
      }
      if (table === 'webhook_failures') {
        return { insert: mocks.insertWebhookFailure }
      }
      throw new Error(`unexpected service table in test: ${table}`)
    },
  })),
}))

vi.mock('@/lib/ingestion/dedup', () => ({ findDuplicate: mocks.findDuplicateMock }))
vi.mock('@/lib/ingestion/persist', () => ({ persistLead: mocks.persistLeadMock }))
vi.mock('@/lib/ingestion/rate-limit', () => ({ enforceWebhookRateLimit: mocks.rateLimitMock }))
vi.mock('@/lib/api/with-session', () => ({
  getClientIp: () => '127.0.0.1',
  requireSession: vi.fn(),
}))

import { POST } from '@/app/api/webhooks/tally/[client_id]/route'
import { NextRequest } from 'next/server'

const TEST_CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const TEST_AGENCY_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const SECRET = 'tally_signing_secret_super_random_value'

function tallySig(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('base64')
}

function makeRequest(body: unknown, opts: { secret?: string; signature?: string } = {}) {
  const bodyStr = JSON.stringify(body)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Content-Length': String(bodyStr.length),
  }
  if (opts.signature !== undefined) {
    headers['Tally-Signature'] = opts.signature
  } else if (opts.secret !== undefined) {
    headers['Tally-Signature'] = tallySig(opts.secret, bodyStr)
  }
  return new NextRequest(`http://localhost/api/webhooks/tally/${TEST_CLIENT_ID}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })
}

const VALID_PAYLOAD = {
  eventId: 'evt-abc',
  eventType: 'FORM_RESPONSE',
  createdAt: '2026-04-28T10:00:00.000Z',
  data: {
    responseId: 'resp-abc',
    formId: 'form-1',
    formName: 'Lead form',
    createdAt: '2026-04-28T10:00:00.000Z',
    fields: [
      { key: 'q1', label: 'Email', type: 'INPUT_EMAIL', value: 'jane@example.com' },
      { key: 'q2', label: 'Phone', type: 'INPUT_PHONE_NUMBER', value: '+351912345678' },
      { key: 'q3', label: 'Name', type: 'INPUT_TEXT', value: 'Jane Doe' },
    ],
  },
}

beforeEach(() => {
  process.env[`TALLY_SIGNING_SECRET_${TEST_CLIENT_ID.toUpperCase().replace(/-/g, '_')}`] = SECRET
  clientLookup.mockResolvedValue({ data: { id: TEST_CLIENT_ID, agency_id: TEST_AGENCY_ID } })
  findDuplicateMock.mockResolvedValue({ kind: 'none' })
  persistLeadMock.mockResolvedValue({ kind: 'created', leadId: 'new-lead-1' })
  rateLimitMock.mockResolvedValue({ allowed: true })
})

afterEach(() => {
  vi.clearAllMocks()
  delete process.env[`TALLY_SIGNING_SECRET_${TEST_CLIENT_ID.toUpperCase().replace(/-/g, '_')}`]
})

describe('POST /api/webhooks/tally/[client_id]', () => {
  it('returns 401 when Tally-Signature header is missing', async () => {
    const res = await POST(makeRequest(VALID_PAYLOAD), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 when signature is computed with the wrong secret', async () => {
    const res = await POST(makeRequest(VALID_PAYLOAD, { secret: 'not-the-real-secret' }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 when signature has wrong length', async () => {
    const res = await POST(makeRequest(VALID_PAYLOAD, { signature: 'too-short' }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 silently when client_id does not exist (no leak)', async () => {
    clientLookup.mockResolvedValueOnce({ data: null })
    const res = await POST(makeRequest(VALID_PAYLOAD, { secret: SECRET }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(200)
    expect(persistLeadMock).not.toHaveBeenCalled()
  })

  it('returns 429 when rate-limit is exceeded', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: false, retryAfter: 30, scope: 'agency' })
    const res = await POST(makeRequest(VALID_PAYLOAD, { secret: SECRET }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('30')
  })

  it('returns 200 + persists when payload is valid', async () => {
    const res = await POST(makeRequest(VALID_PAYLOAD, { secret: SECRET }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.event_id).toBe('tally:resp-abc')
    expect(persistLeadMock).toHaveBeenCalledTimes(1)
    expect(persistLeadMock.mock.calls[0]?.[2]).toBe(TEST_AGENCY_ID)
  })

  it('returns 200 idempotent when dedup finds the same event_id', async () => {
    findDuplicateMock.mockResolvedValueOnce({ kind: 'event_id', leadId: 'existing-1' })
    persistLeadMock.mockResolvedValueOnce({ kind: 'idempotent', leadId: 'existing-1' })
    const res = await POST(makeRequest(VALID_PAYLOAD, { secret: SECRET }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(200)
  })

  it('returns 200 + dead-letter when adapter throws (no contact info)', async () => {
    const noContactPayload = {
      ...VALID_PAYLOAD,
      data: {
        ...VALID_PAYLOAD.data,
        fields: [{ key: 'q1', label: 'Rating', type: 'INPUT_NUMBER', value: 5 }],
      },
    }
    const res = await POST(makeRequest(noContactPayload, { secret: SECRET }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(200)
    expect(insertWebhookFailure).toHaveBeenCalled()
    const insertedRow = insertWebhookFailure.mock.calls[0]?.[0]
    expect(insertedRow.reason).toBe('schema_invalid')
    expect(persistLeadMock).not.toHaveBeenCalled()
  })

  it('returns 200 silently for unhandled event types (e.g. FORM_VIEW)', async () => {
    const res = await POST(
      makeRequest({ eventType: 'FORM_VIEW', data: { fields: [] } }, { secret: SECRET }),
      { params: Promise.resolve({ client_id: TEST_CLIENT_ID }) },
    )
    expect(res.status).toBe(200)
    expect(persistLeadMock).not.toHaveBeenCalled()
    expect(insertWebhookFailure).not.toHaveBeenCalled()
  })

  it('returns 503 + dead-letter when persist throws (DB unavailable)', async () => {
    persistLeadMock.mockRejectedValueOnce(new Error('connection pool exhausted'))
    const res = await POST(makeRequest(VALID_PAYLOAD, { secret: SECRET }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(503)
    expect(res.headers.get('retry-after')).toBe('30')
    expect(insertWebhookFailure).toHaveBeenCalled()
    const insertedRow = insertWebhookFailure.mock.calls[0]?.[0]
    expect(insertedRow.reason).toBe('db_unavailable')
  })
})
