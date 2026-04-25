import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const getUserMock = vi.fn()
const maybeSingleMock = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: maybeSingleMock }),
      }),
    }),
  })),
}))

import { updateSession } from '@/lib/supabase/middleware'

function makeReq(pathname: string) {
  return new NextRequest(`http://localhost${pathname}`)
}

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_PREVIEW_MODE
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key'
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('updateSession — C1 fixes', () => {
  it('redirects protected path to /login?error=session when getUser throws', async () => {
    getUserMock.mockRejectedValueOnce(new Error('Supabase down'))

    const res = await updateSession(makeReq('/admin/dashboard'))

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/login')
    expect(location).toContain('error=session')
  })

  it('passes through public path when getUser throws (no redirect loop on /login)', async () => {
    getUserMock.mockRejectedValueOnce(new Error('Supabase down'))

    const res = await updateSession(makeReq('/login'))

    // Not a redirect — supabaseResponse passthrough
    expect(res.status).not.toBe(307)
    expect(res.headers.get('location')).toBeNull()
  })

  it('skips auth when NEXT_PUBLIC_PREVIEW_MODE=true', async () => {
    process.env.NEXT_PUBLIC_PREVIEW_MODE = 'true'

    const res = await updateSession(makeReq('/admin/dashboard'))

    // No call to Supabase, no redirect
    expect(getUserMock).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBeNull()
  })

  it('does NOT skip auth just because URL contains "placeholder" (substring gate removed)', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'
    getUserMock.mockResolvedValueOnce({ data: { user: null } })

    const res = await updateSession(makeReq('/admin/dashboard'))

    // Auth ran (anonymous → redirect to /login)
    expect(getUserMock).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects soft-deleted agency user (is_active=false) to /login?status=account-disabled', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'user-disabled' } } })
    maybeSingleMock.mockResolvedValueOnce({ data: { id: 'user-disabled', is_active: false } })

    const res = await updateSession(makeReq('/admin/dashboard'))

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/login')
    expect(location).toContain('status=account-disabled')
  })

  it('redirects user with no agency row to /client/dashboard when accessing /admin', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'client-user' } } })
    maybeSingleMock.mockResolvedValueOnce({ data: null })

    const res = await updateSession(makeReq('/admin/dashboard'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/client/dashboard')
  })

  it('redirects unauthenticated request to protected path → /login', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } })

    const res = await updateSession(makeReq('/admin/dashboard'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('keeps soft-deleted user on /login (no redirect loop)', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'user-disabled' } } })
    maybeSingleMock.mockResolvedValueOnce({ data: { id: 'user-disabled', is_active: false } })

    const res = await updateSession(makeReq('/login'))

    expect(res.headers.get('location')).toBeNull()
  })
})
