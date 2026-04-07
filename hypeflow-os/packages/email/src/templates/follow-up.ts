/**
 * Email template: Lead Follow-Up
 *
 * Sent by automation-engine after a call or trigger action.
 * Supports: post-call summary, no-show follow-up, proposal follow-up, reactivation.
 */

type FollowUpType = 'post_call' | 'no_show' | 'proposal' | 'reactivation'

interface FollowUpData {
  type:        FollowUpType
  leadName:    string
  agentName:   string
  agentEmail:  string
  company?:    string
  callDate?:   string         // ISO string, used for post_call and no_show
  nextStepUrl?: string        // CTA link (proposal URL, calendar link, etc.)
  customNote?: string         // Optional personalised paragraph from agent
}

const CONFIG: Record<FollowUpType, { subject: string; icon: string; accentColor: string; title: string }> = {
  post_call: {
    subject:      '📋 Resumo da nossa conversa',
    icon:         '📋',
    accentColor:  '#21A0C4',
    title:        'Obrigado pela conversa!',
  },
  no_show: {
    subject:      '📅 Tentámos falar consigo',
    icon:         '📅',
    accentColor:  '#F5A623',
    title:        'Sentimos a sua falta',
  },
  proposal: {
    subject:      '📄 A sua proposta está pronta',
    icon:         '📄',
    accentColor:  '#00E5A0',
    title:        'Proposta enviada',
  },
  reactivation: {
    subject:      '👋 Voltámos a pensar em si',
    icon:         '👋',
    accentColor:  '#D1FF00',
    title:        'Ainda podemos ajudar',
  },
}

const BODY_COPY: Record<FollowUpType, (data: FollowUpData) => string> = {
  post_call: (d) =>
    `Foi um prazer falar consigo${d.callDate ? ` no dia ${d.callDate}` : ''}. Como prometido, seguem em baixo os próximos passos acordados na nossa conversa.`,
  no_show: (d) =>
    `Tentámos fazer a chamada${d.callDate ? ` a ${d.callDate}` : ''} mas não conseguimos contactá-lo/a. Sem problema — estas coisas acontecem! Gostaríamos de reagendar quando for conveniente.`,
  proposal: () =>
    `Preparámos uma proposta personalizada com base no que discutimos. Pode consultá-la no link abaixo e ficamos disponíveis para qualquer questão.`,
  reactivation: (d) =>
    `Há algum tempo que não falamos e queríamos verificar se ainda podemos ser úteis${d.company ? ` à ${d.company}` : ''}. O mercado mudou muito e temos novas soluções que podem ser relevantes para si.`,
}

export function followUpTemplate(data: FollowUpData): { subject: string; html: string } {
  const cfg = CONFIG[data.type]
  const bodyCopy = BODY_COPY[data.type](data)

  const ctaLabel: Record<FollowUpType, string> = {
    post_call:    'Ver próximos passos →',
    no_show:      'Reagendar chamada →',
    proposal:     'Ver proposta →',
    reactivation: 'Falar connosco →',
  }

  const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${cfg.subject}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0D1117; }
  .wrapper { max-width: 560px; margin: 40px auto; }
  .card { background: #141B24; border-radius: 16px; overflow: hidden; }
  .header { padding: 28px 32px; border-bottom: 2px solid ${cfg.accentColor}; background: #0D1117; }
  .badge { display: inline-flex; align-items: center; gap: 6px; background: ${cfg.accentColor}22; color: ${cfg.accentColor}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.08em; }
  .header h1 { color: #F0F6FC; font-size: 20px; font-weight: 800; margin-top: 8px; }
  .body { padding: 32px; }
  .greeting { color: #8AAEC8; font-size: 14px; margin-bottom: 12px; }
  .text { color: #8AAEC8; font-size: 14px; line-height: 1.7; margin-bottom: 16px; }
  .note-box { background: rgba(255,255,255,0.04); border-left: 3px solid ${cfg.accentColor}; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; color: #8AAEC8; font-size: 13px; line-height: 1.6; }
  .btn { display: block; background: ${cfg.accentColor}; color: ${data.type === 'reactivation' ? '#0D1117' : '#fff'}; text-decoration: none; font-weight: 800; font-size: 14px; text-align: center; padding: 16px 24px; border-radius: 12px; margin-top: 24px; }
  .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 24px 0; }
  .sig { display: flex; gap: 12px; align-items: center; margin-top: 8px; }
  .sig-avatar { width: 40px; height: 40px; background: ${cfg.accentColor}22; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .sig-name { color: #F0F6FC; font-size: 13px; font-weight: 700; }
  .sig-email { color: #4A6680; font-size: 12px; }
  .footer { padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06); }
  .footer p { color: #4A6680; font-size: 11px; text-align: center; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="badge">${cfg.icon} ${data.type.replace('_', ' ').toUpperCase()}</div>
        <h1>${cfg.title}</h1>
      </div>
      <div class="body">
        <p class="greeting">Olá ${data.leadName},</p>
        <p class="text">${bodyCopy}</p>

        ${data.customNote ? `<div class="note-box">${data.customNote}</div>` : ''}

        ${data.nextStepUrl
          ? `<a class="btn" href="${data.nextStepUrl}">${ctaLabel[data.type]}</a>`
          : ''}

        <div class="divider"></div>

        <p class="text" style="font-size:13px;margin-bottom:16px">Qualquer questão, estou disponível:</p>
        <div class="sig">
          <div class="sig-avatar">👤</div>
          <div>
            <div class="sig-name">${data.agentName}</div>
            <div class="sig-email"><a href="mailto:${data.agentEmail}" style="color:#21A0C4;text-decoration:none">${data.agentEmail}</a></div>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>HYPE Flow OS &middot; Não responda a este email &middot; <a href="#" style="color:#21A0C4">Cancelar notificações</a></p>
      </div>
    </div>
  </div>
</body>
</html>`

  return { subject: cfg.subject, html }
}
