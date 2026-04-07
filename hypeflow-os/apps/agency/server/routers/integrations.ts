import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const integrationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      agencyId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data, error } = await supabase
        .from('integrations')
        .select('id, provider, status, last_sync, external_account_name, error_message')
        .eq('client_id', input.clientId)
        .eq('agency_id', input.agencyId)

      if (error) throw new Error(error.message)
      return data ?? []
    }),

  disconnect: protectedProcedure
    .input(z.object({ integrationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { error } = await supabase
        .from('integrations')
        .update({ status: 'disconnected', access_token: null, refresh_token: null })
        .eq('id', input.integrationId)

      if (error) throw new Error(error.message)
      return { success: true }
    }),

  getOAuthUrl: protectedProcedure
    .input(z.object({
      provider: z.enum(['meta', 'google_ads', 'google_calendar', 'linkedin']),
      clientId: z.string().uuid(),
      agencyId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const state = Buffer.from(JSON.stringify({
        provider: input.provider,
        clientId: input.clientId,
        agencyId: input.agencyId,
      })).toString('base64')

      const urls: Record<string, string> = {
        meta: `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${process.env.META_REDIRECT_URI}&scope=ads_read,ads_management,business_management&state=${state}`,
        google_ads: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=https://www.googleapis.com/auth/adwords+https://www.googleapis.com/auth/userinfo.email&access_type=offline&prompt=consent&state=${state}`,
        google_calendar: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=https://www.googleapis.com/auth/calendar+https://www.googleapis.com/auth/calendar.events+https://www.googleapis.com/auth/userinfo.email&access_type=offline&prompt=consent&state=${state}`,
        linkedin: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${process.env.LINKEDIN_REDIRECT_URI}&scope=r_ads+r_ads_reporting&state=${state}`,
      }

      return { url: urls[input.provider] }
    }),

  processExternalContractEvent: protectedProcedure
    .input(z.object({
      provider: z.enum(['docusign', 'stripe', 'manual']),
      leadId: z.string().uuid(),
      contractValue: z.number().positive().optional(),
      eventRef: z.string().min(3),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, agency_id, tags')
        .eq('id', input.leadId)
        .maybeSingle()

      if (leadError || !lead) throw new Error('Lead não encontrada para webhook reverso.')

      const { data: wonStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('agency_id', lead.agency_id)
        .eq('is_won', true)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle()

      const value = input.contractValue ?? 1200
      const cleanTags = (lead.tags ?? []).filter((tag: string) => !tag.startsWith('deal_value:'))
      cleanTags.push(`deal_value:${value}`)
      cleanTags.push(`external_event:${input.provider}:${input.eventRef}`)

      await supabase
        .from('leads')
        .update({
          status: 'closed',
          pipeline_stage_id: wonStage?.id ?? null,
          stage_entered_at: new Date().toISOString(),
          tags: cleanTags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.leadId)

      await supabase.from('automation_logs').insert({
        rule_id: null,
        agency_id: lead.agency_id,
        lead_id: input.leadId,
        trigger_data: { provider: input.provider, eventRef: input.eventRef },
        actions_executed: [{ type: 'close_lead_from_external_event', value }],
        status: 'success',
        error_message: null,
      })

      return { success: true }
    }),

  listErrorLogs: protectedProcedure
    .input(z.object({ agencyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx
      const [integrationsErrors, automationErrors] = await Promise.all([
        supabase
          .from('integrations')
          .select('id, provider, client_id, error_message, updated_at')
          .eq('agency_id', input.agencyId)
          .not('error_message', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(30),
        supabase
          .from('automation_logs')
          .select('id, lead_id, error_message, executed_at')
          .eq('agency_id', input.agencyId)
          .eq('status', 'error')
          .order('executed_at', { ascending: false })
          .limit(30),
      ])

      return {
        integrationErrors: integrationsErrors.data ?? [],
        automationErrors: automationErrors.data ?? [],
      }
    }),

  reprocessIntegration: protectedProcedure
    .input(z.object({ integrationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data: integration, error } = await supabase
        .from('integrations')
        .select('id, provider, client_id')
        .eq('id', input.integrationId)
        .maybeSingle()

      if (error || !integration) throw new Error('Integração não encontrada para reprocessamento.')

      if (integration.provider === 'meta') {
        await supabase.functions.invoke('sync-meta-ads', { body: { clientId: integration.client_id } })
      }

      await supabase
        .from('integrations')
        .update({ error_message: null, status: 'active' })
        .eq('id', input.integrationId)

      return { success: true }
    }),
})
