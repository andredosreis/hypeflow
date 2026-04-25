import type { NextRequest } from 'next/server'
import type { LeadDTO } from './dto'

export interface AdapterContext {
  clientId: string
  /** Header value to put inside the eventual ack response, or any other ctx data the adapter needs. */
  rawText: string
}

export interface Adapter<TPayload = unknown> {
  readonly provider: string
  /** Sync token / HMAC validation. Returns false → 401. */
  verify(req: NextRequest, expectedToken: string | undefined): boolean
  /** Map provider payload → LeadDTO, or `{ skip: true }` for events that should be ignored silently. */
  parse(
    body: TPayload,
    ctx: AdapterContext,
  ): Promise<LeadDTO | { skip: true; reason: string }>
}
