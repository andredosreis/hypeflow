import { createHmac, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

/**
 * Constant-time bearer-token comparison. Returns true only if the request
 * carries `Authorization: Bearer <token>` (case-insensitive scheme) with a
 * value byte-equal to `expected`.
 *
 * Tokens are read from env vars in the MVP. Vault-per-agency is a future
 * hardening story.
 */
export function verifyToken(req: NextRequest, expected: string | undefined): boolean {
  if (!expected) return false
  const header = req.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return false
  const provided = match[1].trim()
  if (provided.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  } catch {
    return false
  }
}

/**
 * HMAC-SHA256 verification with constant-time comparison. The signature is
 * read from `signatureHeader` (provider-specific) and compared against
 * `HMAC_SHA256(secret, rawBody)` rendered as hex.
 *
 * Body MUST be read as raw text before JSON parsing — re-serialising would
 * break byte equivalence.
 */
export function verifyHmac(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !signatureHeader) return false

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')

  // Some providers prefix with "sha256=". Strip if present.
  const provided = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader

  if (provided.length !== expected.length) return false

  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  } catch {
    return false
  }
}
