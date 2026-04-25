import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// ---- Supabase client mocks (anon + service) ----------------------------
const anonGetUser = vi.fn()
const anonMaybeSingle = vi.fn()        // users self-read
const anonClientMaybeSingle = vi.fn()  // clients fast-path read

const serviceAgencyInsert = vi.fn().mockResolvedValue({ data: null, error: null })
const serviceUsersUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
const serviceStagesLimit = vi.fn().mockResolvedValue({ data: [], error: null })
const serviceStagesInsert = vi.fn().mockResolvedValue({ data: null, error: null })
const serviceClientMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

const anonClient = {
  auth: { getUser: anonGetUser },
  from: (table: string) => {
    if (table === 'users') {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: anonMaybeSingle }),
        }),
      }
    }
    if (table === 'clients') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({ maybeSingle: anonClientMaybeSingle }),
            }),
          }),
        }),
      }
    }
    throw new Error(`unexpected anon table: ${table}`)
  },
}

const serviceClient = {
  from: (table: string) => {
    if (table === 'agencies') return { insert: serviceAgencyInsert }
    if (table === 'users') return { upsert: serviceUsersUpsert }
    if (table === 'pipeline_stages') {
      return {
        select: () => ({
          eq: () => ({ limit: serviceStagesLimit }),
        }),
        insert: serviceStagesInsert,
      }
    }
    if (table === 'clients') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({ maybeSingle: serviceClientMaybeSingle }),
            }),
          }),
        }),
      }
    }
    throw new Error(`unexpected service table: ${table}`)
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => anonClient),
  createServiceClient: vi.fn(async () => serviceClient),
}))

// Import AFTER mocks
import { ensureWorkspaceForCurrentUser, isDemoMode, DEMO_RESPONSE } from '@/lib/bootstrap/workspace'

// process.env.NODE_ENV is typed read-only in newer @types/node; cast to bypass
// for test-only env mutation.
const env = process.env as Record<string, string | undefined>

beforeEach(() => {
  delete env.NEXT_PUBLIC_DEMO_MODE
  env.NODE_ENV = 'test'
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('isDemoMode — explicit env gate (C2)', () => {
  it('returns false when NEXT_PUBLIC_DEMO_MODE is unset', () => {
    expect(isDemoMode()).toBe(false)
  })

  it('returns true in non-production when NEXT_PUBLIC_DEMO_MODE=true', () => {
    env.NEXT_PUBLIC_DEMO_MODE = 'true'
    expect(isDemoMode()).toBe(true)
  })

  it('throws in production even when NEXT_PUBLIC_DEMO_MODE=true', () => {
    env.NEXT_PUBLIC_DEMO_MODE = 'true'
    env.NODE_ENV = 'production'
    expect(() => isDemoMode()).toThrow(/not allowed in production/)
  })
})

describe('ensureWorkspaceForCurrentUser — C2 fixes', () => {
  it('returns DEMO_RESPONSE without touching Supabase when demo mode is on', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true'

    const result = await ensureWorkspaceForCurrentUser()

    expect(result).toEqual(DEMO_RESPONSE)
    expect(anonGetUser).not.toHaveBeenCalled()
    expect(serviceAgencyInsert).not.toHaveBeenCalled()
  })

  it('throws when there is no authenticated user (anonymous branch removed)', async () => {
    anonGetUser.mockResolvedValueOnce({ data: { user: null } })

    await expect(ensureWorkspaceForCurrentUser()).rejects.toThrow(
      /Bootstrap requires authenticated user/,
    )
    expect(serviceAgencyInsert).not.toHaveBeenCalled()
  })

  it('fast path: bootstrapped user reads only via anon-role + RLS, no service role', async () => {
    anonGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-1', email: 'x@y.com' } } })
    anonMaybeSingle.mockResolvedValueOnce({
      data: { agency_id: 'agency-1', bootstrapped: true },
    })
    anonClientMaybeSingle.mockResolvedValueOnce({ data: { id: 'client-1' } })

    const result = await ensureWorkspaceForCurrentUser()

    expect(result).toEqual({
      user: { id: 'u-1', email: 'x@y.com' },
      agencyId: 'agency-1',
      clientId: 'client-1',
    })
    expect(serviceAgencyInsert).not.toHaveBeenCalled()
    expect(serviceUsersUpsert).not.toHaveBeenCalled()
    expect(serviceStagesInsert).not.toHaveBeenCalled()
  })

  it('first-time user (no row in users) bootstraps agency + users + pipeline_stages via service role', async () => {
    anonGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-2', email: 'new@hype.com' } } })
    anonMaybeSingle.mockResolvedValueOnce({ data: null }) // no users row yet
    serviceStagesLimit.mockResolvedValueOnce({ data: [], error: null })
    serviceClientMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const result = await ensureWorkspaceForCurrentUser()

    expect(serviceAgencyInsert).toHaveBeenCalledTimes(1)
    expect(serviceUsersUpsert).toHaveBeenCalledTimes(1)
    expect(serviceStagesInsert).toHaveBeenCalledTimes(1)
    expect(result.user).toEqual({ id: 'u-2', email: 'new@hype.com' })
    expect(result.agencyId).toMatch(/[a-f0-9-]{36}/)
    expect(result.clientId).toBeNull()

    // bootstrapped flag is set in the upsert payload
    const upsertPayload = serviceUsersUpsert.mock.calls[0]?.[0]
    expect(upsertPayload?.bootstrapped).toBe(true)
  })

  it('user with existing agency_id but bootstrapped=false re-runs bootstrap and flips flag', async () => {
    anonGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-3', email: 'mid@hype.com' } } })
    anonMaybeSingle.mockResolvedValueOnce({
      data: { agency_id: 'agency-existing', bootstrapped: false },
    })
    serviceStagesLimit.mockResolvedValueOnce({ data: [], error: null })
    serviceClientMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const result = await ensureWorkspaceForCurrentUser()

    // No new agency created (existing agency_id reused)
    expect(serviceAgencyInsert).not.toHaveBeenCalled()
    // Users upserted with bootstrapped=true
    expect(serviceUsersUpsert).toHaveBeenCalledTimes(1)
    expect(serviceUsersUpsert.mock.calls[0]?.[0]?.bootstrapped).toBe(true)
    expect(result.agencyId).toBe('agency-existing')
  })

  it('skips pipeline_stages insert when stages already exist for the agency', async () => {
    anonGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-4', email: 'has@stages.com' } } })
    anonMaybeSingle.mockResolvedValueOnce({
      data: { agency_id: 'agency-with-stages', bootstrapped: false },
    })
    serviceStagesLimit.mockResolvedValueOnce({ data: [{ id: 'existing-stage' }], error: null })
    serviceClientMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

    await ensureWorkspaceForCurrentUser()

    expect(serviceStagesInsert).not.toHaveBeenCalled()
  })

  it('does NOT seed leads or traffic_metrics on first-time bootstrap (audit C2 scope removal)', async () => {
    anonGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-5', email: 'fresh@hype.com' } } })
    anonMaybeSingle.mockResolvedValueOnce({ data: null })
    serviceStagesLimit.mockResolvedValueOnce({ data: [], error: null })
    serviceClientMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

    await ensureWorkspaceForCurrentUser()

    // The mock factory throws on unexpected tables. If the code tried to insert
    // into 'leads' or 'traffic_metrics', the mock would have thrown. The fact
    // that this test passes is the assertion.
    expect(serviceAgencyInsert).toHaveBeenCalledTimes(1)
    expect(serviceUsersUpsert).toHaveBeenCalledTimes(1)
    expect(serviceStagesInsert).toHaveBeenCalledTimes(1)
  })
})
