import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'
import { verifyHmac, verifyToken } from '@/lib/ingestion/auth'

const SECRET = 'shh-it-is-a-secret'
const RAW_BODY = JSON.stringify({ eventType: 'FORM_RESPONSE', data: {} })

function hexSig(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}
function b64Sig(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('base64')
}

describe('verifyHmac (default hex)', () => {
  it('accepts a correct hex signature', () => {
    const sig = hexSig(SECRET, RAW_BODY)
    expect(verifyHmac(RAW_BODY, sig, SECRET)).toBe(true)
  })

  it('accepts a correct hex signature with sha256= prefix', () => {
    const sig = `sha256=${hexSig(SECRET, RAW_BODY)}`
    expect(verifyHmac(RAW_BODY, sig, SECRET)).toBe(true)
  })

  it('rejects when signature is from a different secret', () => {
    const sig = hexSig('other-secret', RAW_BODY)
    expect(verifyHmac(RAW_BODY, sig, SECRET)).toBe(false)
  })

  it('rejects when secret is undefined', () => {
    const sig = hexSig(SECRET, RAW_BODY)
    expect(verifyHmac(RAW_BODY, sig, undefined)).toBe(false)
  })

  it('rejects when signatureHeader is null', () => {
    expect(verifyHmac(RAW_BODY, null, SECRET)).toBe(false)
  })

  it('rejects when signature length differs', () => {
    expect(verifyHmac(RAW_BODY, 'too-short', SECRET)).toBe(false)
  })
})

describe('verifyHmac (base64 — Tally)', () => {
  it('accepts a correct base64 signature', () => {
    const sig = b64Sig(SECRET, RAW_BODY)
    expect(verifyHmac(RAW_BODY, sig, SECRET, { encoding: 'base64' })).toBe(true)
  })

  it('rejects when base64 signature is from a different secret', () => {
    const sig = b64Sig('other-secret', RAW_BODY)
    expect(verifyHmac(RAW_BODY, sig, SECRET, { encoding: 'base64' })).toBe(false)
  })

  it('rejects when body is tampered after signing', () => {
    const sig = b64Sig(SECRET, RAW_BODY)
    expect(verifyHmac(`${RAW_BODY} `, sig, SECRET, { encoding: 'base64' })).toBe(false)
  })

  it('rejects when caller asked base64 but supplied hex', () => {
    const sig = hexSig(SECRET, RAW_BODY)
    // hex is 64 chars, base64 of sha256 is 44 chars — length mismatch path
    expect(verifyHmac(RAW_BODY, sig, SECRET, { encoding: 'base64' })).toBe(false)
  })
})

describe('verifyToken', () => {
  function reqWith(authHeader: string | null) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authHeader !== null) headers.Authorization = authHeader
    return new NextRequest('http://localhost/x', { method: 'POST', headers })
  }

  it('accepts Bearer with the exact expected token', () => {
    expect(verifyToken(reqWith('Bearer abc-123'), 'abc-123')).toBe(true)
  })

  it('rejects when token differs', () => {
    expect(verifyToken(reqWith('Bearer wrong'), 'abc-123')).toBe(false)
  })

  it('rejects when scheme is missing', () => {
    expect(verifyToken(reqWith('abc-123'), 'abc-123')).toBe(false)
  })

  it('rejects when expected is undefined', () => {
    expect(verifyToken(reqWith('Bearer abc-123'), undefined)).toBe(false)
  })

  it('rejects when Authorization header is missing', () => {
    expect(verifyToken(reqWith(null), 'abc-123')).toBe(false)
  })
})
