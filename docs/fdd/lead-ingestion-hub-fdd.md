### FDD: Hub Central de Ingestão de Leads

Versão: 1.0
Data: 2026-04-22
Responsável: Andre dos Reis (Engenheiro de Software)

---

### 1. Contexto e motivação técnica

O HypeFlow OS é um hub central de ingestão de leads onde todas as plataformas de captação enviam eventos diretamente, sem intermediários obrigatórios. O hub expõe um contrato universal de ingestão — o Lead DTO canónico — ao qual cada provider se adapta através de um adapter dedicado. Nenhum provider externo é dependência obrigatória do hub: a ausência de um adapter não afeta os restantes.

Esta feature resolve cinco problemas técnicos do estado atual:

1. Ausência de contrato unificado — cada integração nova criava lógica ad-hoc sem padrão.
2. Rastreabilidade de origem incompleta — leads chegavam sem `source.platform` consistente, tornando o cálculo de ROI impossível.
3. Deduplicação inexistente — o mesmo lead podia entrar múltiplas vezes por providers diferentes.
4. Falhas silenciosas — payloads inválidos eram descartados sem persistência, sem alerta, sem possibilidade de replay.
5. Acoplamento entre providers — uma falha no adapter de um provider afetava o pipeline inteiro.

Encaixe no HLD: implementa o Fluxo A (webhook inbound) descrito no `crm-leads-hld.md`, concretizando os componentes Webhook Ingestion Handlers, Normalizer e Dedup Service, e a integração com Score Engine e Event Publisher.

Atores e limites:

- Providers externos (Meta, Evolution API, Tally, Typeform, ManyChat, n8n) — enviam eventos via HTTP.
- Hub de ingestão (este FDD) — recebe, valida, normaliza, deduplica, persiste e publica eventos.
- Consumidores internos (Score Engine, Automation Builder, Realtime Publisher) — consomem o Lead DTO canónico após persistência.
- Operador da agência — configura os adapters (tokens, URLs) e faz replay manual da dead-letter queue quando necessário.

Suposições e restrições:

- GHL é adapter opcional. O hub funciona sem GHL.
- O hub não enriquece dados — persiste apenas o que o provider envia.
- O hub é server-to-server — nunca lida com sessões de utilizadores.
- `agency_id` é sempre derivado pelo hub a partir do `client_id`, nunca vem do provider.
- Evolution API corre no VPS do cliente (self-hosted), não na cloud da Meta. Referência: ADR-002.

---

### 2. Objetivos técnicos

- H1: Ack p95 ≤ 300 ms por provider em condições normais e sob teste de carga de 50 req/s sustentados por 2 minutos.
- H2: 0 leads duplicados confirmados após dedup — garantido por `event_id` único e unique constraint composto em Postgres.
- H3: 100% dos payloads com schema inválido chegam à dead-letter queue — nenhum descartado silenciosamente.
- H4: Rate limit de 100 req/min por IP e 1000 req/hora por agência aplicado antes de qualquer processamento, validado com carga simulada antes do go-live.
- H5: Novo provider integrado implementando apenas o adapter — sem alterar o core do hub nem os adapters existentes.
- H6: `source.platform` preenchido em 100% dos leads persistidos — sem origem rastreada o ROI é incalculável.
- H7: Falha de um adapter não afeta a ingestão dos outros — isolamento total entre adapters.

---

### 3. Escopo e exclusões

**Incluído**
- Contrato universal de ingestão (Lead DTO canónico)
- Route dedicada por provider (`api/webhooks/<provider>`)
- Adapter Evolution API como provider primário de WhatsApp
- Validação HMAC/token por adapter antes de qualquer processamento
- Normalização de payload para Lead DTO canónico
- Normalização de phone para E.164 via `libphonenumber-js`
- Deduplicação write-time por `event_id` e por unique constraint `(client_id, email_normalized)` e `(client_id, phone_normalized)`
- Geração de `event_id` interno quando ausente no payload do provider
- Derivação de `agency_id` a partir do `client_id` pelo hub
- Score Engine inicial (fail-open — lead persiste com score 0 se o Score Engine falhar)
- Persistência em `leads` e `lead_interactions`
- Dead-letter queue em `webhook_failures` para payloads com schema inválido ou falha de DB
- Rate limiting por IP e por agência
- Rastreabilidade de source (platform, campaign, ad, creative, UTMs)
- Publicação de eventos pós-persistência para Automation Builder e Realtime Publisher
- Testes de contrato com fixtures reais por adapter em CI
- Referência a adapters Tally, Typeform, ManyChat, n8n como "seguem o mesmo contrato — FDD separado por provider"

**Excluído**
- E1: Replay manual da dead-letter queue (ADR-014 pendente — FDD separado)
- E2: UI de monitorização dos webhooks
- E3: Lógica de automação pós-ingestão (responsabilidade do Automation Builder)
- E4: Deduplicação cross-client
- E5: Ingestão via CSV ou importação manual
- E6: Enriquecimento de dados pós-ingestão (lookup externo de empresa, validação de telefone, etc.)
- E7: Autenticação de utilizador final — o hub é server-to-server
- E8: GHL como dependência obrigatória

---

### 4. Fluxos detalhados e diagramas

**Fluxo principal — ingestão de lead via webhook**

1. Provider externo faz `POST /api/webhooks/<provider>` com assinatura HMAC ou token de autenticação.
2. Hub valida HMAC/token antes de qualquer outro processamento. Se inválido: 401 sem detalhes, payload descartado permanentemente (possível ataque — não entra na dead-letter queue).
3. Hub aplica rate limit: 100 req/min por IP, 1000 req/hora por agência. Se excedido: 429 + `Retry-After`, payload descartado (provider é responsável pelo retry).
4. Hub verifica se o `client_id` existe na DB. Se não existe: 200 silencioso, sem persistência, sem dead-letter queue (evita vazamento de informação sobre client_ids válidos).
5. Adapter do provider normaliza o payload para o Lead DTO canónico.
6. Se `event_id` ausente no payload: hub gera `SHA-256(payload + received_at + provider)`.
7. Se payload não é parseable (JSON inválido): 400, descartado.
8. Se payload é JSON válido mas schema inválido (campos obrigatórios ausentes): 200 ao provider + payload vai para dead-letter queue. O provider para de retentar; a equipa técnica faz replay manual após correção.
9. Dedup verifica `event_id` — se duplicado: 200 idempotente, sem processamento adicional.
10. Dedup verifica `(client_id, email_normalized)` e `(client_id, phone_normalized)`:
    - Duplicado criado há menos de 30 dias: merge (atualiza campos da lead existente), 200 OK.
    - Duplicado criado há mais de 30 dias: cria nova lead com `metadata.duplicated_of = <lead_id_original>`, 200 OK.
11. Score Engine calcula score inicial. Se falhar: lead persiste com `score = 0`, erro registado em log estruturado. Não reverte a persistência.
12. Transação Postgres: INSERT em `leads`, INSERT em `lead_interactions` (tipo `webhook_received`), `agency_id` derivado do `client_id` neste passo.
13. Postgres trigger emite NOTIFY `lead.created`.
14. Event Publisher invoca Automation Builder com `trigger_type = 'lead_created'` (fire-and-forget).
15. Realtime Publisher faz broadcast no canal da agência.
16. Hub retorna 200 OK ao provider.

**Fluxos alternativos**

- Falha transitória de DB (timeout, connection pool esgotado): 503 + `Retry-After` ao provider + payload vai para dead-letter queue com `reason = 'db_unavailable'`. Provider retenta; se a DB recuperar antes do TTL da dead-letter, o operador pode fazer replay.
- Evento duplicado por `event_id`: 200 OK imediato, sem query adicional à DB além do lookup de idempotência.
- Score Engine indisponível: lead persiste com `score = 0`, `metadata.score_error = true`. Operador pode acionar recálculo manual.

**Diagramas**

```
Provider
  │ POST /api/webhooks/<provider>
  ▼
[1] Auth/HMAC Validation ──FAIL──► 401 (discard)
  │ OK
  ▼
[2] Rate Limit Check ──EXCEEDED──► 429 + Retry-After (discard)
  │ OK
  ▼
[3] client_id Lookup ──NOT FOUND──► 200 silent (discard)
  │ FOUND
  ▼
[4] Adapter (normalização → Lead DTO canónico)
  │ schema inválido──► 200 + dead-letter queue
  │ JSON inválido───► 400 (discard)
  ▼
[5] Dedup (event_id + email/phone unique constraint)
  │ duplicado──► 200 idempotente (merge ou nova com duplicated_of)
  ▼
[6] Score Engine ──FAIL──► score = 0 + log erro (continua)
  ▼
[7] Persistência Postgres (leads + lead_interactions)
  │ DB fail──► 503 + dead-letter queue
  ▼
[8] Eventos (pg_notify + Automation Builder + Realtime)
  ▼
200 OK → Provider
```

---

### 5. Contratos públicos (assinaturas, endpoints, headers, exemplos)

**Lead DTO Canónico (contrato universal do hub)**

- Tipo: schema interno (TypeScript/Zod)
- Versão: `schema_version: 'v1'`
- Todos os adapters normalizam para este DTO antes de qualquer processamento downstream.

```typescript
{
  event_id: string           // gerado pelo hub se ausente no provider
  provider: string           // 'meta' | 'evolution' | 'tally' | 'ghl' | ...
  client_id: string          // provider conhece este; agency_id é derivado pelo hub
  received_at: string        // ISO-8601 — quando o hub recebeu, não quando o provider gerou
  contact: {
    name?: string
    email?: string           // normalizado: lowercase + trim
    phone?: string           // normalizado: E.164 via libphonenumber-js
  }
  source: {
    platform: string         // OBRIGATÓRIO: 'facebook' | 'whatsapp' | 'instagram' | ...
    campaign_id?: string
    ad_id?: string
    creative_id?: string
  }
  utm: {
    source?: string
    medium?: string
    campaign?: string
    content?: string
    term?: string
  }
  metadata: Record<string, unknown>  // campos específicos do provider sem equivalente canónico
  raw_payload: object                // payload original — persistido na DB, nunca em logs
  schema_version: 'v1'
}
```

Semântica de `source.platform`: obrigatório em todos os adapters. Adapter que não consegue determinar a plataforma deve lançar erro de validação no CI antes de chegar a produção.

Evolução do DTO: `schema_version` permite coexistência de v1 e v2 em paralelo. Migração para v2 exige que todos os consumidores (Score Engine, Automation Builder) declarem suporte a v2 antes da migração.

---

**Adapter Evolution API**

- Tipo: webhook inbound
- Rota: `POST /api/webhooks/evolution/<client_id>`
- Método: POST
- Autenticação: token fixo por instância, configurado por agência no Supabase Vault. Token global é proibido — vazamento de um token expõe apenas a agência afetada.
- Identificação do cliente: `client_id` no path da URL. A agência configura uma vez no painel Evolution qual a URL de destino.

Semântica de status:
- `200` — evento recebido com sucesso (inclui eventos ignorados silenciosamente)
- `401` — token inválido
- `429` — rate limit atingido, header `Retry-After` presente
- `503` — DB indisponível, header `Retry-After` presente

Eventos processados:

| Evento Evolution | Ação no hub |
|---|---|
| `messages.upsert` | Cria ou atualiza lead (novo contacto via WhatsApp) |
| `contacts.upsert` | Cria lead (novo número detectado) |
| `messages.update` | Regista `lead_interaction` de status de entrega — não cria lead |
| Todos os outros | 200 OK silencioso, descartado sem dead-letter queue |

**Exemplo de requisição**

```json
{
  "event": "messages.upsert",
  "instance": "agencia-abc",
  "data": {
    "key": { "remoteJid": "351912345678@s.whatsapp.net" },
    "pushName": "João Silva",
    "message": { "conversation": "Olá, tenho interesse" },
    "messageTimestamp": 1713801600
  }
}
```

**Exemplo de Lead DTO gerado pelo adapter Evolution**

```json
{
  "event_id": "sha256:a1b2c3...",
  "provider": "evolution",
  "client_id": "client-xyz-456",
  "received_at": "2026-04-22T10:30:00.000Z",
  "contact": {
    "name": "João Silva",
    "phone": "+351912345678"
  },
  "source": {
    "platform": "whatsapp"
  },
  "utm": {},
  "metadata": {
    "evolution_instance": "agencia-abc",
    "whatsapp_jid": "351912345678@s.whatsapp.net",
    "message_timestamp": 1713801600
  },
  "raw_payload": { "...": "payload original completo" },
  "schema_version": "v1"
}
```

Limites:
- Rate: 100 req/min por IP, 1000 req/hora por agência
- Timeout máximo de resposta do hub: 300 ms (p95)
- Payload máximo: 1 MB

Adapters Tally, Typeform, ManyChat, n8n: seguem o mesmo contrato universal. FDD separado por provider.

---

### 6. Erros, exceções e fallback

**Matriz de erros**

| Condição | HTTP | Dead-letter | Retry |
|---|---|---|---|
| HMAC/token inválido | 401 | Não | Não |
| Rate limit atingido | 429 + `Retry-After` | Não | Sim (provider responsável) |
| `client_id` não existe | 200 silencioso | Não | Não |
| JSON inválido (não parseable) | 400 | Não | Não |
| Schema inválido (campos ausentes) | 200 | Sim | Não (hub gere replay) |
| Score Engine falha | 200 | Não | Não |
| DB indisponível | 503 + `Retry-After` | Sim | Sim |
| Dedup detecta merge | 200 | Não | Não |
| Evento duplicado por `event_id` | 200 | Não | Não |

Princípio unificador: providers param de retentar em 2xx e retentam em 4xx/5xx. O hub devolve 2xx para falhas que ele próprio consegue gerir (schema inválido via dead-letter, Score Engine via fail-open). Devolve 4xx/5xx apenas quando o retry do provider é o comportamento correto.

**Estratégias de resiliência**

- Score Engine: fail-open. Lead persiste com `score = 0`, `metadata.score_error = true`. Recálculo manual possível.
- DB indisponível: 503 + `Retry-After: 30` + payload para dead-letter queue.
- Evolution API offline (VPS do cliente sem rede): o hub não recebe eventos. Mitigado por health check periódico por instância (ver R5).
- `event_id` ausente: geração interna de hash garante idempotência sem depender do provider.

**Política de fallback**

Dead-letter queue (`webhook_failures`) armazena: `provider`, `client_id`, `agency_id`, `received_at`, `raw_payload`, `reason`, `attempt_count`. Retenção: 30 dias. Replay: manual pelo operador via CLI ou endpoint admin autenticado (FDD separado — ADR-014).

**Invariantes**

- Um lead nunca é perdido silenciosamente por falha do sistema — ou persiste, ou vai para dead-letter, ou o provider recebe sinal para retentar.
- `source.platform` nunca é `null` num lead persistido — o adapter é inválido se não consegue determinar a plataforma.
- `agency_id` nunca vem do provider — é sempre derivado pelo hub.
- PII (`email`, `phone`, `name`) nunca aparece em texto claro em logs.

---

### 7. Observabilidade

**Métricas**

Obrigatórias para go-live:

- `leads_ingested_total` — counter, labels: `provider`, `client_id`, `source_platform`
- `leads_webhook_errors_total` — counter, labels: `provider`, `reason`
- `webhook_processing_duration_ms` — histogram, labels: `provider`, percentis p50/p95/p99
- `dead_letter_queue_depth` — gauge, profundidade atual da fila

Opcionais (importantes mas não bloqueadoras de go-live):

- `leads_dedup_merges_total` — counter, labels: `provider`, `client_id`
- `rate_limit_hits_total` — counter, labels: `provider`, `ip`

**Logs**

Formato: JSON estruturado, uma linha por evento, ISO-8601.

Campos obrigatórios em todos os eventos:

```json
{
  "level": "info|warn|error",
  "ts": "2026-04-22T10:30:00.000Z",
  "event_id": "sha256:a1b2c3...",
  "provider": "evolution",
  "client_id": "client-xyz-456",
  "source_platform": "whatsapp",
  "received_at": "2026-04-22T10:30:00.000Z",
  "component": "webhook-ingestion",
  "event": "lead.created",
  "duration_ms": 87
}
```

Regras de mascaramento:
- `contact.email`: nunca em plain — apenas `email_hash` (SHA-256 com salt por agência)
- `contact.phone`: nunca em plain — apenas `phone_hash`
- `contact.name`: nunca em logs de erro — é PII mesmo sem ser email ou phone
- `raw_payload`: nunca em logs — apenas persistido na tabela `webhook_failures`

**Tracing**

- Spans principais: `webhook.receive`, `webhook.auth`, `webhook.ratelimit`, `webhook.adapt`, `webhook.dedup`, `webhook.score`, `webhook.persist`, `webhook.publish`
- `correlation_id` propagado do webhook inbound a todos os spans downstream
- Amostragem: 100% de erros e dead-letter events, 10% de requests OK

**Dashboards e alertas**

Painel mínimo: RPS por provider, error rate por provider, p95 de latência, profundidade da dead-letter queue.

| Alerta | Condição | Severidade | Ação |
|---|---|---|---|
| Dead-letter crescendo | `dead_letter_queue_depth > 50` | P1 — acorda às 3h | Investigar imediatamente — leads de campanhas pagas a falhar |
| Ausência de atividade | `leads_ingested_total = 0` por 1h em horário comercial por instância Evolution | P2 | Verificar VPS do cliente |
| Events sem leads | Instância Evolution envia eventos mas `leads_ingested_total = 0` para esse `client_id` | P2 | Verificar configuração de `client_id` na URL do Evolution |

Princípio de observabilidade desta feature: monitorizar o que devia estar a acontecer, não apenas o que está a falhar. `leads_ingested_total = 0` durante 1h em horário comercial é tão crítico como um erro 500.

---

### 8. Dependências e compatibilidade

| Componente | Versão mínima | Observações |
|---|---|---|
| Next.js | 14 (App Router) | Runtime Node.js para rotas de webhook. EOL desde outubro 2025; lockfile resolve 14.2.35 (CVE-2025-29927 mitigada). |
| Supabase Postgres | 15 | Source of truth para `leads`, `lead_interactions`, `webhook_failures` |
| Supabase Edge Functions | Deno 1.x | Triggers pós-persistência |
| Supabase Vault | N/A (managed) | Armazenamento de tokens HMAC e Evolution por agência |
| Zod | 3.x | Validação do schema do DTO canónico e dos payloads por adapter |
| `libphonenumber-js` | Última estável | Normalização de phone para E.164 |
| Evolution API | Self-hosted — versão baseline documentada no go-live | Versão registada como parte do checklist de go-live; testes de contrato em CI com fixture de payload real |

**Garantias de compatibilidade**

- `schema_version: 'v1'` em todos os leads persistidos por esta feature. Evolução para v2 exige coexistência de schemas em paralelo até todos os consumidores (Score Engine, Automation Builder) declararem suporte a v2.
- Novos adapters não alteram o core do hub nem os adapters existentes — isolamento por route garante compatibilidade retroativa.
- Evolution API: qualquer atualização do VPS do cliente que quebre o fixture de contrato em CI bloqueia o deploy antes de chegar a produção.

---

### 9. Critérios de aceite técnicos

**Funcional**
- [ ] Hub recebe payload de qualquer adapter e persiste lead com todos os campos do DTO canónico preenchidos
- [ ] `event_id` gerado internamente quando ausente no payload do provider (SHA-256 do payload + received_at + provider)
- [ ] `agency_id` derivado do `client_id` pelo hub antes da persistência — nunca vem do provider
- [ ] Dedup: duplicado < 30 dias faz merge; duplicado > 30 dias cria nova lead com `metadata.duplicated_of`
- [ ] Falha do Score Engine persiste lead com `score = 0` e `metadata.score_error = true`
- [ ] `source.platform` preenchido em 100% dos leads persistidos

**Segurança**
- [ ] HMAC/token validado antes de qualquer processamento — falha retorna 401 sem detalhes
- [ ] `client_id` inexistente retorna 200 silencioso sem vazar informação
- [ ] PII (`email`, `phone`, `name`) nunca em logs em texto claro — apenas hashed
- [ ] `raw_payload` apenas na tabela `webhook_failures`, nunca em logs
- [ ] Rate limit por IP e por agência validado com carga simulada antes do go-live

**Resiliência**
- [ ] DB indisponível: 503 + `Retry-After` + payload para dead-letter queue
- [ ] Schema inválido: 200 ao provider + payload para dead-letter queue
- [ ] Falha do adapter de um provider não afeta a ingestão dos outros

**Performance**
- [ ] Ack p95 ≤ 300 ms por provider em condições normais

**Observabilidade**
- [ ] 4 métricas obrigatórias ativas em produção antes do go-live
- [ ] Alerta `dead_letter_queue_depth > 50` configurado e testado com injeção de falha

**Testes**
- [ ] Fixture com payload real do Evolution API em CI — falha do fixture bloqueia deploy
- [ ] Suite de testes de contrato por adapter
- [ ] Teste de idempotência: mesmo `event_id` processado duas vezes → 1 lead persistida
- [ ] Teste de carga: 50 req/s sustentados durante 2 minutos por adapter com p95 ≤ 300 ms

---

### 10. Riscos e mitigação

### R1 — Evolution API atualizada silenciosamente no VPS do cliente

- **Probabilidade:** crítica (é certo que vai acontecer — clientes atualizam sem avisar)
- **Impacto:** ingestão de WhatsApp para completamente sem alerta visível
- **Mitigação:**
  - Fixture com payload real da versão baseline do Evolution em CI — falha bloqueia deploy
  - Versão baseline do Evolution documentada no checklist de go-live
  - Alerta P2 se instância Evolution para de enviar eventos por mais de 1h em horário comercial
- **Plano de contingência:** atualizar fixture e adapter para o novo schema do Evolution; replay manual da dead-letter queue após o fix.

### R2 — Flood acidental ou ataque de volume

- **Probabilidade:** média
- **Impacto:** alto — rate limit insuficiente pode deixar leads legítimos bloqueados ou sobrecarregar a DB
- **Mitigação:**
  - Rate limit por IP (100 req/min) e por agência (1000 req/hora) aplicado antes de qualquer processamento
  - `rate_limit_hits_total` monitorizado — alerta quando hits sobem acima da baseline
  - Teste de carga valida o comportamento do rate limit sob pressão real
- **Plano de contingência:** ajuste dinâmico dos limites por agência via configuração sem deploy; bloqueio de IP por Vercel Edge se ataque confirmado.

### R3 — `source.platform` não mapeado em payload de novo provider

- **Probabilidade:** média
- **Impacto:** alto — leads persistidos sem origem tornam o ROI incalculável, viola H6
- **Mitigação:**
  - Validação Zod no adapter rejeita `source.platform` nulo em tempo de desenvolvimento
  - Critério de aceite obrigatório no checklist de go-live
  - `leads_ingested_total` com label `source_platform = 'unknown'` alerta se aparecer em produção
- **Plano de contingência:** backfill manual de `source.platform` via script de reconciliação nos leads afetados; corrigir o adapter e fazer replay se os leads estiverem na dead-letter queue.

### R4 — Dead-letter queue cresce sem monitorização ativa

- **Probabilidade:** baixa
- **Impacto:** alto — leads reais de campanhas pagas a falhar silenciosamente durante dias
- **Mitigação:**
  - Alerta P1 `dead_letter_queue_depth > 50` configurado e testado antes do go-live
  - Alerta testado com injeção de falha controlada (simular DB indisponível)
- **Plano de contingência:** triagem imediata da dead-letter queue; identificar `reason` mais frequente; fix e replay após resolução.

### R5 — VPS do cliente fica offline ou sem conectividade

- **Probabilidade:** alta
- **Impacto:** alto — leads de WhatsApp param silenciosamente sem nenhum erro visível no hub
- **Mitigação:**
  - Health check periódico por instância Evolution — se nenhum evento recebido durante 1h em horário comercial, alerta P2
  - Métrica `leads_ingested_total` por `client_id` + `provider = 'evolution'` para detetar ausência de atividade esperada
- **Plano de contingência:** notificação à agência para verificar o VPS; leads recebidos via WhatsApp durante o downtime são irrecuperáveis se o Evolution não os reencaminhou.

### R6 — `client_id` mal configurado no Evolution pelo cliente

- **Probabilidade:** média
- **Impacto:** médio — todos os leads chegam com 200 silencioso mas não são persistidos; o cliente não percebe
- **Mitigação:**
  - Alerta P2: instância Evolution envia eventos mas `leads_ingested_total = 0` para esse `client_id`
  - Documentação do processo de configuração da URL no Evolution com validação passo-a-passo
- **Plano de contingência:** corrigir a URL no Evolution; leads perdidos durante o período de misconfiguration são irrecuperáveis (Evolution não tem dead-letter própria).
