import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

/* ─── Typeform payload types ─── */
interface TypeformAnswer {
  type: 'text' | 'email' | 'phone_number' | 'choice' | 'choices' | 'number' | 'boolean' | 'long_text'
  field: { id: string; ref: string; type: string }
  text?: string
  email?: string
  phone_number?: string
  number?: number
  boolean?: boolean
  choice?: { label: string }
  choices?: { labels: string[] }
}

interface TypeformPayload {
  event_id: string
  event_type: 'form_response'
  form_response: {
    form_id: string
    token: string
    submitted_at: string
    definition: {
      title: string
      fields: Array<{ id: string; ref: string; title: string; type: string }>
    }
    answers: TypeformAnswer[]
    hidden?: Record<string, string>
    variables?: Record<string, string | number>
  }
}

/* ─── field mapping: Typeform ref → CRM field ─── */
const FIELD_MAP: Record<string, string> = {
  full_name: 'full_name',
  name: 'full_name',
  email: 'email',
  phone: 'phone',
  phone_number: 'phone',
  company: 'company',
  challenge: 'challenge',
  budget: 'budget',
  source: 'source',
}

function extractAnswer(answer: TypeformAnswer): string {
  switch (answer.type) {
    case 'text':
    case 'long_text': return answer.text ?? ''
    case 'email':     return answer.email ?? ''
    case 'phone_number': return answer.phone_number ?? ''
    case 'number':    return String(answer.number ?? '')
    case 'boolean':   return answer.boolean ? 'Sim' : 'Não'
    case 'choice':    return answer.choice?.label ?? ''
    case 'choices':   return answer.choices?.labels.join(', ') ?? ''
    default:          return ''
  }
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('base64')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

/* ─── POST /api/webhooks/typeform ─── */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('typeform-signature') ?? ''
  const secret = process.env.TYPEFORM_WEBHOOK_SECRET ?? ''

  // Verify signature in production
  if (secret && !verifySignature(rawBody, signature, secret)) {
    console.warn('[TYPEFORM] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: TypeformPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (payload.event_type !== 'form_response') {
    return NextResponse.json({ received: true, skipped: true })
  }

  const { form_response } = payload

  // Map answers to CRM fields
  const mapped: Record<string, string> = {}
  for (const answer of form_response.answers) {
    const ref = answer.field.ref.toLowerCase()
    const crmField = FIELD_MAP[ref] ?? ref
    mapped[crmField] = extractAnswer(answer)
  }

  // Compute score
  const score = mapped.budget?.includes('€5.000') || mapped.budget?.includes('€15') ? 85 : 60
  const temperature = score >= 75 ? 'hot' : score >= 50 ? 'warm' : 'cold'

  const leadData = {
    full_name: mapped.full_name ?? 'Lead Typeform',
    email: mapped.email ?? '',
    phone: mapped.phone ?? '',
    company: mapped.company ?? '',
    source: 'typeform',
    form_id: form_response.form_id,
    form_token: form_response.token,
    raw_answers: mapped,
    ai_score: score,
    temperature,
    submitted_at: form_response.submitted_at,
  }

  const supabase = await createServiceClient()

  // Resolve first pipeline stage for the agency
  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('id, agency_id')
    .eq('position', 1)
    .limit(1)
    .single()

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      full_name:         leadData.full_name,
      email:             leadData.email || null,
      phone:             leadData.phone || null,
      company:           leadData.company || null,
      source:            'typeform',
      ai_score:          score,
      temperature:       temperature,
      pipeline_stage_id: stage?.id ?? null,
      agency_id:         stage?.agency_id ?? null,
      raw_answers:       leadData.raw_answers,
      form_id:           leadData.form_id,
      submitted_at:      leadData.submitted_at,
    })
    .select('id')
    .single()

  if (leadError) {
    console.error('[TYPEFORM] Supabase insert error:', leadError)
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
  }

  console.log('[TYPEFORM WEBHOOK] Saved lead', lead.id, leadData.full_name, `score=${score}`)

  return NextResponse.json({ received: true, leadId: lead.id })
}
