import { vi, describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/api/with-session', () => ({
  requireSession: vi.fn(),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, retryAfter: 0 }),
}))

import { POST } from '@/app/api/ai/automation/route'
import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/api/with-session'
import { server } from '@/src/mocks/server'

const mockUser = { id: 'user-123', email: 'test@example.com' }
const authOk = { response: null, user: mockUser, supabase: null }
const auth401 = {
  response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  user: null,
  supabase: null,
}

function makeRequest(body: unknown, contentLength?: number) {
  const bodyStr = JSON.stringify(body)
  return new NextRequest('http://localhost/api/ai/automation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(contentLength ?? bodyStr.length),
      'x-forwarded-for': '127.0.0.1',
    },
    body: bodyStr,
  })
}

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => { server.resetHandlers(); vi.clearAllMocks() })
afterAll(() => server.close())

describe('POST /api/ai/automation', () => {
  it('returns 401 when no session', async () => {
    vi.mocked(requireSession).mockResolvedValueOnce(auth401 as never)

    const res = await POST(makeRequest({ prompt: 'quando lead chega, notificar' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('returns 413 when body exceeds 16KB', async () => {
    const res = await POST(makeRequest({ prompt: 'test' }, 20_000))
    expect(res.status).toBe(413)
    const json = await res.json()
    expect(json).toEqual({ error: 'Payload too large' })
  })

  it('returns 400 when body is invalid (empty prompt)', async () => {
    vi.mocked(requireSession).mockResolvedValueOnce(authOk as never)

    const res = await POST(makeRequest({ prompt: '' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error', 'Invalid request')
    expect(json).toHaveProperty('issues')
  })

  it('returns 200 with valid session and body (Anthropic mocked)', async () => {
    vi.mocked(requireSession).mockResolvedValueOnce(authOk as never)
    process.env.ANTHROPIC_API_KEY = 'test-key-for-vitest'

    const res = await POST(makeRequest({ prompt: 'quando lead chega a score 80, notificar o closer' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('flow')

    delete process.env.ANTHROPIC_API_KEY
  })
})
