# Architecture Decision Records (ADRs)

Registo das decisões arquitecturais do HYPE Flow OS. Formato baseado em [MADR](https://adr.github.io/madr/) + template Michael Nygard.

Cada ADR cumpre a regra dos **3 Es**: decisão **Estrutural**, **Evidente** (o "porquê" importa no futuro) e **Estável** (dura meses ou anos).

## Índice

| ID | Título | Status | Tags |
|---|---|---|---|
| [0001](0001-plano-supabase-fase-1.md) | Plano Supabase Fase 1 (Pro vs Free vs self-host) | Proposed | infrastructure, database, cost |
| [0002](0002-whatsapp-provider.md) | WhatsApp provider (Evolution API primário, fallback por feature flag) | Proposed | integration, whatsapp, cost |
| [0003](0003-estrategia-migracao-self-host.md) | Estratégia de migração Supabase managed para self-host | Proposed | infrastructure, migration, cost |
| [0004](0004-jwt-claims-custom-hook.md) | JWT claims via `custom_access_token_hook` | Accepted | security, authentication, performance |
| [0005](0005-remocao-null-client.md) | Remoção do `createNullClient` em favor de Supabase local + MSW | Accepted | devex, testing, database |
| [0006](0006-invocacao-edge-functions.md) | Invocação de Edge Functions via Postgres trigger + pg_notify | Proposed | backend, async, database |
| [0007](0007-scheduler-temporal.md) | Scheduler temporal (Supabase Scheduled Functions + pg_cron) | Proposed | backend, scheduling, database |
| [0008](0008-retencao-lead-interactions.md) | Retenção de `lead_interactions` (sem particionamento até 500k) | Proposed | database, gdpr, performance |
| [0009](0009-rate-limiter-whatsapp.md) | Rate limiter WhatsApp por agência | Proposed | security, integration, whatsapp |
| [0010](0010-sem-cache-distribuido-fase-1.md) | Sem Redis ou cache distribuído na Fase 1 | Accepted | caching, performance |
| [0011](0011-postgres-source-of-truth.md) | Postgres como source of truth único | Accepted | database, integrity |
| [0012](0012-pg-notify-eventos-internos.md) | `pg_notify` como canal de eventos internos | Accepted | backend, events, database |
| [0013](0013-lead-dto-versionado.md) | Lead DTO canónico versionado | Accepted | api, versioning |
| [0014](0014-replay-dead-letter-queue.md) | Mecanismo de replay da dead-letter queue de webhooks | Proposed | backend, reliability, ingestion |
| [0015](0015-optimistic-concurrency-updated-at.md) | Optimistic concurrency via coluna `updated_at` | Accepted | backend, database, concurrency |
| [0016](0016-csv-export-assincrono-storage.md) | CSV export assíncrono em Supabase Storage (TTL 24h) | Accepted | ux, performance, storage |
| [0017](0017-stack-observabilidade.md) | Stack de observabilidade (Axiom) | Proposed | observability |
| [0018](0018-slos-error-budget.md) | SLIs/SLOs formais com error budget policy | Proposed | observability, sla |

## Convenções

- **Numeração:** `NNNN` sequencial, zero-padded a 4 dígitos.
- **Ficheiro:** `NNNN-slug-descritivo.md`.
- **Status:** `Proposed` (em discussão), `Accepted` (em implementação ou implementado), `Rejected` (não avança), `Deprecated` (substituído sem sucessor), `Superseded` (substituído por ADR mais recente).
- **Alterações:** ADR aprovado não se edita excepto erratas triviais. Mudanças de rumo criam novo ADR com `supersedes:` apontando ao anterior.
- **Relações:** `dependsOn` marca pré-requisito; `relatesTo` marca conexão temática.
