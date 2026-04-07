/**
 * call-reminders — Supabase Edge Function
 *
 * Triggered by: pg_cron schedule (every 15 minutes via automation-scheduler)
 * OR: called directly via POST with { run: true }
 *
 * Responsibilities:
 *   1. Find calls scheduled in the next 24h that haven't had a reminder sent
 *   2. Find calls scheduled in the next 1h (urgent reminder)
 *   3. Send WhatsApp message + email to the lead for each call
 *   4. Mark reminder_sent = true on the call
 *
 * ENV vars required:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   WA_TOKEN, WA_PHONE_NUMBER_ID
 *   RESEND_API_KEY, EMAIL_FROM
 *   NEXT_PUBLIC_APP_URL (for CRM link)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

/* ─── types ─── */

interface CallRow {
  id: string
  agency_id: string
  client_id: string
  lead_id: string | null
  agent_id: string | null
  scheduled_at: string
  duration_min: number
  meet_link: string | null
  status: string
  notes: string | null
  lead: {
    full_name: string
    email: string | null
    phone: string | null
  } | null
  agent: {
    full_name: string
    email: string
  } | null
}

/* ─── WhatsApp sender ─── */

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const token   = Deno.env.get('WA_TOKEN')
  const phoneId = Deno.env.get('WA_PHONE_NUMBER_ID')

  if (!token || !phoneId) {
    console.log('[call-reminders] WA not configured — preview:', message.slice(0, 80))
    return false
  }

  const cleaned = phone.replace(/\D/g, '')
  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleaned,
      type: 'text',
      text: { preview_url: false, body: message },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[call-reminders] WA error:', err)
    return false
  }

  return true
}

/* ─── Email sender via Resend ─── */

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key  = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM') ?? 'noreply@hypeflow.pt'

  if (!key) {
    console.log('[call-reminders] Resend not configured — preview email to:', to)
    return false
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    console.error('[call-reminders] Resend error:', await res.text())
    return false
  }

  return true
}

/* ─── Message builders ─── */

function buildWAMessage(call: CallRow, urgent: boolean): string {
  const dateStr = new Date(call.scheduled_at).toLocaleString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Lisbon',
  })

  const prefix = urgent
    ? '⏰ *Lembrete: a sua call começa em 1 hora!*'
    : '📅 *Lembrete: call agendada para amanhã*'

  const lines = [
    prefix,
    '',
    `📆 *Data:* ${dateStr}`,
    `👤 *Com:* ${call.agent?.full_name ?? 'Equipa HYPE Flow'}`,
    call.notes ? `📝 *Notas:* ${call.notes}` : '',
    '',
  ]

  if (call.meet_link) {
    lines.push(`🔗 *Entrar no Google Meet:*`)
    lines.push(call.meet_link)
    lines.push('')
  }

  lines.push('_HYPE Flow OS · Não responda a esta mensagem_')

  return lines.filter(l => l !== undefined).join('\n')
}

function buildEmailHTML(call: CallRow, urgent: boolean): string {
  const dateStr = new Date(call.scheduled_at).toLocaleString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Lisbon',
  })

  const title = urgent ? 'A sua call começa em 1 hora!' : 'Lembrete de call — amanhã'

  return `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, sans-serif; background: #0D1117; color: #F0F6FC; margin: 0; }
  .container { max-width: 520px; margin: 40px auto; background: #141B24; border-radius: 16px; overflow: hidden; }
  .header { background: #21A0C4; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 800; color: #fff; }
  .body { padding: 32px; }
  .row { display: flex; justify-content: space-between; margin-bottom: 12px; }
  .label { color: #8AAEC8; font-size: 13px; }
  .value { color: #F0F6FC; font-size: 13px; font-weight: 700; }
  .btn { display: block; background: #D1FF00; color: #0D1117; text-decoration: none; font-weight: 700; font-size: 14px; text-align: center; padding: 14px 24px; border-radius: 12px; margin-top: 24px; }
  .footer { padding: 16px 32px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11px; color: #4A6680; }
</style></head>
<body>
  <div class="container">
    <div class="header"><h1>📅 ${title}</h1></div>
    <div class="body">
      <p style="color:#8AAEC8;margin-top:0">Olá ${call.lead?.full_name ?? 'Cliente'},</p>
      <p style="color:#F0F6FC">Este é um lembrete da sua reunião agendada com a equipa HYPE Flow.</p>
      <div class="row"><span class="label">Data & Hora</span><span class="value">${dateStr}</span></div>
      <div class="row"><span class="label">Duração</span><span class="value">${call.duration_min} minutos</span></div>
      <div class="row"><span class="label">Consultor</span><span class="value">${call.agent?.full_name ?? 'Equipa HYPE Flow'}</span></div>
      ${call.meet_link ? `<a class="btn" href="${call.meet_link}">Entrar no Google Meet</a>` : ''}
    </div>
    <div class="footer">HYPE Flow OS · Não responda a este email</div>
  </div>
</body>
</html>`
}

/* ─── Main processor ─── */

async function processReminders() {
  const now     = new Date()
  const in24h   = new Date(now.getTime() + 24 * 3600 * 1000)
  const in25h   = new Date(now.getTime() + 25 * 3600 * 1000)
  const in1h    = new Date(now.getTime() +  1 * 3600 * 1000)
  const in75min = new Date(now.getTime() + 75 * 60  * 1000)

  const fmt = (d: Date) => d.toISOString()

  // Fetch calls due for 24h reminder (scheduled 24-25h from now, not yet reminded)
  const { data: calls24h, error: err24 } = await supabase
    .from('calls')
    .select('*, lead:leads(full_name, email, phone), agent:users(full_name, email)')
    .eq('status', 'scheduled')
    .eq('reminder_sent', false)
    .gte('scheduled_at', fmt(in24h))
    .lte('scheduled_at', fmt(in25h))

  if (err24) throw err24

  // Fetch calls due for 1h urgent reminder (scheduled 60-75 min from now)
  const { data: calls1h, error: err1 } = await supabase
    .from('calls')
    .select('*, lead:leads(full_name, email, phone), agent:users(full_name, email)')
    .eq('status', 'scheduled')
    .gte('scheduled_at', fmt(in1h))
    .lte('scheduled_at', fmt(in75min))

  if (err1) throw err1

  let processed = 0
  const allCalls = [
    ...((calls24h ?? []) as CallRow[]).map(c => ({ call: c, urgent: false })),
    ...((calls1h  ?? []) as CallRow[]).map(c => ({ call: c, urgent: true })),
  ]

  for (const { call, urgent } of allCalls) {
    const waMessage   = buildWAMessage(call, urgent)
    const emailSubject = urgent ? '⏰ A sua call começa em 1 hora!' : '📅 Lembrete de call — amanhã'
    const emailHTML   = buildEmailHTML(call, urgent)

    // Send WhatsApp to lead
    if (call.lead?.phone) {
      await sendWhatsApp(call.lead.phone, waMessage)
    }

    // Send email to lead
    if (call.lead?.email) {
      await sendEmail(call.lead.email, emailSubject, emailHTML)
    }

    // Send email to agent
    if (call.agent?.email) {
      await sendEmail(
        call.agent.email,
        urgent ? `⏰ Call em 1 hora: ${call.lead?.full_name}` : `📅 Call amanhã: ${call.lead?.full_name}`,
        emailHTML
      )
    }

    // Mark reminder sent
    await supabase
      .from('calls')
      .update({ reminder_sent: true })
      .eq('id', call.id)

    processed++
    console.log(`[call-reminders] Sent ${urgent ? '1h' : '24h'} reminder for call ${call.id} — ${call.lead?.full_name ?? 'unknown'}`)
  }

  return { processed, calls24h: calls24h?.length ?? 0, calls1h: calls1h?.length ?? 0 }
}

/* ─── HTTP handler ─── */

serve(async () => {
  try {
    const result = await processReminders()
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[call-reminders] Fatal error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
