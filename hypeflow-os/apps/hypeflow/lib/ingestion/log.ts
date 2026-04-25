import type { LeadDTO } from './dto'
import { hashEmail, hashPhone } from './normalize'

const PII_SALT = process.env.HYPEFLOW_LOG_SALT ?? 'hypeflow-log-salt-v1'

interface LogArgs {
  level: 'info' | 'warn' | 'error'
  event: string
  dto?: LeadDTO
  durationMs?: number
  error?: unknown
  extra?: Record<string, unknown>
}

/**
 * Structured webhook-ingestion log line. PII rules (FDD §7):
 *   - email/phone are NEVER emitted in clear; only their salted SHA-256 hash.
 *   - name is NEVER emitted (PII even without contact details).
 *   - raw_payload is NEVER logged; only persisted in webhook_failures or leads.
 *
 * Salt comes from `HYPEFLOW_LOG_SALT` env var; falls back to a known value
 * outside production so tests stay deterministic. Production deployments must
 * set the env var.
 */
export function logIngestionEvent(args: LogArgs) {
  const line: Record<string, unknown> = {
    level: args.level,
    ts: new Date().toISOString(),
    component: 'webhook-ingestion',
    event: args.event,
  }

  if (args.dto) {
    line.event_id = args.dto.event_id
    line.provider = args.dto.provider
    line.client_id = args.dto.client_id
    line.source_platform = args.dto.source.platform
    line.received_at = args.dto.received_at

    if (args.dto.contact.email) {
      const norm = args.dto.contact.email.trim().toLowerCase()
      if (norm) line.email_hash = hashEmail(norm, PII_SALT)
    }
    if (args.dto.contact.phone) {
      // Hash whatever the adapter normalised to; if not normalised, use raw.
      line.phone_hash = hashPhone(args.dto.contact.phone, PII_SALT)
    }
  }

  if (typeof args.durationMs === 'number') line.duration_ms = args.durationMs
  if (args.error instanceof Error) {
    line.error_message = args.error.message
    line.error_stack = args.error.stack
  } else if (args.error) {
    line.error_message = String(args.error)
  }
  if (args.extra) Object.assign(line, args.extra)

  const out = JSON.stringify(line)
  if (args.level === 'error') {
    console.error(out)
  } else if (args.level === 'warn') {
    console.warn(out)
  } else {
    console.log(out)
  }
}
