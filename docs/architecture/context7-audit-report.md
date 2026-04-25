# Auditoria de Código — `hypeflow-os`

**Data:** 2026-04-21 (revisão v2 de 2026-04-20)
**Alvo:** `apps/hypeflow` (Next.js 14 + Supabase SSR + tRPC)
**Escopo:** integração Supabase em middleware edge, criação de clientes server/service, contexto tRPC, preparação para migração Next 14 → 15
**Stack actual:** Next.js 14.2.20/14.2.35 · React 18 · @supabase/ssr · tRPC 11 · Turborepo

---

## Resumo executivo

| # | Severidade | Achado | Localização | Esforço |
|---|-----------|--------|-------------|---------|
| **CR-01** | Crítico | Query à DB no middleware edge a cada navegação | `lib/supabase/middleware.ts:42-49` | M (2-3d) |
| **CR-02** | Alto | `createNullClient` com `any` e API incompleta | `lib/supabase/server.ts:6-36` | M (2-3d) |
| **CR-03** | Alto | 2-3 queries redundantes por request tRPC | `server/trpc.ts:32-66` | Resolvido por CR-01 |
| **NM-01** | Médio | `params`/`searchParams` passam a Promise em Next 15 | Toda a árvore `app/` | M (1-2d com codemod) |
| **NM-02** | Médio | `fetch` deixa de ser cached por default em Next 15 | Route handlers + server fetches | S (0.5-1d auditoria) |
| **NM-03** | Médio | `GET` route handlers deixam de ser cached por default | `app/api/**/route.ts` | S (0.5-1d) |
| **NM-04** | Médio-alto | React 19 por default em Next 15 — compat libs | Recharts, @dnd-kit, Framer Motion, Tanstack Query 5 | M (1-2d validação) |
| **POS-1** | — | `await cookies()` já em uso (future-proof) | `lib/supabase/server.ts:46,72` | — |
| **POS-2** | — | Cookie refresh pattern oficial `@supabase/ssr` | `lib/supabase/middleware.ts:12-22` | — |

> **Esforço:** S = até 1 dia · M = 2-3 dias · L = 1 semana+

---

## Achados críticos

### CR-01 — Query à DB no middleware edge

**Ficheiro:** `apps/hypeflow/lib/supabase/middleware.ts`
**Linhas:** 42-49
**Severidade:** Crítico
**Impacto:** latência (TTFB) em cada navegação a rotas `/admin` ou `/client`

**Código observado:**
```ts
const { data: agencyUser } = await supabase
  .from('users')
  .select('id')
  .eq('id', user.id)
  .eq('is_active', true)
  .single()

const isAgencyUser = !!agencyUser
```

**Problema:** o middleware corre em edge a cada navegação. Fazer roundtrip à DB (Postgres) a partir da edge por cada request acrescenta latência dependente da região do pool e consome pool connections rapidamente sob carga.

**Recomendação:** mover `role`, `agency_id` e `client_id` para custom JWT claims via [Supabase Auth Hook `custom_access_token_hook`](https://supabase.com/docs/guides/auth/auth-hooks). Depois ler do token directamente — zero DB query no middleware.

Beneficia simultaneamente CR-03 (mesmo padrão no contexto tRPC).

---

### CR-02 — `createNullClient` com API incompleta e tipos `any`

**Ficheiro:** `apps/hypeflow/lib/supabase/server.ts`
**Linhas:** 6-36
**Severidade:** Alto
**Impacto:** crashes silenciosos em preview/demo mode; mascara erros de API

**Problemas:**
1. **API incompleta:** o mock implementa apenas `auth`, `from`, `channel`. Falta `rpc`, `storage`, `functions`, `removeChannel`, etc. Qualquer chamada fora da superfície implementada cai em `TypeError` em runtime, não em compile-time.
2. **`.then` falso:** linhas 26-27 fazem o `noopQuery` parecer uma Promise. Código que faz `await db.from('x').select('y')` funciona silenciosamente — desativa toda a detecção de erros.
3. **Tipagem `any`:** elimina verificação de TypeScript na árvore inteira de consumidores do mock.

**Recomendação:** remover `createNullClient`. Substituir por uma das opções (ordem de preferência):

| Opção | Quando usar | Custo |
|-------|-------------|-------|
| **Instância local Supabase (`supabase start`)** | Dev / preview branches | Setup inicial 0.5d; zero mudanças no código de produto |
| **MSW (Mock Service Worker)** | Testes unitários / E2E | Setup 1d; intercepta fetch sem desativar tipagem |
| **Provider separado com feature flag** | Modo demo público (marketing) | Abstrair via Repository/DAO; maior refactor (1-2w) |

---

### CR-03 — Queries redundantes no contexto tRPC

**Ficheiro:** `apps/hypeflow/server/trpc.ts`
**Linhas:** 32-66
**Severidade:** Alto (mitigado por CR-01)
**Impacto:** 2-3 queries adicionais por request tRPC; degrada throughput em dashboards de muitas consultas

**Código observado:**
```ts
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
// ...
const { data: agencyRow } = await supabase
  .from('users')
  .select('id, agency_id, role')
  .eq('id', user.id)
  .eq('is_active', true)
  .single()
// ...
const { data: clientRow } = await supabase
  .from('client_users')
  .select('client_id, agency_id')
  .eq('id', user.id)
  ...
```

**Problema:** o contexto tRPC é criado em cada request. Uma página de dashboard com 6 queries tRPC paralelas dispara 6×2=12 a 6×3=18 queries redundantes só para resolver identidade.

**Recomendação:** após implementar CR-01 (JWT claims), ler `agency_id`, `role`, `client_id` directamente do `user.user_metadata` ou dos claims sem tocar na DB. Contexto tRPC reduz-se a:

```ts
const { data: { user } } = await supabase.auth.getUser()
const { agency_id, role, client_id } = user?.app_metadata ?? {}
```

---

## Riscos de migração Next 14 → 15

### NM-01 — `params` e `searchParams` assíncronos

Em Next 15, `params`, `searchParams`, `cookies`, `headers` e `draftMode` passam a Promises nas pages, layouts e route handlers. Ficheiros que fazem destructuring síncrono vão partir na build.

**Mitigação:** correr o codemod oficial antes de subir versão:
```bash
npx @next/codemod@canary next-async-request-api .
```

Depois auditar manualmente — o codemod cobre ~80% dos casos.

---

### NM-02 — `fetch` deixa de ser cached por default

Em Next 14, `fetch()` é cached por default (via `force-cache`). Em Next 15, o default passa a ser **sem cache**. Código que assume cache implícita vai passar a fazer hit real a cada render.

**Mitigação:** auditar todos os `fetch()` em server components e route handlers. Onde se queria cache, adicionar explicitamente:
```ts
fetch(url, { cache: 'force-cache', next: { revalidate: 3600 } })
```

---

### NM-03 — `GET` route handlers deixam de ser cached por default

Similar a NM-02, mas específico a `app/api/**/route.ts` com método `GET`. Onde havia cache implícita, passa a dinâmico.

**Mitigação:** onde se quer manter cache, marcar explicitamente:
```ts
export const dynamic = 'force-static'
// ou
export const revalidate = 3600
```

---

### NM-04 — React 19 por default

Next 15 traz React 19 por default. Algumas libs do stack actual podem não ter suporte estável ainda.

**Validar antes de migrar:**

| Lib | Versão actual | Status React 19 |
|-----|---------------|-----------------|
| Recharts | 2.x | Verificar changelog — suporte a partir de 2.13+ |
| @dnd-kit | latest | Verificar — historicamente rápido a adaptar |
| Framer Motion | 11.x | React 19 suportado em 11.x |
| Tanstack Query | 5.x | React 19 suportado em 5.59+ |
| @supabase/ssr | latest | Validar release notes |
| tRPC | 11.x | React 19 suportado |

**Mitigação:** fazer upgrade numa branch, correr `npm run build` nos 3 apps, rodar testes e2e. Se alguma lib partir, pinear React 18 temporariamente (Next 15 permite).

---

## Boas práticas observadas

### POS-1 — `await cookies()` já em uso

**Ficheiros:** `lib/supabase/server.ts:46` e `:72`

Em Next 14 a API `cookies()` é síncrona, mas o código já a aguarda. Isto é o padrão Next 15 — zero mudança necessária nestes ficheiros na migração. Bom trabalho.

### POS-2 — Cookie refresh pattern oficial

**Ficheiro:** `lib/supabase/middleware.ts:12-22`

Implementação alinhada com o guia oficial `@supabase/ssr` (getAll/setAll + `NextResponse.next({ request })`). Evita problemas de sessão stale via cache agressiva.

---

## Plano de remediação

### Fase 1 — Bloqueadores de escala (antes de Next 15)

| # | Acção | Story | Esforço | Dependências |
|---|-------|-------|---------|--------------|
| 1 | JWT claims para `role`/`agency_id`/`client_id` (resolve CR-01 + CR-03) | [01.7](../stories/01.7.story.md) | 2-3d | Supabase Auth Hook configurável |
| 2 | Substituir `createNullClient` por Supabase local ou MSW (resolve CR-02) | [01.8](../stories/01.8.story.md) | 2-3d | Nenhuma |

**Critério de saída da Fase 1:** queries DB no middleware edge = 0; mocks com tipagem completa e detecção de erros em runtime.

### Fase 2 — Preparação Next 15

| # | Acção | Esforço |
|---|-------|---------|
| 3 | Codemod `next-async-request-api` nos 3 apps + revisão manual (NM-01) | 1-2d |
| 4 | Auditoria de `fetch()` + cache semantics explícitas (NM-02) | 0.5-1d |
| 5 | Auditoria de `GET` route handlers (NM-03) | 0.5-1d |
| 6 | Validar libs em React 19 numa branch (NM-04) | 1-2d |
| 7 | Upgrade Next 14 → 15 + CI verde | 1d |

**Critério de saída da Fase 2:** build limpo nos 3 apps em Next 15; testes e2e a passar; sem warnings de deprecation.

### Fase 3 — Follow-ups (pós-Next 15)

- Repository pattern sobre Supabase para facilitar swap futuro
- Telemetria de pool connections (baseline antes vs depois de CR-01)
- Benchmark de TTFB do middleware antes/depois (objectivo: ≤ 50ms p95 na edge)

---

## Referências

- **Ficheiros auditados:**
  - `hypeflow-os/apps/hypeflow/lib/supabase/middleware.ts`
  - `hypeflow-os/apps/hypeflow/lib/supabase/server.ts`
  - `hypeflow-os/apps/hypeflow/server/trpc.ts`
- **Docs oficiais:**
  - [Supabase Auth Hooks — `custom_access_token_hook`](https://supabase.com/docs/guides/auth/auth-hooks)
  - [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-15)
  - [`@supabase/ssr` SSR guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- **Stories relacionadas:** `docs/stories/01.7.story.md`, `docs/stories/01.8.story.md`

---

## Histórico de revisões

| Versão | Data | Alterações |
|--------|------|------------|
| v1 | 2026-04-20 | Relatório inicial — 3 achados críticos, 2 positivos |
| v2 | 2026-04-21 | Validação contra código, esforços estimados, secção Next 15 (NM-01 a NM-04), plano de remediação faseado, links para stories 01.7 e 01.8 |
