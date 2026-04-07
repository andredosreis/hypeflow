import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const leadsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      clientId: z.string().uuid().optional(),
      status: z.string().optional(),
      source: z.string().optional(),
      temperature: z.enum(['cold', 'warm', 'hot']).optional(),
      agentId: z.string().uuid().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx
      const offset = (input.page - 1) * input.limit

      let query = supabase
        .from('leads')
        .select('*, agent:users(id, full_name, avatar_url)', { count: 'exact' })
        .eq('agency_id', input.agencyId)

      if (input.clientId) query = query.eq('client_id', input.clientId)
      if (input.status) query = query.eq('status', input.status)
      if (input.source) query = query.eq('source', input.source)
      if (input.temperature) query = query.eq('temperature', input.temperature)
      if (input.agentId) query = query.eq('agent_id', input.agentId)
      if (input.search) {
        query = query.or(`full_name.ilike.%${input.search}%,email.ilike.%${input.search}%,phone.ilike.%${input.search}%`)
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + input.limit - 1)

      if (error) throw new Error(error.message)

      return {
        leads: data ?? [],
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / input.limit),
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      const [leadResult, interactionsResult, callsResult] = await Promise.all([
        supabase
          .from('leads')
          .select('*, agent:users(id, full_name, avatar_url), stage:pipeline_stages(id, name, color)')
          .eq('id', input.id)
          .single(),
        supabase
          .from('lead_interactions')
          .select('*, user:users(id, full_name, avatar_url)')
          .eq('lead_id', input.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('calls')
          .select('*, agent:users(id, full_name)')
          .eq('lead_id', input.id)
          .order('scheduled_at', { ascending: false })
          .limit(10),
      ])

      if (leadResult.error) throw new Error(leadResult.error.message)

      return {
        lead: leadResult.data,
        interactions: interactionsResult.data ?? [],
        calls: callsResult.data ?? [],
      }
    }),

  create: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      clientId: z.string().uuid(),
      fullName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      source: z.string().default('manual'),
      temperature: z.enum(['cold', 'warm', 'hot']).default('cold'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx

      const { data: firstStage } = await supabase
        .from('pipeline_stages')
        .select('id, name')
        .eq('agency_id', input.agencyId)
        .order('position', { ascending: true })
        .limit(20)

      const preferredStage = firstStage?.find((stage) => stage.name === 'Nova (Lead Quente)')
      const fallbackStage = firstStage?.[0]
      const targetStageId = preferredStage?.id ?? fallbackStage?.id ?? null

      const isHighPriority = input.temperature === 'hot'

      const { data, error } = await supabase
        .from('leads')
        .insert({
          agency_id: input.agencyId,
          client_id: input.clientId,
          agent_id: user.id,
          full_name: input.fullName,
          email: input.email,
          phone: input.phone,
          source: input.source,
          source_type: ['meta', 'google_ads', 'instagram', 'linkedin', 'tiktok'].includes(input.source) ? 'paid' : 'manual',
          temperature: input.temperature,
          pipeline_stage_id: targetStageId,
          stage_entered_at: targetStageId ? new Date().toISOString() : null,
          first_contact_at: null,
          notes: input.notes,
          status: 'new',
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      if (isHighPriority) {
        await supabase.from('automation_logs').insert({
          rule_id: null,
          agency_id: input.agencyId,
          lead_id: data.id,
          trigger_data: { source: input.source, temperature: input.temperature },
          actions_executed: [
            { type: 'alert_slack_whatsapp', status: 'queued' },
            { type: 'ai_welcome_fallback_15m', status: 'queued' },
          ],
          status: 'queued',
          error_message: null,
        })
      }

      return data
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      temperature: z.enum(['cold', 'warm', 'hot']).optional(),
      score: z.number().min(0).max(100).optional(),
      agentId: z.string().uuid().optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx
      const { id, ...updates } = input

      const mapped = {
        ...(updates.temperature && { temperature: updates.temperature }),
        ...(updates.score !== undefined && { score: updates.score }),
        ...(updates.agentId && { agent_id: updates.agentId }),
        ...(updates.tags && { tags: updates.tags }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.status && { status: updates.status }),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('leads')
        .update(mapped)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }),

  addInteraction: protectedProcedure
    .input(z.object({
      leadId: z.string().uuid(),
      agencyId: z.string().uuid(),
      type: z.enum(['call', 'email', 'whatsapp', 'note', 'status_change', 'meeting', 'task']),
      content: z.string().optional(),
      outcome: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx

      const { data, error } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: input.leadId,
          agency_id: input.agencyId,
          user_id: user.id,
          type: input.type,
          content: input.content,
          outcome: input.outcome,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      // Update last_contact_at
      await supabase
        .from('leads')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', input.leadId)

      return data
    }),
})
