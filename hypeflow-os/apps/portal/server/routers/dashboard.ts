/**
 * Portal Dashboard Router
 *
 * Returns KPI summary, weekly lead chart, and recent leads
 * scoped to the authenticated client_user's client_id.
 */

import { createTRPCRouter, clientProcedure } from '../trpc'
import { subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns'

export const dashboardRouter = createTRPCRouter({
  /**
   * getKPIs — returns this week's key metrics vs. last week
   */
  getKPIs: clientProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx
    const now       = new Date()
    const weekStart = subDays(now, 7)
    const prevStart = subDays(now, 14)

    // This week leads
    const { count: leadsThisWeek } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', user.client_id)
      .gte('created_at', weekStart.toISOString())

    // Last week leads
    const { count: leadsLastWeek } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', user.client_id)
      .gte('created_at', prevStart.toISOString())
      .lt('created_at', weekStart.toISOString())

    // Calls scheduled (upcoming)
    const { count: callsScheduled } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', user.client_id)
      .eq('status', 'scheduled')
      .gte('scheduled_at', now.toISOString())

    // Closed deals this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const { count: closedThisMonth } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', user.client_id)
      .eq('status', 'closed')
      .gte('created_at', monthStart.toISOString())

    const { count: closedLastMonth } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', user.client_id)
      .eq('status', 'closed')
      .gte('created_at', new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString())
      .lt('created_at', monthStart.toISOString())

    // Average CPL from traffic_metrics (last 30 days)
    const { data: metrics } = await supabase
      .from('traffic_metrics')
      .select('leads, spend')
      .eq('client_id', user.client_id)
      .gte('date', subDays(now, 30).toISOString().split('T')[0])

    const totalLeadsFromAds = metrics?.reduce((a, r) => a + (r.leads ?? 0), 0) ?? 0
    const totalSpend        = metrics?.reduce((a, r) => a + parseFloat(r.spend ?? '0'), 0) ?? 0
    const cpl = totalLeadsFromAds > 0 ? totalSpend / totalLeadsFromAds : 0

    function pctChange(current: number, previous: number) {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    return {
      leadsThisWeek:    leadsThisWeek ?? 0,
      leadsChangePercent: pctChange(leadsThisWeek ?? 0, leadsLastWeek ?? 0),
      cpl:              Math.round(cpl * 100) / 100,
      cplChangePercent: -8, // placeholder until we have prev period CPL
      callsScheduled:   callsScheduled ?? 0,
      closedThisMonth:  closedThisMonth ?? 0,
      closedChangePercent: pctChange(closedThisMonth ?? 0, closedLastMonth ?? 0),
    }
  }),

  /**
   * getWeeklyChart — daily leads + conversions for last 7 days
   */
  getWeeklyChart: clientProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx
    const now   = new Date()
    const start = subDays(now, 6)

    const days = eachDayOfInterval({ start, end: now })

    const { data: leads } = await supabase
      .from('leads')
      .select('created_at, status')
      .eq('client_id', user.client_id)
      .gte('created_at', startOfDay(start).toISOString())
      .lte('created_at', endOfDay(now).toISOString())

    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    return days.map(day => {
      const dayLeads = (leads ?? []).filter(l => {
        const d = new Date(l.created_at)
        return d.toDateString() === day.toDateString()
      })
      return {
        day:         dayLabels[day.getDay()],
        leads:       dayLeads.length,
        conversions: dayLeads.filter(l => l.status === 'closed').length,
      }
    })
  }),

  /**
   * getRecentLeads — last 5 leads created
   */
  getRecentLeads: clientProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx

    const { data } = await supabase
      .from('leads')
      .select('id, full_name, source, status, created_at, score')
      .eq('client_id', user.client_id)
      .order('created_at', { ascending: false })
      .limit(5)

    return data ?? []
  }),

  /**
   * getNextCall — next scheduled call for this client
   */
  getNextCall: clientProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx

    const { data } = await supabase
      .from('calls')
      .select('id, scheduled_at, duration_min, meet_link, lead:leads(full_name)')
      .eq('client_id', user.client_id)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .single()

    return data ?? null
  }),
})
