/**
 * Email template: Call Reminder
 *
 * Sent 24h and 1h before a scheduled call.
 * Used by: call-reminders edge function
 */

interface CallReminderData {
  leadName:   string
  agentName:  string
  callDate:   string       // formatted date string (pt-PT)
  duration:   number       // minutes
  meetLink:   string | null
  urgent:     boolean      // true = 1h reminder, false = 24h
}

export function callReminderTemplate(data: CallReminderData): { subject: string; html: string } {
  const title   = data.urgent ? 'A sua call começa em 1 hora!' : 'Lembrete: call amanhã'
  const subject = data.urgent ? `⏰ ${title}` : `📅 ${title}`
  const icon    = data.urgent ? '⏰' : '📅'

  const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0D1117; }
  .wrapper { max-width: 560px; margin: 40px auto; }
  .card { background: #141B24; border-radius: 16px; overflow: hidden; }
  .header { background: ${data.urgent ? '#F5A623' : '#21A0C4'}; padding: 28px 32px; }
  .header h1 { color: #fff; font-size: 20px; font-weight: 800; }
  .header p  { color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; }
  .body { padding: 32px; }
  .greeting { color: #8AAEC8; font-size: 14px; margin-bottom: 16px; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .info-label { color: #8AAEC8; font-size: 13px; }
  .info-value { color: #F0F6FC; font-size: 13px; font-weight: 700; }
  .btn { display: block; background: #D1FF00; color: #0D1117; text-decoration: none; font-weight: 800; font-size: 14px; text-align: center; padding: 16px 24px; border-radius: 12px; margin-top: 24px; }
  .footer { padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06); }
  .footer p { color: #4A6680; font-size: 11px; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>${icon} ${title}</h1>
        <p>HYPE Flow OS — Portal do Cliente</p>
      </div>
      <div class="body">
        <p class="greeting">Olá ${data.leadName},</p>
        <p style="color:#8AAEC8;font-size:14px;margin-bottom:24px">
          ${data.urgent
            ? 'A sua reunião começa em menos de 1 hora. Certifique-se de que está preparado!'
            : 'Este é um lembrete da sua reunião agendada para amanhã.'}
        </p>

        <div class="info-row">
          <span class="info-label">📅 Data &amp; Hora</span>
          <span class="info-value">${data.callDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">⏱ Duração</span>
          <span class="info-value">${data.duration} minutos</span>
        </div>
        <div class="info-row">
          <span class="info-label">👤 Consultor</span>
          <span class="info-value">${data.agentName}</span>
        </div>

        ${data.meetLink ? `<a class="btn" href="${data.meetLink}">Entrar no Google Meet →</a>` : ''}
      </div>
      <div class="footer">
        <p>HYPE Flow OS &middot; Não responda a este email &middot; <a href="#" style="color:#21A0C4">Cancelar notificações</a></p>
      </div>
    </div>
  </div>
</body>
</html>`

  return { subject, html }
}
