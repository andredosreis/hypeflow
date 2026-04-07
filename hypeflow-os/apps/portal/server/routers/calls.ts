/**
 * Portal Calls Router — read-only for client users
 */

import { z } from 'zod'
import { createTRPCRouter, clientProcedure } from '../trpc'

export const callsRouter = createTRPCRouter({
  list: clientProcedure
    .input(z.object({
      status: z.enum(['scheduled', 'completed', 'no_show', 'all']).default('all'),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx

      let query = supabase
        .from('calls')
        .select('id, scheduled_at, duration_min, meet_link, status, outcome, notes, actual_duration_min, lead:leads(full_name, email), agent:users(full_name)')
        .eq('client_id', user.client_id)
        .order('scheduled_at', { ascending: false })

      if (input.status !== 'all') {
        query = query.eq('status', input.status)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data ?? []
    }),

  getStats: clientProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx

    const { data } = await supabase
      .from('calls')
      .select('status')
      .eq('client_id', user.client_id)

    const stats = { scheduled: 0, completed: 0, no_show: 0 }
    for (const call of data ?? []) {
      if (call.status in stats) stats[call.status as keyof typeof stats]++
    }

    const total  = stats.completed + stats.no_show
    const showUp = total > 0 ? Math.round((stats.completed / total) * 100) : 0

    return { ...stats, showUpRate: showUp }
  }),
})
