import { NextRequest, NextResponse } from 'next/server'
import { requireSession, getClientIp } from '@/lib/api/with-session'
import { rateLimit } from '@/lib/api/rate-limit'
import { copyRequestSchema, type CopyRequest } from '@/lib/api/zod-schemas'

interface CopyVariant {
  subject: string
  body: string
  cta: string
}

const MAX_BODY_BYTES = 16_384

const CHAR_LIMITS: Record<string, number> = {
  email: 800,
  whatsapp: 300,
  sms: 160,
}

const SYSTEM_PROMPT = `És um copywriter especializado em vendas B2B em português europeu.
Crias copy persuasivo, directo e personalizado para equipas comerciais.
Nunca usas emojis em excesso. Preferes frases curtas e acção.
Devolves APENAS JSON válido — sem texto extra, sem markdown.`

function buildUserPrompt(body: CopyRequest, limit: number): string {
  const channelLabel =
    body.channel === 'email' ? 'email de vendas' : body.channel === 'whatsapp' ? 'mensagem WhatsApp' : 'SMS'

  return `Cria 3 variantes de ${channelLabel} em português europeu para:
Produto/Serviço: ${body.product}
Audiência: leads em fase "${body.audience}" do pipeline
Objectivo: ${body.objective}
Tom: ${body.tone}
Tamanho máximo do corpo: ${limit} caracteres.
Inclui variáveis dinâmicas: {nome}, {empresa} onde fizer sentido.
Termina com CTA claro.

Devolve JSON com este formato exacto (sem markdown, apenas JSON):
[
  {"subject":"...","body":"...","cta":"..."},
  {"subject":"...","body":"...","cta":"..."},
  {"subject":"...","body":"...","cta":"..."}
]

${body.channel !== 'email' ? 'Para whatsapp/sms o campo subject deve ser a primeira frase de gancho.' : ''}`
}

function getMockVariants(body: CopyRequest): CopyVariant[] {
  const { product, objective, tone } = body
  const toneLabel =
    tone === 'profissional' ? 'directo' : tone === 'urgente' ? 'urgente' : tone === 'empatico' ? 'personalizado' : 'casual'

  return [
    {
      subject: `{nome}, temos algo para si sobre ${product}`,
      body: `Olá {nome},\n\nVi que a {empresa} pode beneficiar muito com ${product}.\n\nEm poucos minutos consigo mostrar-lhe exactamente como.\n\nEstará disponível esta semana?`,
      cta: `Reservar 15 minutos`,
    },
    {
      subject: `${product} — o próximo passo para {empresa}`,
      body: `{nome},\n\nEquipas como a {empresa} usam ${product} para ${objective === 'fechar' ? 'acelerar decisões de compra' : 'crescer mais rápido'}.\n\nPosso partilhar 2 casos reais?`,
      cta: `Ver casos de sucesso`,
    },
    {
      subject: `Última oportunidade — ${product} para {empresa}`,
      body: `{nome},\n\nNão quero que a {empresa} perca esta janela.\n\n${product} está a ajudar empresas como a sua a ${toneLabel === 'urgente' ? 'fechar mais rápido' : 'crescer de forma consistente'}.\n\nPodemos falar hoje?`,
      cta: `Falar agora`,
    },
  ]
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
  const { allowed, retryAfter } = await rateLimit(ip, 'copy')
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  // 3. Parse + validate
  const rawBody: unknown = await req.json().catch(() => null)
  const parsed = copyRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const body = parsed.data
  const limit = CHAR_LIMITS[body.channel] ?? 800

  // 4. Anthropic key — with dev-only mock fallback
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      return NextResponse.json({ variants: getMockVariants(body), demo: true })
    }
    console.error('[ai/copy] ANTHROPIC_API_KEY missing — returning 500')
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
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(body, limit) }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '<unreadable>')
      console.error('[ai/copy] Anthropic error', {
        status: response.status,
        body: errText,
        userId: user.id,
      })
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 })
    }

    const data = (await response.json()) as { content?: Array<{ text?: string }> }
    const text = data.content?.[0]?.text ?? '[]'

    let variants: CopyVariant[]
    try {
      variants = JSON.parse(text) as CopyVariant[]
    } catch {
      const match = text.match(/\[[\s\S]*\]/)
      variants = match ? (JSON.parse(match[0]) as CopyVariant[]) : getMockVariants(body)
    }

    return NextResponse.json({ variants })
  } catch (err) {
    console.error('[ai/copy] exception', { err, userId: user.id })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
