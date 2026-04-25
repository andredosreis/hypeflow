import { NextRequest, NextResponse } from 'next/server'
import { requireSession, getClientIp } from '@/lib/api/with-session'
import { rateLimit } from '@/lib/api/rate-limit'
import { automationRequestSchema } from '@/lib/api/zod-schemas'

interface AutomationNode {
  id: string
  tipo: 'trigger' | 'condicao' | 'acao' | 'delay' | 'branch' | 'fim'
  config: Record<string, unknown>
  next: string[]
}

const MAX_BODY_BYTES = 16_384

const SYSTEM_PROMPT = `És um assistente especializado em converter descrições em português de fluxos de automação de vendas em JSON estruturado.

REGRAS:
- Devolve APENAS JSON válido — sem texto, sem markdown, sem explicações
- Cada nó tem: id (string), tipo, config (objecto), next (array de ids)
- Usa IDs simples: "t1", "a1", "c1", "d1", "b1", "fim"

TIPOS DE NÓ:
- trigger: {gatilho: "novo_lead"|"score_atingido"|"fase_mudou"|"tag_adicionada"|"inactividade", valor?: string}
- condicao: {campo: "score"|"temperatura"|"canal"|"fase"|"tag", operador: "maior"|"igual"|"contem", valor: string}
- acao: {accao: "enviar_email"|"enviar_whatsapp"|"enviar_sms"|"mover_pipeline"|"adicionar_tag"|"notificar_responsavel"|"actualizar_score", config: {...}}
- delay: {horas?: number, dias?: number}
- branch: {condicao: string, sim: string, nao: string} — next deve ser []
- fim: {}

FORMATO DE SAÍDA:
{"nodes": [...], "nome": "...", "descricao": "..."}

Exemplo simples: "quando lead chega a score 80, notificar o closer"
→ {"nodes":[{"id":"t1","tipo":"trigger","config":{"gatilho":"score_atingido","valor":"80"},"next":["a1"]},{"id":"a1","tipo":"acao","config":{"accao":"notificar_responsavel","config":{"mensagem":"Lead atingiu score 80"}},"next":["fim"]},{"id":"fim","tipo":"fim","config":{},"next":[]}],"nome":"Score 80 → Notificação","descricao":"Notifica o closer quando lead atinge score 80"}`

function getMockFlow(prompt: string): { nodes: AutomationNode[]; nome: string; descricao: string } {
  const lower = prompt.toLowerCase()
  const hasWhatsapp = lower.includes('whatsapp') || lower.includes('wa')
  const hasEmail = lower.includes('email')
  const hasScore = lower.includes('score')

  const nodes: AutomationNode[] = [
    {
      id: 't1',
      tipo: 'trigger',
      config: { gatilho: hasScore ? 'score_atingido' : 'novo_lead', valor: hasScore ? '80' : undefined },
      next: ['a1'],
    },
  ]

  if (hasWhatsapp) {
    nodes.push({
      id: 'a1',
      tipo: 'acao',
      config: { accao: 'enviar_whatsapp', config: { mensagem: 'Olá {nome}, temos novidades para si!' } },
      next: ['d1'],
    })
    nodes.push({ id: 'd1', tipo: 'delay', config: { horas: 4 }, next: ['a2'] })
    if (hasEmail) {
      nodes.push({
        id: 'a2',
        tipo: 'acao',
        config: { accao: 'enviar_email', config: { assunto: 'Follow-up', corpo: 'Ainda sem resposta?' } },
        next: ['fim'],
      })
    } else {
      nodes.push({
        id: 'a2',
        tipo: 'acao',
        config: { accao: 'notificar_responsavel', config: { mensagem: 'Lead sem resposta após 4h' } },
        next: ['fim'],
      })
    }
  } else if (hasEmail) {
    nodes.push({
      id: 'a1',
      tipo: 'acao',
      config: { accao: 'enviar_email', config: { assunto: 'Boas-vindas', corpo: 'Olá {nome}!' } },
      next: ['fim'],
    })
  } else {
    nodes.push({
      id: 'a1',
      tipo: 'acao',
      config: { accao: 'notificar_responsavel', config: { mensagem: 'Novo evento detectado' } },
      next: ['fim'],
    })
  }

  nodes.push({ id: 'fim', tipo: 'fim', config: {}, next: [] })

  return {
    nodes,
    nome: `Automação gerada por IA`,
    descricao: prompt.slice(0, 120),
  }
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

  // 2. Rate limit
  const ip = getClientIp(req.headers)
  if (!ip) {
    return NextResponse.json({ error: 'Missing client IP' }, { status: 400 })
  }
  const { allowed, retryAfter } = await rateLimit(ip, 'automation')
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  // 3. Parse + validate
  const rawBody: unknown = await req.json().catch(() => null)
  const parsed = automationRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const body = parsed.data

  // 4. Anthropic key — with dev-only mock fallback
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      return NextResponse.json({ flow: getMockFlow(body.prompt), demo: true })
    }
    console.error('[ai/automation] ANTHROPIC_API_KEY missing — returning 500')
    return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
  }

  // 5. Anthropic call
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
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: `Converte esta descrição em JSON de automação:\n\n"${body.prompt}"` },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '<unreadable>')
      console.error('[ai/automation] Anthropic error', {
        status: response.status,
        body: errText,
        userId: user.id,
      })
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 })
    }

    const data = (await response.json()) as { content?: Array<{ text?: string }> }
    const text = data.content?.[0]?.text ?? ''

    let flow: { nodes: AutomationNode[]; nome: string; descricao: string }
    try {
      const match = text.match(/\{[\s\S]*\}/)
      flow = JSON.parse(match ? match[0] : text) as typeof flow
    } catch {
      flow = getMockFlow(body.prompt)
    }

    return NextResponse.json({ flow })
  } catch (err) {
    console.error('[ai/automation] exception', { err, userId: user.id })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
