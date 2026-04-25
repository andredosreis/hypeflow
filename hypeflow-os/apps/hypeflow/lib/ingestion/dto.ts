import { z } from 'zod'

/**
 * Lead DTO canonical schema (FDD §5). Every adapter normalizes its
 * provider-specific payload into this shape before the hub processes it.
 *
 * `source.platform` is REQUIRED — an adapter that cannot determine the
 * platform must throw at adapter level so the failure surfaces in CI.
 *
 * `agency_id` is intentionally absent — the hub derives it from `client_id`
 * after lookup. Providers must never claim to know the agency.
 */
export const leadDtoSchema = z
  .object({
    event_id: z.string().min(1),
    provider: z.string().min(1),
    client_id: z.string().uuid(),
    received_at: z.string().datetime(),
    contact: z
      .object({
        name: z.string().max(200).optional(),
        email: z.string().max(254).optional(),
        phone: z.string().max(40).optional(),
      })
      .refine(
        (c) => !!(c.name || c.email || c.phone),
        { message: 'contact must have at least one of name, email, phone' },
      ),
    source: z.object({
      platform: z.string().min(1),
      campaign_id: z.string().optional(),
      ad_id: z.string().optional(),
      creative_id: z.string().optional(),
    }),
    utm: z.object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      content: z.string().optional(),
      term: z.string().optional(),
    }).optional().default({}),
    metadata: z.record(z.string(), z.unknown()).optional().default({}),
    raw_payload: z.record(z.string(), z.unknown()),
    schema_version: z.literal('v1'),
  })

export type LeadDTO = z.infer<typeof leadDtoSchema>
