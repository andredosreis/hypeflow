/**
 * Portal Pipeline Router
 *
 * Provides read access to the client's pipeline.
 * Allows a client user to move a lead between stages (limited write).
 */

import { z } from 'zod'
import { createTRPCRouter, clientProcedure } from '../trpc'

export const pipelineRouter = createTRPCRouter({
  getBoard: clientProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx

    // Get pipeline stages for this agency
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, name, position, color, sla_hours, is_won, is_terminal')
      .eq('agency_id', user.agency_id)
      .eq('is_terminal', false)
      .order('position', { ascending: true })

    // Get leads for this client with stage info
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, full_name, source, score, temperature, pipeline_stage_id, created_at, stage_entered_at')
      .eq('client_id', user.client_id)
      .not('status', 'eq', 'closed')
      .not('status', 'eq', 'lost')

    if (error) throw new Error(error.message)

    // Group leads by stage
    const boardStages = (stages ?? []).map(stage => ({
      ...stage,
      leads: (leads ?? []).filter(l => l.pipeline_stage_id === stage.id),
    }))

    return boardStages
  }),

  /**
   * moveCard — client users can move their own leads between stages
   * (agency reviews the move in their dashboard)
   */
  moveCard: clientProcedure
    .input(z.object({
      lead_id:    z.string().uuid(),
      stage_id:   z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx

      // Verify the lead belongs to this client
      const { data: lead } = await supabase
        .from('leads')
        .select('id, client_id')
        .eq('id', input.lead_id)
        .eq('client_id', user.client_id)
        .single()

      if (!lead) throw new Error('Lead not found or access denied')

      const { error } = await supabase
        .from('leads')
        .update({
          pipeline_stage_id: input.stage_id,
          stage_entered_at:  new Date().toISOString(),
          updated_at:        new Date().toISOString(),
        })
        .eq('id', input.lead_id)

      if (error) throw new Error(error.message)

      // Log the stage change as a lead interaction
      await supabase.from('lead_interactions').insert({
        lead_id:  input.lead_id,
        agency_id: user.agency_id,
        type:     'pipeline_move',
        content:  'Cliente moveu lead para nova etapa via portal',
        metadata: { stage_id: input.stage_id, moved_by: 'client_portal', user_id: user.id },
      }).catch(console.error)

      return { success: true }
    }),
})
