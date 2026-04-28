import { describe, it, expect } from 'vitest'
import { evolutionAdapter } from '@/lib/ingestion/adapters/evolution'
import type { NextRequest } from 'next/server'

function makeReq(authHeader?: string): NextRequest {
  return {
    headers: {
      get: (k: string) => (k.toLowerCase() === 'authorization' ? (authHeader ?? null) : null),
    },
  } as unknown as NextRequest
}

describe('evolutionAdapter.verify', () => {
  it('returns true for a matching Bearer token', () => {
    expect(evolutionAdapter.verify(makeReq('Bearer my-secret-1234'), 'my-secret-1234', '')).toBe(true)
  })
  it('returns false for a wrong token', () => {
    expect(evolutionAdapter.verify(makeReq('Bearer nope'), 'expected', '')).toBe(false)
  })
  it('returns false when the header is missing', () => {
    expect(evolutionAdapter.verify(makeReq(undefined), 'expected', '')).toBe(false)
  })
  it('returns false when the expected token is undefined', () => {
    expect(evolutionAdapter.verify(makeReq('Bearer x'), undefined, '')).toBe(false)
  })
})

describe('evolutionAdapter.parse', () => {
  it('maps messages.upsert to LeadDTO with source.platform=whatsapp', async () => {
    const out = await evolutionAdapter.parse(
      {
        event: 'messages.upsert',
        instance: 'agencia-abc',
        data: {
          key: { remoteJid: '351912345678@s.whatsapp.net' },
          pushName: 'João Silva',
          message: { conversation: 'Olá' },
          messageTimestamp: 1713801600,
        },
      },
      { clientId: '11111111-1111-1111-1111-111111111111', rawText: '' },
    )
    expect('skip' in out).toBe(false)
    if ('skip' in out) return
    expect(out.provider).toBe('evolution')
    expect(out.source.platform).toBe('whatsapp')
    expect(out.contact.phone).toBe('+351912345678')
    expect(out.contact.name).toBe('João Silva')
    expect(out.event_id).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(out.metadata?.evolution_instance).toBe('agencia-abc')
    expect(out.schema_version).toBe('v1')
  })

  it('maps contacts.upsert to LeadDTO', async () => {
    const out = await evolutionAdapter.parse(
      {
        event: 'contacts.upsert',
        data: { key: { remoteJid: '5511999990000@s.whatsapp.net' }, pushName: 'Ana' },
      },
      { clientId: '22222222-2222-2222-2222-222222222222', rawText: '' },
    )
    expect('skip' in out).toBe(false)
    if ('skip' in out) return
    expect(out.contact.phone).toBe('+5511999990000')
  })

  it('returns { skip: true } for messages.update', async () => {
    const out = await evolutionAdapter.parse(
      { event: 'messages.update', data: {} },
      { clientId: '33333333-3333-3333-3333-333333333333', rawText: '' },
    )
    expect('skip' in out).toBe(true)
  })

  it('throws for missing event field', async () => {
    await expect(
      evolutionAdapter.parse({ data: {} }, { clientId: '44444444-4444-4444-4444-444444444444', rawText: '' }),
    ).rejects.toThrow(/missing event field/i)
  })

  it('throws for missing remoteJid in messages.upsert', async () => {
    await expect(
      evolutionAdapter.parse(
        { event: 'messages.upsert', data: {} },
        { clientId: '55555555-5555-5555-5555-555555555555', rawText: '' },
      ),
    ).rejects.toThrow(/remoteJid/)
  })
})
