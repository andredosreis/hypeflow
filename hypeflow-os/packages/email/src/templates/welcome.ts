/**
 * Email template: Welcome to Client Portal
 *
 * Sent when a client_user is created and the portal invite is issued.
 * Used by: client-onboarding edge function, manual invite action
 */

interface WelcomeData {
  clientName:  string   // e.g. "TechnoSpark"
  contactName: string   // first name of the contact person
  portalUrl:   string   // magic-link or login URL
  agentName:   string   // assigned consultant name
  agentEmail:  string
}

export function welcomeTemplate(data: WelcomeData): { subject: string; html: string } {
  const subject = `🎉 Bem-vindo ao portal ${data.clientName} — HYPE Flow`

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
  .hero { background: linear-gradient(135deg, #0D1117 0%, #141B24 50%, #1A2535 100%); padding: 48px 32px; text-align: center; border-bottom: 2px solid #D1FF00; }
  .logo { font-size: 28px; font-weight: 900; color: #D1FF00; letter-spacing: -0.03em; margin-bottom: 8px; }
  .hero-title { color: #F0F6FC; font-size: 22px; font-weight: 800; margin-top: 16px; }
  .hero-sub { color: #8AAEC8; font-size: 14px; margin-top: 6px; }
  .body { padding: 32px; }
  .greeting { color: #F0F6FC; font-size: 16px; font-weight: 700; margin-bottom: 12px; }
  .text { color: #8AAEC8; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
  .feature-list { list-style: none; margin: 20px 0; }
  .feature-list li { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8AAEC8; font-size: 14px; }
  .feature-list li:last-child { border-bottom: none; }
  .feature-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .btn { display: block; background: #D1FF00; color: #0D1117; text-decoration: none; font-weight: 800; font-size: 15px; text-align: center; padding: 16px 24px; border-radius: 12px; margin-top: 28px; }
  .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 24px 0; }
  .agent-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 16px; display: flex; gap: 12px; align-items: center; }
  .agent-info p { color: #F0F6FC; font-size: 13px; font-weight: 700; }
  .agent-info span { color: #8AAEC8; font-size: 12px; }
  .footer { padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; }
  .footer p { color: #4A6680; font-size: 11px; line-height: 1.6; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="hero">
        <div class="logo">⚡ HYPE</div>
        <div class="hero-title">Bem-vindo, ${data.contactName}!</div>
        <div class="hero-sub">O seu portal de resultados está pronto</div>
      </div>
      <div class="body">
        <p class="greeting">Olá ${data.contactName},</p>
        <p class="text">
          A sua conta no HYPE Flow OS foi criada com sucesso. A partir de agora tem acesso a um painel
          dedicado à ${data.clientName} com toda a informação das suas campanhas em tempo real.
        </p>

        <ul class="feature-list">
          <li><span class="feature-icon">📊</span><span>Dashboard com KPIs de performance e ROI das campanhas</span></li>
          <li><span class="feature-icon">👥</span><span>Gestão de leads com score IA e temperatura de conversão</span></li>
          <li><span class="feature-icon">📅</span><span>Calendário de calls e lembretes automáticos</span></li>
          <li><span class="feature-icon">🔀</span><span>Pipeline Kanban para acompanhar o funil de vendas</span></li>
          <li><span class="feature-icon">📈</span><span>Relatório de ROI por canal (Meta, Google, TikTok)</span></li>
        </ul>

        <a class="btn" href="${data.portalUrl}">Aceder ao Portal →</a>

        <div class="divider"></div>

        <p class="text" style="font-size:13px">O link acima é válido por 24 horas. Após o primeiro acesso defina a sua senha permanente.</p>

        <div class="agent-card">
          <div style="font-size:32px">👤</div>
          <div class="agent-info">
            <p>${data.agentName}</p>
            <span>O seu consultor dedicado · <a href="mailto:${data.agentEmail}" style="color:#21A0C4;text-decoration:none">${data.agentEmail}</a></span>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>HYPE Flow OS &middot; ${data.clientName}<br>
        Não partilhe este link com terceiros &middot; <a href="#" style="color:#21A0C4">Suporte</a></p>
      </div>
    </div>
  </div>
</body>
</html>`

  return { subject, html }
}
