import type { LeadDTO } from './dto'

/**
 * Score Engine stub for story 03.1.
 *
 * The real Score Engine is a separate body of work — this stub keeps the
 * ingestion pipeline shape stable while persisting `score = 0` and signalling
 * via `metadata.score_pending = true` so the eventual real engine can find
 * leads that still need scoring.
 *
 * Failure mode of the real engine is fail-open per FDD §6: the lead persists
 * with `score = 0` and `metadata.score_error = true`, never reverting the
 * write.
 */
export function scoreLeadStub(_dto: LeadDTO): { score: number; pending: boolean } {
  return { score: 0, pending: true }
}
