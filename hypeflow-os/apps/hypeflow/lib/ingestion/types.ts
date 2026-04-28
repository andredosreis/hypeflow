import type { NextRequest } from 'next/server'
import type { LeadDTO } from './dto'

export interface AdapterContext {
  clientId: string
  /** Header value to put inside the eventual ack response, or any other ctx data the adapter needs. */
  rawText: string
}

export interface Adapter<TPayload = unknown> {
  readonly provider: string
  /**
   * Sync token / HMAC validation. Returns false → 401.
   * `rawBody` is the unparsed request body — required by HMAC adapters
   * (Tally, Stripe-style), ignored by bearer-token adapters (Evolution).
   */
  verify(
    req: NextRequest,
    expectedSecret: string | undefined,
    rawBody: string,
  ): boolean
  /** Map provider payload → LeadDTO, or `{ skip: true }` for events that should be ignored silently. */
  parse(
    body: TPayload,
    ctx: AdapterContext,
  ): Promise<LeadDTO | { skip: true; reason: string }>
}
