import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/* ─── types ─── */
interface FormSubmission {
  formId: string
  slug: string
  values: Record<string, string>
  submittedAt: string
  leadData: {
    full_name: string
    email: string
    phone: string
    company: string
    challenge?: string
    budget?: string
    source?: string
    ai_score: number
    temperature: 'hot' | 'warm' | 'cold'
  }
}

/* ─── helpers ─── */
function computeScore(values: Record<string, string>): number {
  let score = 40 // base
  if (values.f7?.includes('€5.000') || values.f7?.includes('> €15.000')) score += 30
  else if (values.f7?.includes('€1.500')) score += 20
  else if (values.f7?.includes('€500')) score += 10
  if ((values.f6?.length ?? 0) > 50) score += 15
  if (values.f3) score += 10
  if (values.f2) score += 5
  return Math.min(score, 99)
}

function computeTemperature(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 75) return 'hot'
  if (score >= 50) return 'warm'
  return 'cold'
}

function buildWhatsAppMessage(data: FormSubmission['leadData'], slug: string): string {
  const emoji = data.temperature === 'hot' ? '🔥' : data.temperature === 'warm' ? '🌡️' : '🧊'
  return [
    `🎯 *Novo Lead via Formulário*`,
    ``,
    `👤 *Nome:* ${data.full_name}`,
    `📧 *Email:* ${data.email}`,
    `📱 *Telefone:* ${data.phone}`,
    `🏢 *Empresa:* ${data.company}`,
    data.challenge ? `💬 *Desafio:* ${data.challenge.slice(0, 120)}${data.challenge.length > 120 ? '...' : ''}` : '',
    data.budget ? `💰 *Orçamento:* ${data.budget}` : '',
    data.source ? `📣 *Canal:* ${data.source}` : '',
    ``,
    `${emoji} *Score IA:* ${data.ai_score}/100 · ${data.temperature.toUpperCase()}`,
    `🔗 *CRM:* https://app.hypeflow.io/comercial?lead=${encodeURIComponent(data.email)}`,
    ``,
    `_Formulário: ${slug} · ${new Date().toLocaleString('pt-PT')}_`,
  ].filter(Boolean).join('\n')
}

/* ─── POST /api/forms/[slug]/submit ─── */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json()
    const { formId, values } = body as { formId: string; values: Record<string, string> }

    if (!formId || !values) {
      return NextResponse.json({ error: 'Missing formId or values' }, { status: 400 })
    }

    // Extract lead data from form values (field mapping)
    const leadData: FormSubmission['leadData'] = {
      full_name: values.f1 ?? '',
      email: values.f2 ?? '',
      phone: values.f3 ?? '',
      company: values.f4 ?? '',
      challenge: values.f6,
      budget: values.f7,
      source: values.f8,
      ai_score: computeScore(values),
      temperature: computeTemperature(computeScore(values)),
    }

    const submission: FormSubmission = {
      formId,
      slug: params.slug,
      values,
      submittedAt: new Date().toISOString(),
      leadData,
    }

    const supabase = await createServiceClient()

    // 1. Resolve the form definition + first pipeline stage
    const [{ data: form }, { data: stage }] = await Promise.all([
      supabase
        .from('forms')
        .select('id, agency_id, client_id')
        .eq('slug', params.slug)
        .eq('is_published', true)
        .single(),
      supabase
        .from('pipeline_stages')
        .select('id, agency_id')
        .eq('position', 1)
        .limit(1)
        .single(),
    ])

    // 2. Insert the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        full_name:         leadData.full_name,
        email:             leadData.email || null,
        phone:             leadData.phone || null,
        company:           leadData.company || null,
        challenge:         leadData.challenge || null,
        budget:            leadData.budget || null,
        source:            leadData.source || 'form',
        ai_score:          leadData.ai_score,
        temperature:       leadData.temperature,
        pipeline_stage_id: stage?.id ?? null,
        agency_id:         form?.agency_id ?? stage?.agency_id ?? null,
        client_id:         form?.client_id ?? null,
        form_id:           formId,
        submitted_at:      submission.submittedAt,
      })
      .select('id')
      .single()

    if (leadError) {
      console.error('[FORM SUBMIT] Lead insert error:', leadError)
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
    }

    // 3. Insert one form_answer row per field
    const answers = Object.entries(values).map(([fieldId, answer]) => ({
      lead_id:  lead.id,
      field_id: fieldId,
      answer:   String(answer ?? ''),
    }))
    if (answers.length > 0) {
      await supabase.from('form_answers').insert(answers)
    }

    // 4. Send WhatsApp notification to agency number
    const waMessage = buildWhatsAppMessage(leadData, params.slug)
    const waToken   = process.env.WA_TOKEN
    const waPhoneId = process.env.WA_PHONE_NUMBER_ID
    const waNotify  = process.env.WA_NOTIFY_NUMBER

    if (waToken && waPhoneId && waNotify) {
      await fetch(`https://graph.facebook.com/v18.0/${waPhoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${waToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to:   waNotify,
          type: 'text',
          text: { body: waMessage },
        }),
      }).catch(err => console.error('[FORM SUBMIT] WA notification error:', err))
    }

    console.log('[FORM SUBMIT] Saved lead', lead.id, leadData.full_name, `score=${leadData.ai_score}`)

    return NextResponse.json({
      success:     true,
      leadId:      lead.id,
      score:       leadData.ai_score,
      temperature: leadData.temperature,
    })
  } catch (err) {
    console.error('[FORM SUBMIT ERROR]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ─── GET /api/forms/[slug] — fetch public form definition ─── */
export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = await createServiceClient()

  const { data: form, error } = await supabase
    .from('forms')
    .select('id, slug, title, description, is_published, fields:form_fields(*)')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (error || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  return NextResponse.json(form)
}
