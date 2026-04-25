---
status: Proposed
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [backend, scheduling, database]
supersedes: null
amends: null
---

# ADR-0007: Scheduler temporal (Supabase Scheduled Functions + `pg_cron`)

## Context and Problem Statement

Estado: automações com trigger `lead_no_contact` (lead sem interacção há X horas) e acções com `delay_hours > 0` precisam de um scheduler temporal. Retenção GDPR exige também um job nocturno. Evento: decisão necessária sobre que mecanismo usar sem acrescentar infraestrutura externa.

Alternativas:

- `pg_cron` (extension Postgres): cron jobs dentro do próprio Postgres.
- Supabase Scheduled Functions: cron managed invocando Edge Functions.
- Vercel Cron Jobs: cron invocando routes HTTP do Next.js.

## Decision Drivers

- Precisão temporal aceitável (mais ou menos 1 minuto é OK; sub-segundo não é requisito).
- Fiabilidade (não perder execuções).
- Observabilidade (logs de execução acessíveis).
- Onde deve viver a lógica: DB vs Edge Function vs Vercel Next.js.

## Considered Options

1. **Vercel Cron Jobs** (rejected): acopla scheduler à app UI; falha do Vercel afecta também jobs internos; logs menos acessíveis para DB ops.
2. **`pg_cron` puro para toda a lógica** (rejected): lógica de negócio em PL/pgSQL é mais difícil de testar e manter do que TypeScript; aceitável apenas para jobs triviais.
3. **Divisão de responsabilidades: Supabase Scheduled Functions para jobs de negócio + `pg_cron` para manutenção trivial** (chosen).

## Decision Outcome

Dividir entre dois mecanismos:

**Supabase Scheduled Functions (cron managed que invoca Edge Function Deno):**

- `lead_no_contact` scanner (varre leads sem interacção acima do threshold, dispara Automation Builder).
- Processamento de delays do Automation Builder.
- Jobs de health check do Evolution API.
- Qualquer job com lógica de negócio relevante.

**`pg_cron` (SQL puro dentro do Postgres):**

- Purga de `webhook_failures` mais antigos que 30 dias.
- Purga de `audit_logs` mais antigos que 2 anos.
- Agregações trimestrais para dashboards (se justificar mais tarde).

## Consequences

### Positive

- Lógica de negócio fica em TypeScript: testável, type-safe, partilhável com outros componentes.
- Jobs de manutenção ficam co-localizados com o schema (migrations).
- Ambos geridos pela Supabase (zero infra externa).
- Alinha com [ADR-0006](0006-invocacao-edge-functions.md) (event-publisher também usa Edge Functions).

### Negative

- Dois mecanismos em vez de um: overhead mental pequeno mas real.
- Supabase Scheduled Functions ainda em evolução (validar maturity em produção).
- Lock contention possível se jobs longos tocarem as mesmas tabelas em janelas sobrepostas. Mitigação: agendar jobs potencialmente concorrentes em horas distintas.
- `pg_cron` corre dentro do Postgres: job lento consome connection do pool.

## Links

- **relatesTo:** [ADR-0014](0014-replay-dead-letter-queue.md)
