/**
 * Portal ROI Router
 *
 * Returns traffic metrics and ROI analytics scoped to the client.
 */

import { z } from 'zod'
import { createTRPCRouter, clientProcedure } from '../trpc'
import { subDays } from 'date-fns'

export const roiRouter = createTRPCRouter({
  getMonthlyData: clientProcedure
    .input(z.object({ months: z.number().min(1).max(12).default(6) }))
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx
      const dateFrom = subDays(new Date(), input.months * 30).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('traffic_metrics')
        .select('date, platform, leads, spend, revenue:roas, cpl')
        .eq('client_id', user.client_id)
        .gte('date', dateFrom)
        .order('date', { ascending: true })

      if (error) throw new Error(error.message)

      // Group by month
      const byMonth: Record<string, { month: string; leads: number; spend: number; revenue: number; cpl: number }> = {}

      for (const row of data ?? []) {
        const month = row.date.slice(0, 7)  // YYYY-MM
        if (!byMonth[month]) {
          byMonth[month] = { month, leads: 0, spend: 0, revenue: 0, cpl: 0 }
        }
        byMonth[month].leads   += row.leads ?? 0
        byMonth[month].spend   += parseFloat(row.spend ?? '0')
        // revenue = spend * ROAS (estimated)
        byMonth[month].revenue += parseFloat(row.spend ?? '0') * parseFloat(row.revenue ?? '0' as unknown as string)
      }

      return Object.values(byMonth).map(m => ({
        ...m,
        spend:   Math.round(m.spend * 100) / 100,
        revenue: Math.round(m.revenue * 100) / 100,
        cpl:     m.leads > 0 ? Math.round((m.spend / m.leads) * 100) / 100 : 0,
      }))
    }),

  getChannelBreakdown: clientProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx
      const dateFrom = subDays(new Date(), input.days).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('traffic_metrics')
        .select('platform, leads, spend')
        .eq('client_id', user.client_id)
        .gte('date', dateFrom)

      if (error) throw new Error(error.message)

      const byPlatform: Record<string, { name: string; leads: number; spend: number }> = {}

      for (const row of data ?? []) {
        if (!byPlatform[row.platform]) {
          byPlatform[row.platform] = { name: row.platform, leads: 0, spend: 0 }
        }
        byPlatform[row.platform].leads += row.leads ?? 0
        byPlatform[row.platform].spend += parseFloat(row.spend ?? '0')
      }

      return Object.values(byPlatform).sort((a, b) => b.leads - a.leads)
    }),

  getFunnelStats: clientProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx

    const { data } = await supabase
      .from('leads')
      .select('status')
      .eq('client_id', user.client_id)

    const counts: Record<string, number> = {}
    for (const lead of data ?? []) {
      counts[lead.status] = (counts[lead.status] ?? 0) + 1
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    return [
      { stage: 'Leads Totais',  count: total,                                                   key: 'total' },
      { stage: 'Qualificadas',  count: (counts.qualifying ?? 0) + (counts.qualified ?? 0),      key: 'qualified' },
      { stage: 'Calls',         count: counts.scheduled ?? 0,                                   key: 'scheduled' },
      { stage: 'Propostas',     count: counts.proposal ?? 0,                                    key: 'proposal' },
      { stage: 'Fechadas',      count: counts.closed ?? 0,                                      key: 'closed' },
    ]
  }),
})
