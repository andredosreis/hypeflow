import { z } from 'zod'
import { createTRPCRouter, agencyProcedure } from '../../trpc'

export const leadsRouter = createTRPCRouter({
  list: agencyProcedure
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

  getById: agencyProcedure
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

  create: agencyProcedure
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
      const { supabase, agencyUser: user } = ctx

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

  update: agencyProcedure
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

  calculateScore: agencyProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      // Get lead + recent interactions
      const [leadRes, interactionsRes] = await Promise.all([
        supabase.from('leads').select('*').eq('id', input.leadId).single(),
        supabase
          .from('lead_interactions')
          .select('type, created_at, outcome')
          .eq('lead_id', input.leadId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false }),
      ])

      if (leadRes.error) throw new Error(leadRes.error.message)
      const lead = leadRes.data
      const interactions = interactionsRes.data ?? []

      // Scoring rules
      const SCORE_EVENTS: Record<string, number> = {
        whatsapp: 20,
        call: 30,
        email: 8,
        note: 5,
        status_change: 10,
        meeting: 25,
        task: 5,
      }

      let score = 10 // Base score for existing lead

      // Add points from interactions
      for (const interaction of interactions) {
        score += SCORE_EVENTS[interaction.type] ?? 5
        // Bonus for positive outcomes
        if (interaction.outcome?.toLowerCase().includes('interessado')) score += 10
        if (interaction.outcome?.toLowerCase().includes('proposta')) score += 15
        if (interaction.outcome?.toLowerCase().includes('ganho')) score += 20
      }

      // Decay based on days since last activity
      const lastActivity = lead.last_contact_at ? new Date(lead.last_contact_at) : new Date(lead.created_at)
      const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)

      if (hoursSinceActivity > 72) {
        const decayDays = Math.floor((hoursSinceActivity - 72) / 24)
        score -= decayDays * 8
      } else if (hoursSinceActivity > 24) {
        const decayDays = Math.floor((hoursSinceActivity - 24) / 24)
        score -= decayDays * 3
      }

      // Clamp 0-100
      const finalScore = Math.min(100, Math.max(0, score))

      // Determine temperature
      const temperature = finalScore >= 70 ? 'hot' : finalScore >= 40 ? 'warm' : 'cold'

      // Update lead
      const { data, error } = await supabase
        .from('leads')
        .update({
          score: finalScore,
          temperature,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.leadId)
        .select()
        .single()

      if (error) throw new Error(error.message)

      return {
        lead: data,
        scoreBreakdown: {
          baseScore: 10,
          interactionPoints: interactions.map(i => ({
            type: i.type,
            points: SCORE_EVENTS[i.type] ?? 5,
            date: i.created_at,
          })),
          decayApplied: hoursSinceActivity > 24 ? Math.floor((hoursSinceActivity - 24) / 24) * 3 : 0,
          finalScore,
          temperature,
        },
      }
    }),

  applyScoreDecay: agencyProcedure
    .input(z.object({ agencyId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      // Get all active leads
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, score, last_contact_at, created_at, temperature')
        .eq('agency_id', input.agencyId)
        .not('status', 'eq', 'won')
        .not('status', 'eq', 'lost')

      if (error) throw new Error(error.message)

      const now = Date.now()
      const updates: { id: string; score: number; temperature: string }[] = []

      for (const lead of leads ?? []) {
        const lastActivity = lead.last_contact_at ? new Date(lead.last_contact_at) : new Date(lead.created_at)
        const hoursSince = (now - lastActivity.getTime()) / (1000 * 60 * 60)

        let score = lead.score ?? 50

        if (hoursSince > 72) {
          score -= 8
        } else if (hoursSince > 24) {
          score -= 3
        }

        score = Math.min(100, Math.max(0, score))
        const temperature = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold'

        if (score !== lead.score || temperature !== lead.temperature) {
          updates.push({ id: lead.id, score, temperature })
        }
      }

      // Batch update
      for (const u of updates) {
        await supabase
          .from('leads')
          .update({ score: u.score, temperature: u.temperature, updated_at: new Date().toISOString() })
          .eq('id', u.id)
      }

      return { updated: updates.length, total: (leads ?? []).length }
    }),

  addInteraction: agencyProcedure
    .input(z.object({
      leadId: z.string().uuid(),
      agencyId: z.string().uuid(),
      type: z.enum(['call', 'email', 'whatsapp', 'note', 'status_change', 'meeting', 'task']),
      content: z.string().optional(),
      outcome: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, agencyUser: user } = ctx

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
