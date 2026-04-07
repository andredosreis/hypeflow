import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { differenceInMinutes, addMinutes } from 'date-fns'

const CallOutcomeSchema = z.enum(['advanced', 'lost', 'no_show', 'scheduled_followup'])

export const callsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      leadId: z.string().uuid(),
      clientId: z.string().uuid(),
      scheduledAt: z.string().datetime(),
      durationMin: z.number().min(15).max(180).default(45),
      type: z.enum(['qualification', 'proposal', 'followup', 'onboarding']).default('qualification'),
      notes: z.string().optional(),
      agentId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx

      const { data: leadData } = await supabase
        .from('leads')
        .select('id, score, source, full_name, agency_id')
        .eq('id', input.leadId)
        .maybeSingle()

      if (!leadData) {
        throw new Error('Lead nao encontrada para agendamento.')
      }

      if ((leadData.score ?? 0) < 70) {
        throw new Error('BLOQUEIO_QUALIFICACAO: lead precisa de score minimo 70 para gerar agendamento.')
      }

      // Get agent's agency_id
      const { data: agentData } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .single()

      const { data: call, error } = await supabase
        .from('calls')
        .insert({
          lead_id: input.leadId,
          client_id: input.clientId,
          agency_id: agentData?.agency_id,
          agent_id: input.agentId ?? user.id,
          scheduled_at: input.scheduledAt,
          duration_min: input.durationMin,
          status: 'scheduled',
          notes: input.notes,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      // Update lead last_contact_at
      await supabase
        .from('leads')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', input.leadId)

      const reminderDueAt = addMinutes(new Date(input.scheduledAt), -120).toISOString()
      await supabase
        .from('lead_interactions')
        .insert({
          lead_id: input.leadId,
          agency_id: agentData?.agency_id,
          user_id: input.agentId ?? user.id,
          type: 'task',
          direction: 'internal',
          subject: 'Lembrete pré-call (manual)',
          content: `Enviar mensagem personalizada para ${leadData.full_name} 2h antes da reunião.`,
          outcome: 'pending',
          metadata: {
            task_type: 'pre_call_manual_reminder',
            due_at: reminderDueAt,
            call_id: call.id,
            sla: '2h_before_call',
          },
        })

      return call
    }),

  updateOutcome: protectedProcedure
    .input(z.object({
      callId: z.string().uuid(),
      outcome: CallOutcomeSchema,
      notes: z.string().optional(),
      actualDurationMin: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data: call, error } = await supabase
        .from('calls')
        .update({
          outcome: input.outcome,
          notes: input.notes,
          actual_duration_min: input.actualDurationMin,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', input.callId)
        .select('lead_id')
        .single()

      if (error) throw new Error(error.message)

      // Map outcome to lead status
      const outcomeToStatus: Record<string, string> = {
        advanced: 'proposal',
        lost: 'lost',
        no_show: 'contacted',
        scheduled_followup: 'contacted',
      }

      const newStatus = outcomeToStatus[input.outcome]
      if (newStatus && call.lead_id) {
        await supabase
          .from('leads')
          .update({ status: newStatus, last_contact_at: new Date().toISOString() })
          .eq('id', call.lead_id)
      }

      return call
    }),

  getCalendar: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid().optional(),
      agentId: z.string().uuid().optional(),
      clientId: z.string().uuid().optional(),
      dateFrom: z.string(),
      dateTo: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx

      let query = supabase
        .from('calls')
        .select(`
          *,
          lead:leads(id, full_name, email, phone, source, score, temperature),
          agent:users(id, full_name, avatar_url)
        `)
        .gte('scheduled_at', input.dateFrom)
        .lte('scheduled_at', input.dateTo)
        .order('scheduled_at', { ascending: true })

      if (input.agentId) query = query.eq('agent_id', input.agentId)
      if (input.clientId) query = query.eq('client_id', input.clientId)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data ?? []
    }),

  getMetrics: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      agentId: z.string().uuid().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx
      const dateFrom = new Date(Date.now() - input.days * 86400000).toISOString()

      let query = supabase
        .from('calls')
        .select('status, outcome, actual_duration_min, agent_id')
        .eq('agency_id', input.agencyId)
        .gte('scheduled_at', dateFrom)

      if (input.agentId) query = query.eq('agent_id', input.agentId)

      const { data: calls, error } = await query
      if (error) throw new Error(error.message)

      const total = calls?.length ?? 0
      const completed = calls?.filter(c => c.status === 'completed').length ?? 0
      const noShow = calls?.filter(c => c.outcome === 'no_show').length ?? 0
      const advanced = calls?.filter(c => c.outcome === 'advanced').length ?? 0
      const durations = calls?.filter(c => c.actual_duration_min).map(c => c.actual_duration_min!) ?? []

      return {
        total,
        completed,
        noShow,
        showUpRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        conversionRate: completed > 0 ? Math.round((advanced / completed) * 100) : 0,
        avgDuration: durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0,
      }
    }),

  getPreCallBriefing: protectedProcedure
    .input(z.object({ callId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data: call } = await supabase
        .from('calls')
        .select('lead_id, notes')
        .eq('id', input.callId)
        .single()

      if (!call?.lead_id) throw new Error('Call not found')

      const [leadResult, interactionsResult, prevCallsResult] = await Promise.all([
        supabase.from('leads').select('*').eq('id', call.lead_id).single(),
        supabase
          .from('lead_interactions')
          .select('*')
          .eq('lead_id', call.lead_id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('calls')
          .select('scheduled_at, outcome, notes')
          .eq('lead_id', call.lead_id)
          .eq('status', 'completed')
          .order('scheduled_at', { ascending: false })
          .limit(3),
      ])

      return {
        lead: leadResult.data,
        recentInteractions: interactionsResult.data ?? [],
        previousCalls: prevCallsResult.data ?? [],
        callNotes: call.notes,
      }
    }),
})
