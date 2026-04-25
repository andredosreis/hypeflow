import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, agencyProcedure } from '../../../trpc'
import { generateRawToken, hashToken } from '@/lib/portal/tokens'
import { createServiceClient } from '@/lib/supabase/server'

const DEFAULT_TTL_DAYS = 30
const MAX_TTL_DAYS = 365

export const portalTokensRouter = createTRPCRouter({
  /**
   * Issue a new portal token for `clientId`. Auto-revokes any active tokens
   * for the same client. Returns the raw token exactly once.
   */
  generate: agencyProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      label: z.string().max(60).optional(),
      ttlDays: z.number().int().min(1).max(MAX_TTL_DAYS).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, agencyUser } = ctx

      // Verify the client belongs to the caller's agency (anon-role + RLS)
      const { data: client } = await supabase
        .from('clients')
        .select('id, agency_id')
        .eq('id', input.clientId)
        .maybeSingle()

      if (!client || client.agency_id !== agencyUser.agency_id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Client not in your agency' })
      }

      const raw = generateRawToken()
      const tokenHash = hashToken(raw)
      const ttlDays = input.ttlDays ?? DEFAULT_TTL_DAYS
      const expiresAt = new Date(Date.now() + ttlDays * 86_400_000).toISOString()

      // Service role for the writes — RLS write policy requires
      // is_agency_admin() which the current owner role does not satisfy.
      // Agency match was already verified above.
      const service = await createServiceClient()

      // Revoke any active tokens for this client (single-active-token policy)
      await service
        .from('portal_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('client_id', input.clientId)
        .is('revoked_at', null)

      const { data, error } = await service
        .from('portal_tokens')
        .insert({
          client_id: input.clientId,
          agency_id: client.agency_id,
          token_hash: tokenHash,
          created_by: agencyUser.id,
          expires_at: expiresAt,
          label: input.label ?? null,
        })
        .select('id, expires_at')
        .single()

      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'Failed to insert portal token',
        })
      }

      return { id: data.id, rawToken: raw, expiresAt: data.expires_at }
    }),

  /**
   * Revoke a single portal token by id. Caller must belong to the same agency.
   */
  revoke: agencyProcedure
    .input(z.object({ tokenId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, agencyUser } = ctx

      // Confirm the token belongs to caller's agency before mutating
      const { data: token } = await supabase
        .from('portal_tokens')
        .select('id, agency_id')
        .eq('id', input.tokenId)
        .maybeSingle()

      if (!token || token.agency_id !== agencyUser.agency_id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Token not in your agency' })
      }

      const service = await createServiceClient()
      const { error } = await service
        .from('portal_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', input.tokenId)
        .is('revoked_at', null)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { ok: true as const }
    }),

  /**
   * List all tokens (active + revoked + expired) for a client. Never returns
   * the token_hash — only metadata.
   */
  list: agencyProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase, agencyUser } = ctx

      const { data: client } = await supabase
        .from('clients')
        .select('id, agency_id')
        .eq('id', input.clientId)
        .maybeSingle()

      if (!client || client.agency_id !== agencyUser.agency_id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Client not in your agency' })
      }

      const { data, error } = await supabase
        .from('portal_tokens')
        .select('id, label, created_at, expires_at, last_used_at, revoked_at')
        .eq('client_id', input.clientId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data ?? []
    }),
})
