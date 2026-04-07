import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

type TriggerType =
  | 'lead_stage_changed'
  | 'lead_no_contact'
  | 'lead_created'
  | 'call_scheduled'
  | 'call_no_show'
  | 'lead_lost'
  | 'score_changed'

interface AutomationAction {
  type: string
  delay_hours: number
  config: Record<string, unknown>
}

interface AutomationRule {
  id: string
  agency_id: string
  client_id: string | null
  trigger_type: TriggerType
  trigger_config: Record<string, unknown>
  conditions: Array<{ field: string; operator: string; value: unknown }>
  actions: AutomationAction[]
}

function evaluateConditions(
  conditions: AutomationRule['conditions'],
  lead: Record<string, unknown>
): boolean {
  if (!conditions.length) return true

  return conditions.every(({ field, operator, value }) => {
    const fieldVal = lead[field]
    switch (operator) {
      case 'eq': return fieldVal === value
      case 'neq': return fieldVal !== value
      case 'gt': return Number(fieldVal) > Number(value)
      case 'lt': return Number(fieldVal) < Number(value)
      case 'contains':
        return Array.isArray(fieldVal)
          ? fieldVal.includes(value)
          : String(fieldVal).includes(String(value))
      case 'in':
        return Array.isArray(value) ? (value as unknown[]).includes(fieldVal) : false
      default: return true
    }
  })
}

async function executeAction(
  action: AutomationAction,
  lead: Record<string, unknown>,
  agencyId: string
): Promise<{ type: string; success: boolean; error?: string }> {
  try {
    switch (action.type) {
      case 'send_webhook': {
        const { url } = action.config as { url: string }
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'automation_trigger',
            timestamp: new Date().toISOString(),
            agency_id: agencyId,
            lead,
          }),
        })
        return { type: action.type, success: res.ok }
      }

      case 'move_stage': {
        const { stage_id } = action.config as { stage_id: string }
        await supabase
          .from('leads')
          .update({ pipeline_stage_id: stage_id, stage_entered_at: new Date().toISOString() })
          .eq('id', lead.id as string)
        return { type: action.type, success: true }
      }

      case 'assign_agent': {
        const { agent_id } = action.config as { agent_id: string }
        await supabase
          .from('leads')
          .update({ agent_id })
          .eq('id', lead.id as string)
        return { type: action.type, success: true }
      }

      case 'add_tag': {
        const { tag } = action.config as { tag: string }
        const currentTags = (lead.tags as string[]) ?? []
        if (!currentTags.includes(tag)) {
          await supabase
            .from('leads')
            .update({ tags: [...currentTags, tag] })
            .eq('id', lead.id as string)
        }
        return { type: action.type, success: true }
      }

      case 'notify_agent': {
        // In-app notification via Supabase Realtime broadcast
        const { message } = action.config as { message: string }
        const { agent_id } = lead as { agent_id: string }
        if (agent_id) {
          await supabase.channel(`agent-${agent_id}`).send({
            type: 'broadcast',
            event: 'automation_notification',
            payload: { message, lead_id: lead.id, lead_name: lead.full_name },
          })
        }
        return { type: action.type, success: true }
      }

      case 'trigger_manychat_flow': {
        const { flow_ns, subscriber_id } = action.config as { flow_ns: string; subscriber_id?: string }
        const mcKey = Deno.env.get('MANYCHAT_API_KEY')
        if (!mcKey) return { type: action.type, success: false, error: 'No ManyChat API key' }

        const res = await fetch('https://api.manychat.com/fb/sending/sendFlow', {
          method: 'POST',
          headers: { Authorization: `Bearer ${mcKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriber_id: subscriber_id ?? lead.manychat_id, flow_ns }),
        })
        return { type: action.type, success: res.ok }
      }

      default:
        return { type: action.type, success: true } // send_email, send_whatsapp — handled by separate services
    }
  } catch (err) {
    return { type: action.type, success: false, error: String(err) }
  }
}

async function processAutomations(triggerType: TriggerType, lead: Record<string, unknown>) {
  // Get matching rules
  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('agency_id', lead.agency_id as string)
    .eq('trigger_type', triggerType)
    .eq('is_active', true)

  if (!rules?.length) return

  for (const rule of rules as AutomationRule[]) {
    // Check client_id filter
    if (rule.client_id && rule.client_id !== lead.client_id) continue

    // Evaluate conditions
    if (!evaluateConditions(rule.conditions, lead)) continue

    // Execute actions (respect delay_hours — for now, execute immediately; delays via scheduler)
    const actionsExecuted: Array<{ type: string; success: boolean; error?: string }> = []
    for (const action of rule.actions.filter(a => a.delay_hours === 0)) {
      const result = await executeAction(action, lead, rule.agency_id)
      actionsExecuted.push(result)
    }

    // Schedule delayed actions
    const delayedActions = rule.actions.filter(a => a.delay_hours > 0)
    if (delayedActions.length) {
      // Store in a scheduled_actions table (simplified: log for now)
      console.log(`[automation-engine] ${delayedActions.length} delayed actions queued for rule ${rule.id}`)
    }

    const allSuccess = actionsExecuted.every(a => a.success)

    // Log execution
    await supabase.from('automation_logs').insert({
      rule_id: rule.id,
      agency_id: rule.agency_id,
      lead_id: lead.id as string,
      trigger_data: { trigger_type: triggerType, lead_id: lead.id },
      actions_executed: actionsExecuted,
      status: allSuccess ? 'success' : 'partial_failure',
    })

    // Update execution count
    await supabase
      .from('automation_rules')
      .update({
        execution_count: (rule as Record<string, unknown>).execution_count as number + 1,
        last_executed_at: new Date().toISOString(),
      })
      .eq('id', rule.id)
  }
}

serve(async (req) => {
  try {
    const body = await req.json() as {
      trigger_type: TriggerType
      lead_id: string
    }

    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', body.lead_id)
      .single()

    if (!lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404 })
    }

    await processAutomations(body.trigger_type, lead)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('automation-engine error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
