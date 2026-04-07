/**
 * Email template: New Lead Notification
 *
 * Sent to the agency team when a new lead arrives with score >= threshold.
 * Used by: form submit endpoint, automation-engine
 */

interface LeadNotificationData {
  agentName:   string
  leadName:    string
  email:       string
  phone:       string
  company:     string
  source:      string
  score:       number
  temperature: 'hot' | 'warm' | 'cold'
  challenge?:  string
  budget?:     string
  crmUrl:      string
}

export function leadNotificationTemplate(data: LeadNotificationData): { subject: string; html: string } {
  const emoji   = data.temperature === 'hot' ? '🔥' : data.temperature === 'warm' ? '🌡️' : '🧊'
  const color   = data.temperature === 'hot' ? '#E84545' : data.temperature === 'warm' ? '#F5A623' : '#8AAEC8'
  const subject = `${emoji} Novo Lead: ${data.leadName} — Score ${data.score}/100`

  const scoreWidth = Math.round(data.score)

  const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0D1117; }
  .wrapper { max-width: 560px; margin: 40px auto; }
  .card { background: #141B24; border-radius: 16px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #0D1117, #141B24); padding: 28px 32px; border-bottom: 2px solid ${color}; }
  .badge { display: inline-flex; align-items: center; gap: 6px; background: ${color}22; color: ${color}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.08em; }
  .name { color: #F0F6FC; font-size: 22px; font-weight: 800; margin-top: 8px; }
  .body { padding: 24px 32px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .label { color: #8AAEC8; font-size: 13px; }
  .value { color: #F0F6FC; font-size: 13px; font-weight: 700; }
  .score-bar { height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin: 16px 0 4px; }
  .score-fill { height: 100%; width: ${scoreWidth}%; background: ${color}; border-radius: 3px; }
  .challenge { background: rgba(255,255,255,0.04); border-left: 3px solid #21A0C4; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; color: #8AAEC8; font-size: 13px; line-height: 1.5; }
  .btn { display: block; background: #21A0C4; color: #fff; text-decoration: none; font-weight: 700; font-size: 14px; text-align: center; padding: 14px 24px; border-radius: 12px; margin-top: 20px; }
  .footer { padding: 16px 32px; color: #4A6680; font-size: 11px; border-top: 1px solid rgba(255,255,255,0.06); }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="badge">${emoji} ${data.temperature.toUpperCase()}</div>
        <div class="name">${data.leadName}</div>
      </div>
      <div class="body">
        <p style="color:#8AAEC8;font-size:13px;margin-bottom:16px">Olá ${data.agentName}, chegou um novo lead!</p>

        <div class="row"><span class="label">📧 Email</span><span class="value">${data.email || '—'}</span></div>
        <div class="row"><span class="label">📱 Telefone</span><span class="value">${data.phone || '—'}</span></div>
        <div class="row"><span class="label">🏢 Empresa</span><span class="value">${data.company || '—'}</span></div>
        <div class="row"><span class="label">📣 Canal</span><span class="value">${data.source}</span></div>
        ${data.budget ? `<div class="row"><span class="label">💰 Orçamento</span><span class="value">${data.budget}</span></div>` : ''}

        <div style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="color:#8AAEC8;font-size:12px">Score IA</span>
            <span style="color:${color};font-size:13px;font-weight:800">${data.score}/100</span>
          </div>
          <div class="score-bar"><div class="score-fill"></div></div>
        </div>

        ${data.challenge ? `<div class="challenge"><strong style="color:#F0F6FC">Desafio:</strong><br>${data.challenge}</div>` : ''}

        <a class="btn" href="${data.crmUrl}">Ver no CRM →</a>
      </div>
      <div class="footer">HYPE Flow OS &middot; ${new Date().toLocaleString('pt-PT')}</div>
    </div>
  </div>
</body>
</html>`

  return { subject, html }
}
