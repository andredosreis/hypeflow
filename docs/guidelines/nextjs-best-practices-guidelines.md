# Next.js Best Practices — HypeFlow OS

> Source: [`vercel-labs/next-skills`](https://github.com/vercel-labs/next-skills) — `next-best-practices` skill  
> Stack: Next.js 14.2.35 · App Router · TypeScript · Supabase JS · tRPC 11

---

## Aviso de Versão

Este guideline é baseado no skill oficial da Vercel Labs. Algumas regras estão marcadas com
`[Next.js 15+]` — **não se aplicam ao HypeFlow OS** que usa a versão 14.2.35.

---

## 1. Ficheiros e Convenções do App Router

### 1.1 Ficheiros Especiais

| Ficheiro | Propósito |
|---|---|
| `page.tsx` | UI de um segmento de rota |
| `layout.tsx` | UI partilhada para o segmento e filhos |
| `loading.tsx` | UI de loading (Suspense boundary automático) |
| `error.tsx` | UI de erro (Error boundary — deve ser Client Component) |
| `not-found.tsx` | UI 404 |
| `route.ts` | API endpoint (Route Handler) |
| `global-error.tsx` | Erro no root layout — deve incluir `<html>` e `<body>` |

### 1.2 Estrutura de Pastas

```
src/app/
├── layout.tsx              # Root layout (obrigatório)
├── page.tsx                # Homepage /
├── loading.tsx             # Loading global
├── error.tsx               # Error boundary global
├── not-found.tsx           # 404 global
├── global-error.tsx        # Erro no root layout
├── middleware.ts            # Auth, redirects, rewrites  [raiz do projecto]
├── (auth)/                  # Route group — não afecta URL
│   ├── login/page.tsx
│   └── register/page.tsx
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx
├── api/
│   └── webhooks/
│       └── evolution/
│           └── route.ts    # POST /api/webhooks/evolution
└── _components/            # Pasta privada — não é uma rota
```

### 1.3 Segmentos de Rota

```
app/
├── leads/              # Estático: /leads
├── [id]/               # Dinâmico: /leads/:id
├── [...slug]/          # Catch-all: /a/b/c
└── (crm)/              # Route group (ignorado na URL)
```

### 1.4 Conflito `route.ts` vs `page.tsx`

`route.ts` e `page.tsx` **não podem coexistir** na mesma pasta.

```
# Errado
app/leads/page.tsx
app/leads/route.ts   ← conflito

# Correcto
app/leads/page.tsx
app/api/leads/route.ts
```

---

## 2. Server vs Client Components

### 2.1 Directivas

```tsx
// 'use client' — necessário para:
// - React hooks (useState, useEffect, etc.)
// - Event handlers (onClick, onChange)
// - Browser APIs (window, localStorage)
'use client'

// 'use server' — marca uma função como Server Action
// Pode ser passada a Client Components
'use server'
```

### 2.2 Regras de Fronteira RSC

**Client Components não podem ser `async`.**

```tsx
// Errado
'use client'
export default async function LeadCard() {
  const lead = await getLead() // Não funciona em Client Component
  return <div>{lead.name}</div>
}

// Correcto — buscar no Server Component pai
export default async function Page() {
  const lead = await getLead()
  return <LeadCard lead={lead} />
}

// LeadCard.tsx
'use client'
export function LeadCard({ lead }: { lead: Lead }) {
  return <div>{lead.name}</div>
}
```

### 2.3 Props Serializáveis

Props de Server → Client devem ser JSON-serializáveis.

```tsx
// Errado — Date object não é serializável
export default async function Page() {
  const lead = await getLead()
  return <LeadCard createdAt={lead.createdAt} />  // Date object
}

// Correcto — serializar no servidor
export default async function Page() {
  const lead = await getLead()
  return <LeadCard createdAt={lead.createdAt.toISOString()} />
}
```

| Tipo | Pode passar? | Fix |
|---|---|---|
| `string / number / boolean` | Sim | — |
| Plain object / array | Sim | — |
| Server Action (`'use server'`) | Sim | — |
| `() => {}` função | Não | Definir no Client ou usar Server Action |
| `new Date()` | Não | `.toISOString()` |
| `new Map() / new Set()` | Não | Converter para array/object |
| Instância de classe | Não | Passar plain object |

---

## 3. Padrões de Dados

### 3.1 Árvore de Decisão

```
Preciso de buscar dados?
├── Num Server Component?
│   └── Buscar directamente — sem API necessária
│
├── Num Client Component?
│   ├── É uma mutação?
│   │   └── Server Action
│   └── É uma leitura?
│       └── Receber do Server Component pai (preferido)
│           ou Route Handler
│
├── Webhook externo (Evolution API, GHL)?
│   └── Route Handler
│
└── API pública / mobile?
    └── Route Handler
```

### 3.2 Server Components — Leituras (Preferido)

```tsx
// app/leads/page.tsx — sem round-trip de API
export default async function LeadsPage() {
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, phone, score, status')
    .eq('status', 'active')
    .order('score', { ascending: false })

  return <LeadList leads={leads ?? []} />
}
```

### 3.3 Server Actions — Mutações (Preferido)

```tsx
// features/leads/actions.ts
'use server'
import { revalidatePath } from 'next/cache'

export async function qualifyLead(leadId: string) {
  const { error } = await supabase
    .from('leads')
    .update({ status: 'qualified' })
    .eq('id', leadId)

  if (error) throw new Error('Failed to qualify lead')
  revalidatePath('/leads')
}
```

```tsx
// Client Component usa a Server Action
'use client'
import { qualifyLead } from '../actions'

export function QualifyButton({ leadId }: { leadId: string }) {
  return (
    <button onClick={() => qualifyLead(leadId)}>
      Qualificar
    </button>
  )
}
```

### 3.4 Route Handlers — APIs Externas

```tsx
// app/api/webhooks/evolution/route.ts
export async function POST(request: Request) {
  const body = await request.json()
  // processar webhook do Evolution API
  return Response.json({ received: true }, { status: 202 })
}
```

### 3.5 Evitar Waterfalls — Promise.all

```tsx
// Errado — sequencial, mais lento
async function Dashboard() {
  const leads = await getLeads()
  const stats = await getStats()
  const agents = await getAgents()
}

// Correcto — paralelo
async function Dashboard() {
  const [leads, stats, agents] = await Promise.all([
    getLeads(),
    getStats(),
    getAgents(),
  ])
}
```

### 3.6 Streaming com Suspense

```tsx
import { Suspense } from 'react'

export default function Dashboard() {
  return (
    <div>
      <Suspense fallback={<LeadsSkeleton />}>
        <LeadsSection />
      </Suspense>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>
    </div>
  )
}

async function LeadsSection() {
  const leads = await getLeads() // busca independente
  return <LeadList leads={leads} />
}
```

---

## 4. Error Handling

### 4.1 Error Boundaries

```tsx
// app/leads/error.tsx — deve ser Client Component
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Algo correu mal.</h2>
      <button onClick={() => reset()}>Tentar novamente</button>
    </div>
  )
}
```

```tsx
// app/global-error.tsx — deve incluir <html> e <body>
'use client'

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body>
        <h2>Erro crítico.</h2>
        <button onClick={() => reset()}>Tentar novamente</button>
      </body>
    </html>
  )
}
```

### 4.2 Hierarquia de Erros

```
app/
├── global-error.tsx    # Erros no root layout
├── error.tsx           # Erros em todos os filhos
├── leads/
│   ├── error.tsx       # Erros em /leads/*
│   └── [id]/
│       └── error.tsx   # Erros em /leads/:id
```

### 4.3 Server Actions — Não envolver `redirect()` em try-catch

```tsx
// Errado — redirect() lança internamente, o catch apanha-o
'use server'
async function createLead(formData: FormData) {
  try {
    const lead = await saveLead(formData)
    redirect(`/leads/${lead.id}`)  // lança excepção interna!
  } catch (error) {
    return { error: 'Falhou' }    // navigation nunca acontece
  }
}

// Correcto — redirect() fora do try-catch
'use server'
async function createLead(formData: FormData) {
  let lead
  try {
    lead = await saveLead(formData)
  } catch (error) {
    return { error: 'Falhou a guardar o lead' }
  }
  redirect(`/leads/${lead.id}`)
}
```

O mesmo aplica-se a: `redirect()`, `permanentRedirect()`, `notFound()`, `forbidden()`, `unauthorized()`.

### 4.4 Not Found

```tsx
import { notFound } from 'next/navigation'

export default async function LeadPage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id)
  if (!lead) notFound()
  return <LeadDetail lead={lead} />
}
```

---

## 5. Route Handlers

### 5.1 Uso Básico

```tsx
// app/api/leads/route.ts
export async function GET() {
  const { data } = await supabase.from('leads').select()
  return Response.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { data, error } = await supabase.from('leads').insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(data, { status: 201 })
}
```

### 5.2 Rotas Dinâmicas

```tsx
// app/api/leads/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } },  // Next.js 14 — síncrono
) {
  const { data } = await supabase.from('leads').select().eq('id', params.id).single()
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(data)
}
```

> **Next.js 14:** `params` é síncrono — `params.id` directamente.  
> **Next.js 15+:** `params` é assíncrono — `const { id } = await params`. Não aplicar no HypeFlow OS.

### 5.3 Helpers de Request e Response

```tsx
export async function GET(request: Request) {
  // Query params
  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page') ?? '1'

  // Headers
  const authHeader = request.headers.get('authorization')

  // Cookies
  const cookieStore = await cookies()
  const token = cookieStore.get('token')

  return Response.json(
    { data },
    { headers: { 'Cache-Control': 'max-age=60' } },
  )
}
```

### 5.4 Route Handler vs Server Action

| Caso | Route Handler | Server Action |
|---|---|---|
| Webhook externo (Evolution, GHL) | Sim | Não |
| Mutação da UI interna | Não | Sim |
| API REST pública | Sim | Não |
| Upload de ficheiros | Ambos funcionam | Ambos funcionam |

---

## 6. Suspense Boundaries

### 6.1 `useSearchParams` — Requer Suspense

Sem Suspense, a página inteira degrada para Client-Side Rendering.

```tsx
// Errado — CSR bailout em toda a página
'use client'
import { useSearchParams } from 'next/navigation'

export default function SearchBar() {
  const searchParams = useSearchParams()
  return <input defaultValue={searchParams.get('q') ?? ''} />
}

// Correcto — isolar em Suspense
import { Suspense } from 'react'
import SearchBar from './SearchBar'

export default function Page() {
  return (
    <Suspense fallback={<div>A carregar...</div>}>
      <SearchBar />
    </Suspense>
  )
}
```

### 6.2 Referência Rápida de Hooks

| Hook | Requer Suspense? |
|---|---|
| `useSearchParams()` | Sempre |
| `usePathname()` | Sim (em rotas dinâmicas) |
| `useParams()` | Não |
| `useRouter()` | Não |

---

## 7. Erros de Hidratação

### 7.1 Causas Comuns e Fixes

```tsx
// Causa: Browser API renderizada no servidor
// Errado
<div>{window.innerWidth}</div>

// Correcto — Client Component com mounted check
'use client'
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? <>{children}</> : null
}
```

```tsx
// Causa: Data/hora com timezone diferente no servidor e cliente
// Errado
<span>{new Date().toLocaleString()}</span>

// Correcto — renderizar no cliente
'use client'
function Clock() {
  const [time, setTime] = useState<string>()
  useEffect(() => setTime(new Date().toLocaleString()), [])
  return <span>{time}</span>
}
```

```tsx
// Causa: Valores aleatórios ou IDs
// Errado
<div id={Math.random().toString()}>

// Correcto — useId do React
import { useId } from 'react'
function Input() {
  const id = useId()
  return <input id={id} />
}
```

```tsx
// Causa: HTML inválido (nesting incorrecto)
// Errado
<p><div>conteúdo</div></p>

// Correcto
<div><p>conteúdo</p></div>
```

---

## 8. Runtime Selection

### 8.1 Usar Node.js por Defeito

```tsx
// Correcto — não é necessário configurar nada (Node.js é o defeito)
export default function Page() { ... }

// Apenas usar Edge se o projecto já o usar ou houver requisito específico
export const runtime = 'edge'
```

### 8.2 Quando Usar Cada Runtime

| Runtime | Quando usar |
|---|---|
| **Node.js** (defeito) | Sempre — acesso a filesystem, `crypto`, packages npm, Supabase client |
| **Edge** | Apenas para latência geográfica específica — API limitada, sem `fs` |

> Para o HypeFlow OS: usar sempre Node.js. O Supabase JS client requer Node.js runtime.

---

## 9. Optimização de Assets

### 9.1 Imagens — `next/image`

```tsx
import Image from 'next/image'

// Sempre usar next/image em vez de <img>
<Image
  src="/logo.png"
  alt="HypeFlow OS"
  width={200}
  height={60}
  priority           // usar em imagens above-the-fold
/>
```

### 9.2 Fontes — `next/font`

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

### 9.3 Scripts de Terceiros — `next/script`

```tsx
import Script from 'next/script'

<Script
  src="https://example.com/analytics.js"
  strategy="afterInteractive"   // não bloqueia hidratação
/>
```

---

## 10. Middleware

```ts
// middleware.ts (raiz do projecto — ao lado de src/)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Validar sessão Supabase, redirects, etc.
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
```

> **Next.js 14–15:** `middleware.ts` com `middleware()` e `config`.  
> **Next.js 16+:** renomeado para `proxy.ts`. Não aplicável ao HypeFlow OS.

---

## 11. Regras de Ouro

1. **Server Components por defeito** — só adicionar `'use client'` quando necessário
2. **Server Actions para mutações** — não criar Route Handlers para mutações internas
3. **Route Handlers para integrações externas** — webhooks Evolution API e GHL
4. **`redirect()` fora de try-catch** — em Server Actions e Server Components
5. **Props serializáveis** — nunca passar `Date`, `Map`, `Set` ou funções de Server → Client
6. **Suspense em `useSearchParams`** — sem excepções
7. **Node.js runtime** — nunca Edge para o HypeFlow OS (Supabase JS não suporta Edge)
8. **`next/image` sempre** — nunca `<img>` directo
9. **Não `async` em Client Components** — buscar dados no Server Component pai
10. **`Promise.all`** para fetches independentes — nunca sequencial

---

## Referências

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [File Conventions](https://nextjs.org/docs/app/api-reference/file-conventions)
- [Error Handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns)
- [Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- [React Directives](https://react.dev/reference/rsc/use-client)
- [vercel-labs/next-skills](https://github.com/vercel-labs/next-skills)
