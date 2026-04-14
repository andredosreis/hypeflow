import { z } from 'zod'
import { createTRPCRouter, agencyProcedure } from '../../trpc'

const DEFAULT_STAGES: Array<{
  name: string
  position: number
  color: string
  sla_hours: number | null
  is_terminal: boolean
  is_won: boolean
}> = [
  { name: 'Triagem/Backlog', position: 0, color: '#3D6080', sla_hours: null, is_terminal: false, is_won: false },
  { name: 'Nova (Lead Quente)', position: 1, color: '#21A0C4', sla_hours: 1, is_terminal: false, is_won: false },
  { name: 'Tentativa de Contato', position: 2, color: '#4FC8EA', sla_hours: 24, is_terminal: false, is_won: false },
  { name: 'Diagnostico/Demo', position: 3, color: '#F5A623', sla_hours: 48, is_terminal: false, is_won: false },
  { name: 'Aguardando Integracao/Acessos', position: 4, color: '#D1FF00', sla_hours: 72, is_terminal: false, is_won: false },
  { name: 'Follow-up Ativo', position: 5, color: '#00E5A0', sla_hours: 72, is_terminal: false, is_won: false },
  { name: 'Reengajamento IA', position: 6, color: '#E84545', sla_hours: null, is_terminal: false, is_won: false },
]

const HIDDEN_STAGES = new Set(['Triagem/Backlog', 'Reengajamento IA'])

export const pipelineRouter = createTRPCRouter({
  getBoard: agencyProcedure
    .input(z.object({
      clientId: z.string().uuid().optional(),
      agencyId: z.string().uuid(),
      agentId: z.string().uuid().optional(),
      source: z.string().optional(),
      temperature: z.enum(['cold', 'warm', 'hot']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data: existingStages } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('agency_id', input.agencyId)
        .limit(1)

      if (!existingStages?.length) {
        await supabase.from('pipeline_stages').insert(
          DEFAULT_STAGES.map((stage) => ({
            agency_id: input.agencyId,
            name: stage.name,
            position: stage.position,
            color: stage.color,
            sla_hours: stage.sla_hours,
            is_terminal: stage.is_terminal ?? false,
            is_won: stage.is_won ?? false,
          }))
        )
      }

      // Get pipeline stages
      let stagesQuery = supabase
        .from('pipeline_stages')
        .select('*')
        .eq('agency_id', input.agencyId)
        .order('position', { ascending: true })

      if (input.clientId) {
        const { data: clientStages } = await supabase
          .from('pipeline_stages')
          .select('*, pipeline_configs!inner(client_id)')
          .eq('pipeline_configs.client_id', input.clientId)
          .order('position', { ascending: true })

        if (clientStages?.length) {
          const stages = clientStages
          // Get leads for each stage
          const leadsWithStages = await Promise.all(
            stages.map(async (stage) => {
              let query = supabase
                .from('leads')
                .select('id, full_name, email, phone, source, score, temperature, agent_id, stage_entered_at, created_at, tags, status')
                .eq('pipeline_stage_id', stage.id)
                .neq('status', 'lost')
                .order('stage_entered_at', { ascending: true })
                .limit(50)

              if (input.agentId) query = query.eq('agent_id', input.agentId)
              if (input.source) query = query.eq('source', input.source)
              if (input.temperature) query = query.eq('temperature', input.temperature)

              const { data: leads } = await query
              return { ...stage, leads: leads ?? [] }
            })
          )
          return leadsWithStages
        }
      }

      const { data: stagesRaw } = await stagesQuery
      if (!stagesRaw) return []
      const stages = stagesRaw as Array<{ id: string; name: string; position: number; color: string; sla_hours: number | null; is_won: boolean; is_terminal: boolean }>

      const stageByName = new Map(stages.map((stage) => [stage.name, stage]))
      const backlogStageId = stageByName.get('Triagem/Backlog')?.id
      const novaStageId = stageByName.get('Nova (Lead Quente)')?.id ?? stages[0]?.id
      const reengStageId = stageByName.get('Reengajamento IA')?.id

      if (backlogStageId && novaStageId) {
        await supabase
          .from('leads')
          .update({ pipeline_stage_id: novaStageId, stage_entered_at: new Date().toISOString() })
          .eq('agency_id', input.agencyId)
          .is('pipeline_stage_id', null)
          .or('score.gt.70,last_contact_at.not.is.null,first_contact_at.not.is.null')

        await supabase
          .from('leads')
          .update({ pipeline_stage_id: backlogStageId, stage_entered_at: new Date().toISOString() })
          .eq('agency_id', input.agencyId)
          .is('pipeline_stage_id', null)
      }

      if (reengStageId) {
        const staleFromStages = stages
          .filter((stage) => ['Nova (Lead Quente)', 'Qualificando', 'Tentativa de Contato'].includes(stage.name))
          .map((stage) => stage.id)

        if (staleFromStages.length > 0) {
          const cutoffIso = new Date(Date.now() - 48 * 3600000).toISOString()
          await supabase
            .from('leads')
            .update({ pipeline_stage_id: reengStageId, stage_entered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('agency_id', input.agencyId)
            .in('pipeline_stage_id', staleFromStages)
            .lt('stage_entered_at', cutoffIso)
        }
      }

      const firstStageId = novaStageId
      if (firstStageId) {
        await supabase
          .from('leads')
          .update({ pipeline_stage_id: firstStageId, stage_entered_at: new Date().toISOString() })
          .eq('agency_id', input.agencyId)
          .is('pipeline_stage_id', null)
      }

      const visibleStages = stages.filter((stage) => !HIDDEN_STAGES.has(stage.name))

      const leadsWithStages = await Promise.all(
        visibleStages.map(async (stage) => {
          let query = supabase
            .from('leads')
            .select('id, full_name, email, phone, source, source_type, score, temperature, agent_id, stage_entered_at, created_at, tags, last_contact_at, first_contact_at')
            .eq('pipeline_stage_id', stage.id)
            .eq('agency_id', input.agencyId)
            .order('stage_entered_at', { ascending: true })
            .limit(50)

          if (input.clientId) query = query.eq('client_id', input.clientId)
          if (input.agentId) query = query.eq('agent_id', input.agentId)
          if (input.source) query = query.eq('source', input.source)
          if (input.temperature) query = query.eq('temperature', input.temperature)

          const { data: leads } = await query
          return { ...stage, leads: leads ?? [] }
        })
      )

      return leadsWithStages
    }),

  updateLeadStage: agencyProcedure
    .input(z.object({
      leadId: z.string().uuid(),
      stageId: z.string().uuid(),
      checklist: z.object({
        estimatedValue: z.number().positive(),
        closeDate: z.string().min(8),
        diagnosticLink: z.string().url(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      const [{ data: stage }, { data: lead }] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('id, name')
          .eq('id', input.stageId)
          .maybeSingle(),
        supabase
          .from('leads')
          .select('id, tags')
          .eq('id', input.leadId)
          .maybeSingle(),
      ])

      const requiresTransitionChecklist = Boolean(
        stage?.name && ['Diagnostico/Demo', 'Follow-up Ativo'].includes(stage.name)
      )

      const existingTags = lead?.tags ?? []
      const hasChecklistFromTags = existingTags.some((tag: string) => tag.startsWith('deal_value:'))
        && existingTags.some((tag: string) => tag.startsWith('close_date:'))
        && existingTags.some((tag: string) => tag.startsWith('diagnostic_link:'))

      if (requiresTransitionChecklist && !input.checklist && !hasChecklistFromTags) {
        throw new Error('CHECKLIST_REQUIRED: Valor estimado, data de fechamento e link de diagnostico sao obrigatorios para esta transicao.')
      }

      const mergedTags = [...existingTags]
      if (input.checklist) {
        const stripKeys = ['deal_value:', 'close_date:', 'diagnostic_link:']
        const cleaned = mergedTags.filter((tag: string) => !stripKeys.some(prefix => tag.startsWith(prefix)))
        mergedTags.length = 0
        mergedTags.push(...cleaned)
        mergedTags.push(
          `deal_value:${input.checklist.estimatedValue}`,
          `close_date:${input.checklist.closeDate}`,
          `diagnostic_link:${input.checklist.diagnosticLink}`,
        )
      }

      const { data, error } = await supabase
        .from('leads')
        .update({
          pipeline_stage_id: input.stageId,
          stage_entered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: mergedTags,
        })
        .eq('id', input.leadId)
        .select('id, pipeline_stage_id, stage_entered_at')
        .single()

      if (error) throw new Error(error.message)
      return data
    }),

  getStages: agencyProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      clientId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('agency_id', input.agencyId)
        .order('position', { ascending: true })

      if (error) throw new Error(error.message)
      return data ?? []
    }),

  updateStages: agencyProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      stages: z.array(z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        position: z.number(),
        color: z.string().default('#21A0C4'),
        sla_hours: z.number().nullable().optional(),
        is_terminal: z.boolean().default(false),
        is_won: z.boolean().default(false),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      const upserts = input.stages.map(stage => ({
        ...stage,
        agency_id: input.agencyId,
        id: stage.id ?? undefined,
      }))

      const { data, error } = await supabase
        .from('pipeline_stages')
        .upsert(upserts)
        .select()

      if (error) throw new Error(error.message)
      return data
    }),
})
