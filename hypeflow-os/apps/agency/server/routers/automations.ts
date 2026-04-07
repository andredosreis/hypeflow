import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

const ActionSchema = z.object({
  type: z.enum([
    'send_whatsapp', 'send_email', 'move_stage', 'assign_agent',
    'add_tag', 'create_task', 'send_webhook', 'notify_agent',
    'trigger_manychat_flow',
  ]),
  delay_hours: z.number().default(0),
  config: z.record(z.unknown()).default({}),
})

const ConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'gt', 'lt', 'contains', 'in']),
  value: z.unknown(),
})

export const automationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      clientId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      let query = supabase
        .from('automation_rules')
        .select('id, name, is_active, trigger_type, execution_count, last_executed_at, created_at')
        .eq('agency_id', input.agencyId)
        .order('created_at', { ascending: false })

      if (input.clientId) query = query.eq('client_id', input.clientId)
      else query = query.is('client_id', null)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data ?? []
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error) throw new Error(error.message)
      return data
    }),

  create: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      clientId: z.string().uuid().optional(),
      name: z.string().min(1),
      triggerType: z.string(),
      triggerConfig: z.record(z.unknown()).default({}),
      conditions: z.array(ConditionSchema).default([]),
      actions: z.array(ActionSchema).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx

      const { data, error } = await supabase
        .from('automation_rules')
        .insert({
          agency_id: input.agencyId,
          client_id: input.clientId ?? null,
          name: input.name,
          trigger_type: input.triggerType,
          trigger_config: input.triggerConfig,
          conditions: input.conditions,
          actions: input.actions,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
      conditions: z.array(ConditionSchema).optional(),
      actions: z.array(ActionSchema).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx
      const { id, isActive, ...rest } = input

      const { data, error } = await supabase
        .from('automation_rules')
        .update({
          ...(rest.name && { name: rest.name }),
          ...(isActive !== undefined && { is_active: isActive }),
          ...(rest.conditions && { conditions: rest.conditions }),
          ...(rest.actions && { actions: rest.actions }),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }),

  getLogs: protectedProcedure
    .input(z.object({
      ruleId: z.string().uuid().optional(),
      agencyId: z.string().uuid(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      let query = supabase
        .from('automation_logs')
        .select('*, rule:automation_rules(name)')
        .eq('agency_id', input.agencyId)
        .order('executed_at', { ascending: false })
        .limit(input.limit)

      if (input.ruleId) query = query.eq('rule_id', input.ruleId)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data ?? []
    }),

  getDashboardStats: protectedProcedure
    .input(z.object({ agencyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx
      const today = new Date().toISOString().split('T')[0]

      const [rulesResult, logsToday, logsTotal] = await Promise.all([
        supabase
          .from('automation_rules')
          .select('id, is_active, execution_count')
          .eq('agency_id', input.agencyId),
        supabase
          .from('automation_logs')
          .select('status')
          .eq('agency_id', input.agencyId)
          .gte('executed_at', today + 'T00:00:00'),
        supabase
          .from('automation_logs')
          .select('status')
          .eq('agency_id', input.agencyId)
          .gte('executed_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      ])

      const rules = rulesResult.data ?? []
      const todayLogs = logsToday.data ?? []
      const totalLogs = logsTotal.data ?? []

      const successRate = totalLogs.length > 0
        ? Math.round((totalLogs.filter(l => l.status === 'success').length / totalLogs.length) * 100)
        : 100

      return {
        totalRules: rules.length,
        activeRules: rules.filter(r => r.is_active).length,
        executionsToday: todayLogs.length,
        successRate,
        top5: rules
          .sort((a, b) => (b.execution_count ?? 0) - (a.execution_count ?? 0))
          .slice(0, 5),
      }
    }),
})
