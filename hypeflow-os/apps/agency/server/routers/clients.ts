import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const clientsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ agencyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data, error } = await supabase
        .from('clients')
        .select('id, name, niche, status, health_score, mrr, logo_url, contract_start, account_manager:users(id, full_name)')
        .eq('agency_id', input.agencyId)
        .order('name', { ascending: true })

      if (error) throw new Error(error.message)

      const clients = data ?? []
      if (clients.length === 0) return []

      const clientIds = clients.map(client => client.id)
      const [{ data: calls }, { data: interactions }] = await Promise.all([
        supabase
          .from('calls')
          .select('client_id, scheduled_at')
          .in('client_id', clientIds)
          .order('scheduled_at', { ascending: false }),
        supabase
          .from('lead_interactions')
          .select('agency_id, lead_id, created_at')
          .eq('agency_id', input.agencyId)
          .order('created_at', { ascending: false })
          .limit(500),
      ])

      const latestCallByClient = new Map<string, string>()
      for (const call of calls ?? []) {
        if (!latestCallByClient.has(call.client_id)) {
          latestCallByClient.set(call.client_id, call.scheduled_at)
        }
      }

      const latestInteractionAt = interactions?.[0]?.created_at
      const now = Date.now()

      return clients.map((client) => {
        const lastTouchIso = latestCallByClient.get(client.id) ?? latestInteractionAt ?? null
        const inactivityDays = lastTouchIso
          ? Math.floor((now - new Date(lastTouchIso).getTime()) / 86400000)
          : 999

        let healthStatus: 'green' | 'yellow' | 'red' = 'green'
        if (inactivityDays >= 21 || (client.health_score ?? 0) < 55) healthStatus = 'red'
        else if (inactivityDays >= 10 || (client.health_score ?? 0) < 75) healthStatus = 'yellow'

        const contractStart = (client as { contract_start?: string | null }).contract_start
        const ageDays = contractStart ? Math.floor((now - new Date(contractStart).getTime()) / 86400000) : 0
        const upsellReady = ageDays >= 90 && healthStatus === 'green'

        return {
          ...client,
          health_status: healthStatus,
          inactivity_days: inactivityDays,
          upsell_ready: upsellReady,
        }
      })
    }),

  getPortfolioHealth: protectedProcedure
    .input(z.object({ agencyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, health_score, contract_start, status')
        .eq('agency_id', input.agencyId)

      const now = Date.now()
      const healthRows = (clients ?? []).map((client) => {
        const contractStart = client.contract_start ? new Date(client.contract_start).getTime() : now
        const ageDays = Math.floor((now - contractStart) / 86400000)
        const isGreen = (client.health_score ?? 0) >= 80
        return {
          id: client.id,
          name: client.name,
          health: client.health_score ?? 0,
          status: client.status,
          churnRisk: !isGreen && ageDays > 21,
          upsellReady: isGreen && ageDays >= 90,
        }
      })

      return {
        totals: {
          green: healthRows.filter(row => row.health >= 80).length,
          yellow: healthRows.filter(row => row.health >= 60 && row.health < 80).length,
          red: healthRows.filter(row => row.health < 60).length,
          upsellReady: healthRows.filter(row => row.upsellReady).length,
        },
        rows: healthRows,
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data, error } = await supabase
        .from('clients')
        .select('*, account_manager:users(id, full_name, avatar_url)')
        .eq('id', input.id)
        .single()

      if (error) throw new Error(error.message)
      return data
    }),
})
