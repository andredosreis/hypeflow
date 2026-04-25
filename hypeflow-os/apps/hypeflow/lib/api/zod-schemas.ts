import { z } from 'zod'

/**
 * Zod schemas for /api/ai/* route bodies.
 *
 * Story 01.9 (audit C6). Bounds chosen to block DoS without throttling legitimate use:
 *   - messages array ≤ 20 items (typical chat length)
 *   - message content ≤ 4000 chars each (~1000 tokens)
 *   - context string fields ≤ 500 chars each
 *   - copy fields bounded to typical product descriptions
 *   - automation prompt ≤ 2000 chars (one paragraph max)
 */

const agentMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
})

export const agentRequestSchema = z.object({
  messages: z.array(agentMessageSchema).min(1).max(20),
  context: z
    .object({
      lead_name: z.string().max(500).optional(),
      lead_score: z.number().finite().optional(),
      lead_stage: z.string().max(500).optional(),
      lead_source: z.string().max(500).optional(),
      last_interaction: z.string().max(500).optional(),
    })
    .optional(),
  mode: z.enum(['chat', 'autonomous']).optional(),
})

export const copyRequestSchema = z.object({
  product: z.string().min(1).max(200),
  audience: z.string().min(1).max(200),
  objective: z.enum(['aquecer', 'qualificar', 'fechar', 'reactivar', 'nutrir']),
  tone: z.enum(['profissional', 'casual', 'urgente', 'empatico']),
  channel: z.enum(['email', 'whatsapp', 'sms']),
})

export const automationRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
})

export type AgentRequest = z.infer<typeof agentRequestSchema>
export type CopyRequest = z.infer<typeof copyRequestSchema>
export type AutomationRequest = z.infer<typeof automationRequestSchema>
