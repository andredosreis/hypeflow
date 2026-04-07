/**
 * Portal Leads Router
 *
 * Read-only access to the client's leads.
 * Supports filtering, search, and pagination.
 * Export is handled client-side (CSV generation).
 */

import { z } from 'zod'
import { createTRPCRouter, clientProcedure } from '../trpc'

export const leadsRouter = createTRPCRouter({
  list: clientProcedure
    .input(z.object({
      status:   z.string().optional(),
      source:   z.string().optional(),
      search:   z.string().optional(),
      page:     z.number().default(1),
      limit:    z.number().min(1).max(100).default(25),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx
      const offset = (input.page - 1) * input.limit

      let query = supabase
        .from('leads')
        .select('id, full_name, email, phone, source, temperature, score, status, created_at, last_contact_at', { count: 'exact' })
        .eq('client_id', user.client_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + input.limit - 1)

      if (input.status) query = query.eq('status', input.status)
      if (input.source) query = query.eq('source', input.source)
      if (input.search) query = query.ilike('full_name', `%${input.search}%`)

      const { data, count, error } = await query
      if (error) throw new Error(error.message)

      return {
        leads: data ?? [],
        total: count ?? 0,
        page:  input.page,
        pages: Math.ceil((count ?? 0) / input.limit),
      }
    }),

  getStatusSummary: clientProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx

    const { data } = await supabase
      .from('leads')
      .select('status')
      .eq('client_id', user.client_id)

    const summary: Record<string, number> = {}
    for (const lead of data ?? []) {
      summary[lead.status] = (summary[lead.status] ?? 0) + 1
    }

    return summary
  }),
})
