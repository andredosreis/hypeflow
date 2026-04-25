import { createHash } from 'crypto'
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

/** lower(trim(email)). Returns null for empty/invalid input. */
export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  return v.length === 0 ? null : v
}

/**
 * Returns the E.164 phone string (e.g. "+351912345678") or null if the input
 * cannot be parsed. Default country is 'PT' to match HypeFlow's primary market;
 * adapters can override by passing the appropriate country code.
 *
 * Note: migration 0004 introduced a digits-only `phone_normalized` column that
 * older code reads. This function is the new canonical normalizer used by the
 * ingestion hub. Existing rows are not retroactively converted to E.164 in
 * this story; that is tracked as a follow-up backfill.
 */
export function normalizePhone(
  raw: string | null | undefined,
  defaultCountry: CountryCode = 'PT',
): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry)
  if (!parsed || !parsed.isValid()) return null
  return parsed.number
}

/** SHA-256 hex of `${normalized}|${salt}`. Used in structured logs (PII safe). */
export function hashEmail(normalized: string, salt: string): string {
  return createHash('sha256').update(`${normalized}|${salt}`).digest('hex')
}

export function hashPhone(normalized: string, salt: string): string {
  return createHash('sha256').update(`${normalized}|${salt}`).digest('hex')
}

/**
 * Deterministic hub-side event_id when the provider does not supply one.
 * Format: "sha256:" + hex digest of stringified payload + received_at + provider.
 *
 * Same payload from same provider at the same instant always yields the same
 * id, so this is idempotent for replays where received_at is preserved.
 */
export function generateEventId(
  payload: unknown,
  receivedAt: string,
  provider: string,
): string {
  const input = `${JSON.stringify(payload)}|${receivedAt}|${provider}`
  const digest = createHash('sha256').update(input).digest('hex')
  return `sha256:${digest}`
}
