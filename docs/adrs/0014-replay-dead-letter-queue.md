---
status: Proposed
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [backend, reliability, ingestion]
supersedes: null
amends: null
---

# ADR-0014: Mecanismo de replay da dead-letter queue de webhooks

## Context and Problem Statement

Estado: webhooks inbound que falham validação (schema Zod inválido, HMAC errado, cliente desconhecido, schema_version desconhecido, etc.) são persistidos na tabela `webhook_failures` como dead-letter para permitir investigação e replay. Evento: necessidade de definir política e ferramenta para replay após correcção do problema.

Sem política explícita, payloads acumulam silenciosamente e leads legítimas perdem-se.

## Decision Drivers

- Recuperação de leads perdidas por bug temporário ou configuração incorrecta.
- Evitar duplicação ao reprocessar (idempotência).
- Segurança: quem pode fazer replay e sobre que payloads?
- Observabilidade: o que foi replayed, por quem, com que resultado.

## Considered Options

1. **Sem replay; erros são aceitáveis** (rejected): perde leads legítimas; inaceitável para um negócio cujo valor é ingestão de leads.
2. **Retry automático com backoff exponencial, sem intervenção humana** (rejected como única solução): resolve apenas erros transitórios (DB temporariamente indisponível); não resolve erros de código que requerem fix antes do retry.
3. **Retry automático para erros transitórios + UI admin para replay manual pós-fix** (chosen).

## Decision Outcome

Estratégia em dois níveis:

**Nível 1 (automático):**

- Erros transitórios (Postgres indisponível, timeout do Supabase) fazem retry interno 3 vezes com backoff exponencial (100 ms, 500 ms, 2 s) **antes** de persistir em `webhook_failures`.
- Se as 3 tentativas falharem, persiste e responde 503 ao provider (que normalmente tenta de novo).

**Nível 2 (manual):**

- Payloads persistidos em `webhook_failures` aguardam intervenção humana.
- **UI admin** em `/admin/webhook-failures` lista failures com filtros por provider, data, reason, agency.
- Operador com role `agency_admin` pode:
  - **Replay individual:** reprocessar um payload específico.
  - **Replay em bulk** por filtro (provider + reason).
  - **Discard** com justificativa obrigatória.
- Idempotência garantida: payload original tem `event_id` que serve como unique key; replay que encontre lead existente vira merge (via deduplicação) em vez de criar duplicado.
- Log de replay em `audit_logs` com `user_id`, `payload_id`, `result` (success/failed/merged).

**Alertas:**

- Queue depth > 100 → alerta P2 (intervenção necessária).
- Queue depth > 1000 ou failure rate > 10% em 5 min → alerta P1 (possível problema sistémico).

## Consequences

### Positive

- Leads legítimas são recuperáveis após correcção de bug ou configuração.
- Operador tem controlo fino (replay individual, bulk ou discard selectivo).
- Audit trail completo (quem fez replay, quando, com que resultado).
- Retry automático cobre falhas transitórias sem intervenção humana.

### Negative

- UI admin é um componente de UI adicional a construir (não trivial).
- Replay de payloads antigos em schema DTO evoluído (v2) pode falhar novamente se não existir handler v1. Mitigação: manter handler da versão original disponível durante período de graça definido em [ADR-0013](0013-lead-dto-versionado.md).
- Depende da acção do operador: se ninguém agir, queue cresce até alerta disparar.
- Replay de bulk mal configurado pode gerar carga alta. Mitigação: replay respeita rate limits existentes.

## Links

- **relatesTo:** [ADR-0006](0006-invocacao-edge-functions.md), [ADR-0013](0013-lead-dto-versionado.md), [ADR-0007](0007-scheduler-temporal.md)
