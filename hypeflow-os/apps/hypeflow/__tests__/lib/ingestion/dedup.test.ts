import { vi, describe, it, expect, beforeEach } from 'vitest'
import { findDuplicate } from '@/lib/ingestion/dedup'

// Each test installs its own chain mock to control which lookup matches.
// The supabase client.from(table).select(cols)... chain is mocked by hand
// because the dedup function uses a sequence of distinct queries per branch.

// The dedup function performs three distinct supabase chains:
//   1. .from('leads').select('id').eq('event_id', X).maybeSingle()           ← byEvent
//   2. .from('leads').select(...).eq('client_id',X).eq('email_normalized',Y)... ← byEmail
//   3. .from('leads').select(...).eq('client_id',X).eq('phone_normalized',Y)... ← byPhone
// Branches 2 & 3 use a deeper chain (.eq.eq.order.limit.maybeSingle) so we
// can disambiguate by chain depth: depth 1 = event lookup, depth 2 = email/phone.
function buildClientMock(handlers: {
  byEvent?: { id: string } | null
  byEmail?: { id: string; created_at: string } | null
  byPhone?: { id: string; created_at: string } | null
}) {
  let deepCalls = 0 // for email + phone lookups

  return {
    from: () => ({
      select: () => ({
        eq: (column: string, _value: unknown) => {
          // event_id branch (single .eq().maybeSingle())
          if (column === 'event_id') {
            return { maybeSingle: () => Promise.resolve({ data: handlers.byEvent ?? null, error: null }) }
          }
          // email/phone branch — second .eq() identifies which
          return {
            eq: (col2: string, _v2: unknown) => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: () => {
                    deepCalls++
                    if (col2 === 'email_normalized') {
                      return Promise.resolve({ data: handlers.byEmail ?? null, error: null })
                    }
                    if (col2 === 'phone_normalized') {
                      return Promise.resolve({ data: handlers.byPhone ?? null, error: null })
                    }
                    return Promise.resolve({ data: null, error: null })
                  },
                }),
              }),
            }),
          }
        },
      }),
    }),
  } as never
}

const NOW = new Date('2026-04-25T10:00:00.000Z').getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

describe('findDuplicate', () => {
  it('returns kind=event_id when event_id already exists', async () => {
    const supabase = buildClientMock({ byEvent: { id: 'lead-1' } })
    const out = await findDuplicate(supabase, {
      clientId: 'c1',
      eventId: 'sha256:abc',
      emailNormalized: null,
      phoneNormalized: null,
    })
    expect(out).toEqual({ kind: 'event_id', leadId: 'lead-1' })
  })

  it('returns kind=recent_match for an email lookup within 30 days', async () => {
    const supabase = buildClientMock({
      byEvent: null,
      byEmail: { id: 'lead-2', created_at: new Date(NOW - 5 * 86_400_000).toISOString() },
    })
    const out = await findDuplicate(supabase, {
      clientId: 'c1',
      eventId: 'sha256:new',
      emailNormalized: 'john@example.com',
      phoneNormalized: null,
    })
    expect(out.kind).toBe('recent_match')
    if (out.kind === 'recent_match') {
      expect(out.leadId).toBe('lead-2')
      expect(out.matchedOn).toBe('email')
    }
  })

  it('returns kind=old_match for an email lookup older than 30 days', async () => {
    const supabase = buildClientMock({
      byEvent: null,
      byEmail: { id: 'lead-3', created_at: new Date(NOW - 90 * 86_400_000).toISOString() },
    })
    const out = await findDuplicate(supabase, {
      clientId: 'c1',
      eventId: 'sha256:new',
      emailNormalized: 'old@example.com',
      phoneNormalized: null,
    })
    expect(out.kind).toBe('old_match')
  })

  it('falls through to phone when email is null', async () => {
    const supabase = buildClientMock({
      byEvent: null,
      byPhone: { id: 'lead-4', created_at: new Date(NOW - 1 * 86_400_000).toISOString() },
    })
    const out = await findDuplicate(supabase, {
      clientId: 'c1',
      eventId: 'sha256:new',
      emailNormalized: null,
      phoneNormalized: '+351912345678',
    })
    expect(out.kind).toBe('recent_match')
    if (out.kind === 'recent_match') expect(out.matchedOn).toBe('phone')
  })

  it('returns kind=none when nothing matches', async () => {
    const supabase = buildClientMock({ byEvent: null, byEmail: null, byPhone: null })
    const out = await findDuplicate(supabase, {
      clientId: 'c1',
      eventId: 'sha256:new',
      emailNormalized: 'nobody@nowhere.com',
      phoneNormalized: '+351999999999',
    })
    expect(out).toEqual({ kind: 'none' })
  })
})
