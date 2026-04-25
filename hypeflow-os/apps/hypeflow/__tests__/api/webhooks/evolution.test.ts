import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

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

import { POST } from '@/app/api/webhooks/evolution/[client_id]/route'
import { NextRequest } from 'next/server'

const TEST_CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const TEST_AGENCY_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TOKEN = 'test-evolution-token-123456'

function makeRequest(body: unknown, opts: { token?: string } = {}) {
  const bodyStr = JSON.stringify(body)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Content-Length': String(bodyStr.length),
  }
  if (opts.token !== undefined) headers.Authorization = `Bearer ${opts.token}`
  return new NextRequest(`http://localhost/api/webhooks/evolution/${TEST_CLIENT_ID}`, {
    method: 'POST',
    headers,
    body: bodyStr,
  })
}

const VALID_PAYLOAD = {
  event: 'messages.upsert',
  instance: 'agencia-test',
  data: {
    key: { remoteJid: '351912345678@s.whatsapp.net' },
    pushName: 'João Silva',
    message: { conversation: 'olá' },
    messageTimestamp: 1713801600,
  },
}

beforeEach(() => {
  process.env[`EVOLUTION_TOKEN_${TEST_CLIENT_ID.toUpperCase().replace(/-/g, '_')}`] = TOKEN
  clientLookup.mockResolvedValue({ data: { id: TEST_CLIENT_ID, agency_id: TEST_AGENCY_ID } })
  findDuplicateMock.mockResolvedValue({ kind: 'none' })
  persistLeadMock.mockResolvedValue({ kind: 'created', leadId: 'new-lead-1' })
  rateLimitMock.mockResolvedValue({ allowed: true })
})

afterEach(() => {
  vi.clearAllMocks()
  delete process.env[`EVOLUTION_TOKEN_${TEST_CLIENT_ID.toUpperCase().replace(/-/g, '_')}`]
})

describe('POST /api/webhooks/evolution/[client_id]', () => {
  it('returns 401 when the bearer token is missing', async () => {
    const res = await POST(makeRequest(VALID_PAYLOAD), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 when the bearer token is wrong', async () => {
    const res = await POST(makeRequest(VALID_PAYLOAD, { token: 'wrong' }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 silently when the client_id does not exist (no leak)', async () => {
    clientLookup.mockResolvedValueOnce({ data: null })
    const res = await POST(makeRequest(VALID_PAYLOAD, { token: TOKEN }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(200)
    expect(persistLeadMock).not.toHaveBeenCalled()
  })

  it('returns 429 when rate-limit is exceeded', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: false, retryAfter: 30, scope: 'agency' })
    const res = await POST(makeRequest(VALID_PAYLOAD, { token: TOKEN }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('30')
  })

  it('returns 200 + persists when payload is valid', async () => {
    const res = await POST(makeRequest(VALID_PAYLOAD, { token: TOKEN }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.event_id).toMatch(/^sha256:/)
    expect(persistLeadMock).toHaveBeenCalledTimes(1)
    expect(persistLeadMock.mock.calls[0]?.[2]).toBe(TEST_AGENCY_ID)
  })

  it('returns 200 idempotent when dedup finds the same event_id', async () => {
    findDuplicateMock.mockResolvedValueOnce({ kind: 'event_id', leadId: 'existing-1' })
    persistLeadMock.mockResolvedValueOnce({ kind: 'idempotent', leadId: 'existing-1' })
    const res = await POST(makeRequest(VALID_PAYLOAD, { token: TOKEN }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(200)
  })

  it('returns 200 + dead-letter when adapter parse throws (schema invalid)', async () => {
    // Adapter throws on a payload missing event field.
    const res = await POST(
      makeRequest({ data: { key: { remoteJid: '123@s.whatsapp.net' } } }, { token: TOKEN }),
      { params: Promise.resolve({ client_id: TEST_CLIENT_ID }) },
    )
    expect(res.status).toBe(200)
    expect(insertWebhookFailure).toHaveBeenCalled()
    const insertedRow = insertWebhookFailure.mock.calls[0]?.[0]
    expect(insertedRow.reason).toBe('schema_invalid')
    expect(persistLeadMock).not.toHaveBeenCalled()
  })

  it('returns 200 silently for unhandled events (e.g. messages.update)', async () => {
    const res = await POST(
      makeRequest({ event: 'messages.update', data: {} }, { token: TOKEN }),
      { params: Promise.resolve({ client_id: TEST_CLIENT_ID }) },
    )
    expect(res.status).toBe(200)
    expect(persistLeadMock).not.toHaveBeenCalled()
    expect(insertWebhookFailure).not.toHaveBeenCalled()
  })

  it('returns 503 + dead-letter when persist throws (DB unavailable)', async () => {
    persistLeadMock.mockRejectedValueOnce(new Error('connection pool exhausted'))
    const res = await POST(makeRequest(VALID_PAYLOAD, { token: TOKEN }), {
      params: Promise.resolve({ client_id: TEST_CLIENT_ID }),
    })
    expect(res.status).toBe(503)
    expect(res.headers.get('retry-after')).toBe('30')
    expect(insertWebhookFailure).toHaveBeenCalled()
    const insertedRow = insertWebhookFailure.mock.calls[0]?.[0]
    expect(insertedRow.reason).toBe('db_unavailable')
  })
})
