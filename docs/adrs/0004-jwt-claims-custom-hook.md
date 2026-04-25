---
status: Accepted
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [security, authentication, performance]
supersedes: null
amends: null
---

# ADR-0004: JWT claims via `custom_access_token_hook`

## Context and Problem Statement

Estado anterior (Idle): middleware edge do Next.js e o contexto tRPC resolviam identidade (`agency_id`, `client_id`, `role`) via query `SELECT FROM users` ou `SELECT FROM client_users` a cada request. Evento que forçou a mudança: auditoria Context7 (ver [context7-audit-report.md](../architecture/context7-audit-report.md)) identificou os findings CR-01 e CR-03, que documentam queries redundantes a degradar a latência na edge e a consumir o connection pool do Postgres sob carga.

Medições confirmadas no código:

- `apps/hypeflow/lib/supabase/middleware.ts:42-49` faz query por cada navegação em rotas protegidas.
- `apps/hypeflow/server/trpc.ts:32-66` faz 2 a 3 queries redundantes por request tRPC.

Uma página de dashboard com 6 queries tRPC dispara 12 a 18 queries só para resolver identidade.

## Decision Drivers

- Latência do middleware edge (TTFB directo em cada navegação).
- Consumo de pool connections Postgres sob carga.
- Performance com 100 ou mais utilizadores concorrentes (meta do PRD macro).
- Simplicidade do código no middleware e no contexto tRPC.

## Considered Options

1. **Manter queries DB em cada request** (rejected): perpetua CR-01 e CR-03; não escala.
2. **Cache em memória do resultado de identidade (Redis ou in-memory)** (rejected): acrescenta infraestrutura, viola [ADR-0010](0010-sem-cache-distribuido-fase-1.md), invalidation complexa, não elimina a primeira query pós-expiração.
3. **JWT claims custom via `custom_access_token_hook` do Supabase Auth** (chosen): Supabase invoca função Postgres ao emitir o token; claims ficam em `user.app_metadata` (imutáveis pelo cliente, assinadas no token).

## Decision Outcome

Implementar função Postgres `public.custom_access_token_hook(event jsonb) returns jsonb`, marcada `SECURITY DEFINER`, que é invocada pelo Supabase Auth cada vez que emite um access token. A função injecta os claims `user_type`, `agency_id`, `client_id` e `role` em `app_metadata`.

Middleware edge e `createTRPCContext` passam a ler os claims directamente do token, **zero queries DB** de identidade por request.

Story de implementação: `docs/stories/01.7.story.md`.

Invalidação de tokens: access token TTL de 60 minutos garante propagação de mudanças de role em menos de 1 hora. Para revogação imediata (ex.: `is_active = false`), usar `auth.admin.signOut(user_id)`.

## Consequences

### Positive

- Elimina 2 a 3 queries DB por request tRPC e 1 query por navegação edge.
- Latência middleware p95 prevista abaixo de 50ms (medir baseline antes e depois).
- Menor pressão no pool connections; mais cabeça para queries de negócio.
- Código do middleware e do contexto tRPC simplifica.

### Negative

- Tokens emitidos antes de mudança de role continuam válidos até TTL expirar (até 60 min de lag para mudanças não críticas).
- Função `SECURITY DEFINER` em Postgres é potente: um bug pode expor dados cruzados. Mitigação: revoke explícito de execute para `authenticated`, `anon` e `public`; apenas `supabase_auth_admin` executa; peer review obrigatório em mudanças.
- Acrescenta dependência numa feature específica do Supabase Auth (auth hooks). Migração futura para self-host mantém o hook porque é SQL puro.
- Testes de RLS em CI têm de cobrir o cenário com claims JWT em vez de assumir fetch à tabela `users`.

## Links

- **relatesTo:** [ADR-0005](0005-remocao-null-client.md)
