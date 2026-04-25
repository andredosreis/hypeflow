---
status: Accepted
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [api, versioning]
supersedes: null
amends: null
---

# ADR-0013: Lead DTO canónico versionado

## Context and Problem Statement

Estado: múltiplas fontes enviam dados de lead em formatos diferentes (GHL, Tally, Typeform, ManyChat, Meta, Google, TikTok, entrada manual). O sistema converte cada payload para um **Lead DTO canónico** interno que é consumido pelo tRPC router, pelas Edge Functions e pelos componentes do CRM. Evento: com o tempo, será necessário evoluir o DTO (novos campos obrigatórios, renomeações, mudanças de shape) sem quebrar consumidores existentes (Automation Builder, Portal, APIs internas) nem payloads antigos persistidos em `webhook_failures` aguardando replay.

## Decision Drivers

- Evolução incremental sem breaking changes em produção.
- Rastreabilidade clara da versão em cada payload.
- Debugging fácil (saber qual versão foi usada por cada fonte).
- Compatibilidade retroactiva com payloads guardados em `webhook_failures` para replay (ver [ADR-0014](0014-replay-dead-letter-queue.md)).

## Considered Options

1. **Sem versioning; qualquer breaking change exige migração big-bang** (rejected): inviável com múltiplos produtores e consumidores; requer downtime coordenado.
2. **Versioning por URL de endpoint (`/api/v2/leads`)** (rejected): não se aplica a DTOs internos consumidos via tRPC ou a eventos internos.
3. **Campo `schema_version` dentro do DTO** (chosen).

## Decision Outcome

Lead DTO canónico tem sempre um campo `schema_version: 'v1' | 'v2' | ...`, validado por Zod.

Quando uma mudança breaking é proposta:

1. Define-se `LeadDTOv2` ao lado de `LeadDTOv1` (ambos coexistem no tempo).
2. Novos produtores (Webhook Handlers, UI manual, integrações) passam a emitir v2; antigos continuam em v1 até migrarem.
3. Consumidores inspeccionam `schema_version` e invocam o handler correspondente (`handleLeadV1` ou `handleLeadV2`).
4. Migração de produtores faz-se gradualmente.
5. Quando último produtor migra para v2 em produção, v1 entra em **deprecation** com período de graça (6 meses). Só então é removido.

**Regra operacional:** qualquer mudança no DTO tem de declarar se é breaking (novo `schema_version`) ou aditiva (campos opcionais dentro do mesmo `schema_version`).

## Consequences

### Positive

- Evolução incremental sem downtime coordenado.
- Rastreabilidade clara em logs e debugging (campo versão em todo o lado).
- Permite experimentar novos campos em v2 sem afectar v1.
- Replay de `webhook_failures` continua a funcionar se o handler correspondente existir.

### Negative

- Consumidores têm de tratar múltiplas versões simultaneamente durante transições (código mais complexo).
- `webhook_failures` persistidos em v1 podem ser difíceis de replay em v2 se shape mudou muito; solução é manter ambos os handlers disponíveis durante o período de graça.
- Tentação de manter v1 indefinidamente por medo de remover (debt acumula). Mitigação: data de remoção explícita no PR que marca v1 como deprecated.

## Links

- **relatesTo:** [ADR-0014](0014-replay-dead-letter-queue.md)
