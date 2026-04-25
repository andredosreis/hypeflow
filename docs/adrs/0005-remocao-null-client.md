---
status: Accepted
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [devex, testing, database]
supersedes: null
amends: null
---

# ADR-0005: Remoção do `createNullClient` em favor de Supabase local + MSW

## Context and Problem Statement

Estado anterior (Idle): `apps/hypeflow/lib/supabase/server.ts:6-36` define `createNullClient`, mock que devolve uma API Supabase incompleta e totalmente tipada como `any`, activado em modo "preview/demo" quando env vars de Supabase estão ausentes. Evento que forçou a mudança: auditoria Context7 identificou o finding CR-02.

Problemas concretos documentados:

- API incompleta: implementa apenas `auth`, `from`, `channel`. Chamadas a `.rpc()`, `.storage`, `.functions` e `removeChannel` explodem em runtime sem aviso.
- `.then` customizado (linhas 26-27) faz o `noopQuery` parecer uma Promise. Código com `await db.from(...).select(...)` passa sem erro mas retorna sempre `{ data: null, error: null }`, mascarando bugs que só aparecem em produção.
- Tipagem `any` contamina toda a árvore de consumidores do mock, eliminando type-safety.

## Decision Drivers

- Type-safety em toda a árvore (consumidores downstream devem ter autocomplete e check de schemas Supabase).
- Detecção de erros em runtime (não silenciar falhas).
- Simplicidade de setup para novos developers (um comando, idealmente).
- Paridade com produção (dev e preview devem comportar-se como prod).

## Considered Options

1. **Completar `createNullClient`** (rejected): preserva `any`; cada API nova do Supabase exige extensão manual; diverge sempre de produção; mascara bugs.
2. **Repository Pattern com abstracção completa sobre Supabase** (rejected agora): refactor grande (1 a 2 semanas); overkill para o problema actual; pode entrar se migração para self-host justificar mais tarde.
3. **Supabase local (Docker Compose via `supabase start`) para dev/preview + MSW (Mock Service Worker) para testes** (chosen).

## Decision Outcome

Remover `createNullClient` dos 3 apps (`agency`, `portal`, `hypeflow`). Substituir por:

- **Dev e preview:** Supabase local via Docker Compose. `supabase/config.toml` e `supabase/seed.sql` no repositório permitem `supabase start` funcional num clean checkout.
- **Testes:** MSW (Mock Service Worker) intercepta as chamadas HTTP reais aos endpoints Supabase. Mocks por endpoint em `test/msw/handlers/supabase.ts`.
- **Produção e quando env vars faltam:** fail-fast. Arranque lança `Error` claro explicando como corrigir, em vez de silenciar.
- **Tipos:** `supabase gen types typescript > packages/database/types.ts`, consumido via `createServerClient<Database>`.

Story de implementação: `docs/stories/01.8.story.md`.

## Consequences

### Positive

- Tipagem completa de ponta a ponta (tipos gerados pelo Supabase CLI).
- Erros de runtime ficam visíveis em vez de silenciados.
- Paridade total entre dev, preview e produção: mesmo código, mesma schema shape.
- Base de testes mais realista (MSW intercepta HTTP real em vez de substituir lógica).
- Remove cerca de 30 linhas de `// eslint-disable @typescript-eslint/no-explicit-any`.

### Negative

- Perde-se o modo "demo público sem DB" (útil em landings com dashboards fake). Mitigação: abordar com Repository Pattern em ADR dedicado se reaparecer.
- Developers precisam de Docker instalado para dev local (barreira mínima para profissionais mas real).
- Testes unitários que antes ignoravam DB agora precisam de setup MSW inicial.
- Breve período de migração em que os 3 apps precisam ser alterados em lockstep.

## Links

- **relatesTo:** [ADR-0004](0004-jwt-claims-custom-hook.md)
