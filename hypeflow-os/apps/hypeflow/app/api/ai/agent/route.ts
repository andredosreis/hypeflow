import { NextRequest, NextResponse } from 'next/server'
import { requireSession, getClientIp } from '@/lib/api/with-session'
import { rateLimit } from '@/lib/api/rate-limit'
import { agentRequestSchema, type AgentRequest } from '@/lib/api/zod-schemas'

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

const MAX_BODY_BYTES = 16_384

const SYSTEM_PROMPT = `Você é o HYPE AI, um assistente especializado em CRM e vendas B2B integrado na plataforma HYPE Flow OS.

SUAS CAPACIDADES:
- Analisar leads e sugerir próximas acções de follow-up
- Resumir conversas e interacções com leads
- Redigir mensagens personalizadas (WhatsApp, email)
- Interpretar métricas e identificar oportunidades
- Alertar sobre leads que precisam de atenção urgente
- Sugerir playbooks e automações adequadas

CONTEXTO DA PLATAFORMA:
- A equipa usa stages: Nova → Qualificação → Proposta → Negociação → Fechado
- Score de 0 a 100 (>70 = HOT, 40-70 = WARM, <40 = COLD)
- Canais: WhatsApp, Email, Chamadas, Formulários

REGRAS:
- Responde SEMPRE em Português de Portugal
- Respostas concisas e accionáveis
- Quando sugerires mensagens, inclui o texto completo pronto a enviar
- Usa emojis com moderação, apenas quando adequado ao canal
- Nunca inventes dados — se não tiveres informação, diz claramente`

function renderContextBlock(context: NonNullable<AgentRequest['context']>): string {
  return `[CONTEXTO DO LEAD]
Nome: ${context.lead_name ?? '—'}
Score: ${context.lead_score ?? '—'}
Etapa: ${context.lead_stage ?? '—'}
Fonte: ${context.lead_source ?? '—'}
Última interacção: ${context.last_interaction ?? '—'}`
}

function getMockResponse(messages: AgentMessage[], context?: AgentRequest['context']): string {
  const lastMsg = messages[messages.length - 1]?.content.toLowerCase() ?? ''

  if (lastMsg.includes('score') || lastMsg.includes('qualidade')) {
    return `Com base no score ${context?.lead_score ?? 'actual'} e no comportamento recente, este lead está **WARM** — existe interesse mas ainda sem urgência.\n\n**Sugestão de próxima acção:**\n1. Enviar caso de estudo relevante para o sector deles\n2. Agendar uma call de 15 min nos próximos 3 dias\n3. Monitorizar abertura do email para avaliar interesse\n\nQuer que redija a mensagem de follow-up?`
  }

  if (lastMsg.includes('mensagem') || lastMsg.includes('whatsapp') || lastMsg.includes('escreve')) {
    const name = context?.lead_name ?? 'João'
    return `Aqui está uma mensagem personalizada para ${name}:\n\n---\n*Olá ${name}! 👋*\n\nEspero que esteja tudo bem.\n\nEu estive a analisar o vosso perfil e acredito que temos uma solução que pode fazer uma diferença real para o vosso negócio.\n\nTeria 15 minutos esta semana para uma conversa rápida?\n\n📞 Estou disponível: Seg-Sex, 9h-18h\n---\n\nPosei a usar tom informal para criar rapport. Quer ajustar o tom ou o conteúdo?`
  }

  if (lastMsg.includes('análise') || lastMsg.includes('resumo') || lastMsg.includes('status')) {
    return `**Análise do lead ${context?.lead_name ?? 'seleccionado'}**\n\n📊 Score: ${context?.lead_score ?? '—'}/100 (${(context?.lead_score ?? 0) >= 70 ? '🔥 HOT' : (context?.lead_score ?? 0) >= 40 ? '🌡️ WARM' : '🔵 COLD'})\n📍 Etapa: ${context?.lead_stage ?? '—'}\n📡 Fonte: ${context?.lead_source ?? '—'}\n\n**Pontos positivos:**\n- Perfil alinhado com o nosso ICP\n- Interacção recente demonstra interesse\n\n**Alertas:**\n- Sem resposta nos últimos 2 dias\n- Proposta por enviar\n\n**Recomendação:** Avançar com call esta semana antes que o interesse arrefeça.`
  }

  if (lastMsg.includes('playbook') || lastMsg.includes('sequência')) {
    return `Para este perfil, recomendo o **Playbook "Score Alto → Urgência"**:\n\n1. 📞 Call imediata (hoje)\n2. 💬 WhatsApp com proposta personalizada (hoje)\n3. 💬 Confirmar interesse (D+1)\n4. 📅 Reunião de fecho (D+2)\n\nEste playbook tem **41% de taxa de fecho** para leads com score similar.\n\nQuer que eu active o playbook automaticamente?`
  }

  return `Entendi a sua questão. Com base no contexto disponível, aqui estão as minhas sugestões:\n\n**Acção imediata:** Entrar em contacto com o lead nas próximas 24 horas para manter o momentum.\n\n**Mensagem sugerida:** Personalizar com base no histórico de interacções e sector do lead.\n\n**Próximo passo:** Agendar uma demonstração ou call de qualificação.\n\nPosso ajudar a redigir a mensagem, analisar o score, ou sugerir o playbook mais adequado. O que prefere?`
}

export async function POST(req: NextRequest) {
  // 0. Size guard
  const contentLength = Number(req.headers.get('content-length') ?? '0')
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  // 1. Auth gate
  const { response: authResponse, user } = await requireSession()
  if (authResponse) return authResponse

  // 2. Rate limit (per-IP, per-route)
  const ip = getClientIp(req.headers)
  if (!ip) {
    return NextResponse.json({ error: 'Missing client IP' }, { status: 400 })
  }
  const { allowed, retryAfter } = await rateLimit(ip, 'agent')
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  // 3. Parse + validate
  const rawBody: unknown = await req.json().catch(() => null)
  const parsed = agentRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const body = parsed.data

  // 4. Anthropic key check — with dev-only mock fallback
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      const content = getMockResponse(body.messages, body.context)
      return NextResponse.json({ content, demo: true })
    }
    console.error('[ai/agent] ANTHROPIC_API_KEY missing — returning 500')
    return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
  }

  // 5. Build messages — context goes to user-role, NOT system (prompt-injection hygiene)
  const apiMessages = [
    ...(body.context ? [{ role: 'user' as const, content: renderContextBlock(body.context) }] : []),
    ...body.messages.map((m) => ({ role: m.role, content: m.content })),
  ]
  const systemMsg =
    SYSTEM_PROMPT +
    (body.mode === 'autonomous'
      ? '\n\nMODO: AUTÓNOMO — Sugere a próxima acção mais impactante sem esperar instrução.'
      : '')

  // 6. Anthropic call
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemMsg,
        messages: apiMessages,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '<unreadable>')
      console.error('[ai/agent] Anthropic error', {
        status: response.status,
        body: errText,
        userId: user.id,
      })
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 })
    }

    const data = (await response.json()) as { content?: Array<{ text?: string }> }
    const content = data.content?.[0]?.text ?? ''
    return NextResponse.json({ content })
  } catch (err) {
    console.error('[ai/agent] exception', { err, userId: user.id })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
