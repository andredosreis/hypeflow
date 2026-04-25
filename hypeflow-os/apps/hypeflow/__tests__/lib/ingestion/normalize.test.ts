import { describe, it, expect } from 'vitest'
import {
  normalizeEmail,
  normalizePhone,
  hashEmail,
  hashPhone,
  generateEventId,
} from '@/lib/ingestion/normalize'

describe('normalizeEmail', () => {
  it('lowercases + trims', () => {
    expect(normalizeEmail('  John@Example.COM ')).toBe('john@example.com')
  })
  it('returns null for empty / whitespace / null', () => {
    expect(normalizeEmail('')).toBeNull()
    expect(normalizeEmail('   ')).toBeNull()
    expect(normalizeEmail(null)).toBeNull()
    expect(normalizeEmail(undefined)).toBeNull()
  })
})

describe('normalizePhone', () => {
  it('returns E.164 for a valid PT number with default country', () => {
    expect(normalizePhone('912 345 678')).toBe('+351912345678')
  })
  it('returns E.164 for a valid international-format number', () => {
    expect(normalizePhone('+1 415 555 2671')).toBe('+14155552671')
  })
  it('returns null for unparseable input', () => {
    expect(normalizePhone('not a phone')).toBeNull()
  })
  it('returns null for empty / null', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone(null)).toBeNull()
    expect(normalizePhone(undefined)).toBeNull()
  })
  it('honours the defaultCountry override', () => {
    expect(normalizePhone('11 99999 0000', 'BR')).toBe('+5511999990000')
  })
})

describe('hashEmail / hashPhone', () => {
  it('hashEmail is deterministic with the same salt', () => {
    expect(hashEmail('a@b.com', 'salt-1')).toBe(hashEmail('a@b.com', 'salt-1'))
  })
  it('hashEmail differs across salts', () => {
    expect(hashEmail('a@b.com', 'salt-1')).not.toBe(hashEmail('a@b.com', 'salt-2'))
  })
  it('hashPhone is deterministic with the same salt', () => {
    expect(hashPhone('+351912345678', 'x')).toBe(hashPhone('+351912345678', 'x'))
  })
  it('hashes are 64 hex chars (SHA-256)', () => {
    expect(hashEmail('x@y.com', 's')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashPhone('+1', 's')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('generateEventId', () => {
  it('returns "sha256:" prefix + 64 hex chars', () => {
    const id = generateEventId({ a: 1 }, '2026-04-25T10:00:00.000Z', 'evolution')
    expect(id).toMatch(/^sha256:[0-9a-f]{64}$/)
  })
  it('is deterministic for the same inputs', () => {
    const a = generateEventId({ k: 'v' }, '2026-04-25T10:00:00.000Z', 'evolution')
    const b = generateEventId({ k: 'v' }, '2026-04-25T10:00:00.000Z', 'evolution')
    expect(a).toBe(b)
  })
  it('changes with received_at or provider', () => {
    const a = generateEventId({ k: 'v' }, '2026-04-25T10:00:00.000Z', 'evolution')
    const b = generateEventId({ k: 'v' }, '2026-04-25T10:00:00.001Z', 'evolution')
    const c = generateEventId({ k: 'v' }, '2026-04-25T10:00:00.000Z', 'tally')
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
  })
})
