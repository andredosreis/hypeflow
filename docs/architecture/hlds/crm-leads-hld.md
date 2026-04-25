### HLD: CRM e Gestão de Leads (HYPE Flow OS)

Versão: 1.0
Data: 2026-04-22
Responsável: Andre dos Reis (Engenheiro de Software)

---

### Objetivo técnico

Servir como plataforma-hub de captação, qualificação e distribuição de leads para o HYPE Flow OS, com modelo de dados unificado que suporta ingestão idempotente de múltiplas fontes (webhooks de ad providers, formulários, integrações bidireccionais com GHL, ManyChat e n8n), deduplicação write-time, scoring determinístico com recálculo em tempo real, atribuição e timeline de interacções, com isolamento multi-tenant via Row Level Security e APIs internas (tRPC) consumidas por todos os módulos comerciais do OS.

Problemas técnicos do estado actual endereçados:

1. Resolução de identidade faz roundtrips à DB em cada navegação e em cada request tRPC (middleware edge e `createTRPCContext`), degradando latência e consumindo pool connections. Origem: auditoria CR-01 e CR-03. Alvo: JWT claims via `custom_access_token_hook` (story 01.7).
2. Risco de vazamento inter-tenant se as RLS policies falharem, se uma query esquecer o filtro de `agency_id`, ou se uma Edge Function usar o service role sem filtrar.
3. Falta de testes automatizados sistemáticos de RLS em CI capazes de provar que utilizador da agência A não vê leads da agência B por nenhum caminho.
4. Uso de `service_role_key` em Edge Functions e webhooks inbound sem padrão claro de filtragem por `agency_id`.
5. `createNullClient` com `any` e API incompleta (auditoria CR-02), mascarando erros em preview/demo. Alvo: story 01.8.

Dependências com outros sistemas:

- Consumidores internos: Pipeline e Kanban, Calls e Meet, Automation Builder, Portal do Cliente, Dashboard Master, Form Builder.
- Fornecedores: webhooks GHL, Tally, Typeform, ManyChat, n8n; APIs Meta Business, Google Ads, TikTok; UI manual da agência.
- Dependências horizontais: Tráfego e Pixels/UTMs, Gestão de Clientes (fornece `score_weights` e `webhook_mapping`), Notificações.

---

### Arquitetura geral

Topologia em três camadas horizontais dentro de um monorepo Turborepo, com fluxo síncrono para CRUD e listagem e fluxo assíncrono (evento mais Edge Function) para side effects.

Ambiente de implantação

- 100% cloud para o OS, single-region EU, com VPS externo do cliente como dependência de integração (Evolution API para WhatsApp).
- UI e APIs síncronas (`hypeflow`): Vercel, região `fra1` (Frankfurt). Runtime Node.js para rotas que tocam Supabase via service role, runtime Edge para middleware de auth. As apps `agency` e `portal` são workspaces legados supersedidos pelo app unificado `hypeflow` via route groups na Wave 19 e não estão em produção activa.
- Persistência, Auth, Realtime, Storage: Supabase Pro, projecto único, região EU, Postgres gerido, replicação automática, backups diários.
- Execução assíncrona: Supabase Edge Functions (Deno) na mesma região que a DB.
- Ambientes: `dev` (Supabase local via `supabase start` e Next.js `npm run dev`), `preview` (Vercel preview branch por PR apontando a instância Supabase de preview partilhada), `prod` (Vercel production e Supabase Pro prod).

Tecnologias principais

- Next.js 14 (App Router): UI do app unificado `hypeflow` (admin + portal via route groups), SSR e Server Components, runtime flexível (Node ou Edge). EOL desde outubro 2025 — sem patches de segurança futuros; lockfile resolve 14.2.35 (CVE-2025-29927 mitigada).
- React 18: render da listagem, modal de criação, timeline live.
- TypeScript 5: type-safety end-to-end entre cliente, router tRPC e Edge Functions.
- tRPC 11: router `leads` com contratos type-safe, zero boilerplate REST.
- Zod 3: schemas de validação partilhados entre cliente, servidor e Edge Functions.
- Supabase Postgres 15: source of truth para `leads` e `lead_interactions`, JSONB para UTMs e metadata.
- Supabase Auth: identidade com JWT claims custom via `custom_access_token_hook` (após story 01.7).
- Supabase RLS: camada autoritativa de autorização.
- Supabase Realtime: timeline live e contador live no dashboard.
- Supabase Edge Functions (Deno): triggers pós-mutação, recálculo de score fora do request path, scheduler para jobs temporais.
- Tanstack Query 5: cache e revalidação client-side.
- Vercel: hosting dos apps Next.js com deploys por PR.
- Turborepo: orquestração do monorepo e cache incremental de builds.

Padrões adotados

- Multi-tenant RLS-first: segurança de isolamento nas policies de Postgres; código aplica filtros como defesa em profundidade.
- Type-safe RPC (tRPC): contratos Zod únicos; webhooks externos são excepção REST.
- Event-driven assíncrono para side effects: mutações síncronas no tRPC, recálculos e notificações via Edge Functions invocadas por Postgres triggers ou scheduler.
- Adapter pattern para providers externos: Evolution, ManyChat, GHL, Meta, Google, Typeform, Tally atrás de interfaces internas uniformes.
- Idempotent ingestion e write-time deduplication: `event_id` único por ingestão externa, unique constraint composto em `(client_id, email_normalized)` e `(client_id, phone_normalized)`.
- Descartados deliberadamente na Fase 1: CQRS (volume não justifica), Hexagonal formal universal (overkill), Repository pattern universal (introduzir apenas se justificar migração futura).

---

### Componentes e responsabilidades

| Componente | Responsabilidades | Dependências |
| ----------- | ----------------- | ------------ |
| Leads UI (Agency) | Lista, perfil, modal de criação, bulk actions, exportação CSV, Kanban embedded para pipeline view — route group `(admin)` dentro de `apps/hypeflow` | Leads tRPC Router, Score Engine (preview), Realtime Publisher, Audit Logger, `@supabase/ssr`, Vercel |
| Leads UI (Portal) | Vista read-only filtrada por `client_id` do utilizador, timeline limitada — route group `(client)` dentro de `apps/hypeflow` | Leads tRPC Router subset, Realtime Publisher, `@supabase/ssr`, Vercel |
| Leads tRPC Router | Orquestração de list, create, update, assign, bulk, getById; validação Zod; invocação de Score Engine | Score Engine, Normalizer e Dedup, Leads Persistence, Event Publisher, RLS enforced, Supabase client, Zod |
| Score Engine | Função pura que calcula score 0-100 e temperatura a partir de dados da lead e pesos do cliente | `clients.settings.score_weights` lido via Leads Persistence |
| Normalizer e Dedup Service | Normalização de email e phone para E.164, hashing com salt, verificação de duplicados antes do insert | Leads Persistence (unique constraint), `libphonenumber-js`, crypto API |
| Webhook Ingestion Handlers | Endpoints `api/webhooks/{ghl,tally,typeform}` e `api/{manychat,n8n}`; validação HMAC; mapeamento de payload para Lead DTO; invocação do tRPC | Leads tRPC Router, Normalizer e Dedup, Audit Logger, APIs dos providers externos |
| Event Publisher | Publica eventos `lead.created`, `lead.stage_changed`, `lead.score_changed`, `interaction.logged` para consumo por Automation Builder e outros módulos | Leads Persistence triggers, consumidores internos do CRM, Supabase Edge Functions runtime |
| Realtime Channel Publisher | Publica mudanças de `leads` e `lead_interactions` em canais filtrados por `agency_id` e `client_id` | Leads Persistence, Supabase Realtime managed |
| Audit Logger | Regista acções sensíveis (exportação CSV, bulk reassign, delete, merges de dedup, tentativas RLS) em `audit_logs` | Leads Persistence, `clients` para contexto |
| RLS Policy Set | Policies `agency_leads_*`, `client_leads_*`, `audit_leads_*`, `webhook_failures_admin_read` como fonte autoritativa de autorização | Schemas de `leads`, `lead_interactions`, `audit_logs`, `auth.users` (claims via hook), Postgres 15, Supabase Auth |
| Leads Persistence | Tabelas `leads`, `lead_interactions` com índices, constraints de unicidade e triggers de notify | Schemas de `agencies`, `clients`, `users`, `ad_campaigns`, `pipeline_stages`, Supabase Postgres |
| Evolution API Adapter | Cliente HTTP para envio de WhatsApp outbound e recepção de webhook de status; registo da resposta como `lead_interaction` | Automation Builder (acção `send_whatsapp`), Lead Interactions, VPS cliente (HTTP), secrets via Supabase Vault ou env vars |
| Lead Retention Job | Scheduled function que aplica política de retenção e erasure GDPR em cascata para `leads`, `lead_interactions`, `audit_logs`, `webhook_failures` | Leads Persistence, Audit Logger, Supabase Scheduled Functions ou pg_cron |

---

### Fluxo de requisições e de dados

Fluxo de requisição (A): ingestão de lead via webhook externo (GHL, Tally, Typeform, ManyChat)

- Provider externo faz POST HTTP com assinatura HMAC.
- Vercel Edge recebe no route `api/webhooks/<provider>`, verifica HMAC e responde 200 se válido.
- Webhook Ingestion Handler normaliza payload para Lead DTO canónico (mapeamento por cliente em `clients.settings.webhook_mapping`).
- Leads tRPC Router é invocado server-side; valida com Zod, passa por Normalizer e Dedup.
- Dedup verifica `(client_id, email_normalized)` ou `(client_id, phone_normalized)`; se duplicado menor que 30 dias, faz merge e retorna; se maior que 30 dias, cria nova lead com `metadata.duplicated_of`.
- Score Engine calcula score inicial.
- Transacção Postgres: INSERT em `leads`, INSERT em `lead_interactions` (tipo `status_change`, origem), INSERT em `audit_logs`.
- Postgres trigger AFTER INSERT em `leads` emite NOTIFY `lead.created`.
- Supabase Realtime faz broadcast `leads:INSERT` no canal da agência; dashboard incrementa contador live.
- Event Publisher Edge Function invoca `automation-engine` com `trigger_type = 'lead_created'` (fire-and-forget).
- Latência alvo do ack (passos 1 e 2): p95 menor ou igual a 300 ms.

Fluxo de requisição (B): mutação síncrona via UI (agente regista interacção)

- Agente faz tRPC mutation `interactions.create` no browser.
- Vercel Node runtime valida JWT (middleware edge já validou; claims em `app_metadata` após story 01.7) e valida input com Zod.
- Transacção Postgres: INSERT em `lead_interactions` com RLS aplicada, UPDATE de `leads.last_contact_at`, Score Engine recalcula e UPDATE de `leads.score` e `leads.temperature`.
- tRPC retorna payload; Tanstack Query invalida cache de `lead.getById(id)` e `lead.list`.
- UI re-renderiza timeline via Realtime subscription e score badge via query invalidation.
- Latência alvo: p95 menor ou igual a 800 ms entre click e render da nova linha da timeline.

Fluxo de requisição (C): consulta read-only pelo portal do cliente

- Cliente faz tRPC query `portal.leads.list` no browser.
- Middleware edge validou JWT com claims `user_type = 'client'`, `client_id`, `agency_id`.
- SELECT em Postgres com RLS policy `client_leads_read` aplicando filtro de `client_id` via JWT claims.
- Retorna subset; Tanstack Query cacheia; UI renderiza.
- Latência alvo: p95 menor ou igual a 500 ms.

Fluxo de dados (resumo)

- Origem: providers externos (webhooks e APIs) ou UI manual.
- Transformação: normalização de PII (phone E.164, email lowercase), hashing (SHA-256 com salt por agência), mapeamento para Lead DTO canónico, computação de score e temperatura.
- Destino primário: Postgres (tabelas `leads`, `lead_interactions`, `audit_logs`, `webhook_failures`).
- Destino secundário (broadcast): Supabase Realtime para UIs conectadas; Event Publisher para Automation Builder e outros módulos.
- Destino de falha: tabela `webhook_failures` (dead-letter queue) para replay posterior.

Pontos de validação principais: HMAC no webhook, schema Zod do payload externo, schema Zod do Lead DTO canónico, JWT com claims no middleware, unique constraint em Postgres, RLS policies, validação de output do Score Engine.

Pontos de transformação: mapeamento provider para Lead DTO, normalização de phone para E.164, normalização e hash de email, score computation, prosa generator para regras de automação, CSV serialization.

Canais assíncronos (eventos, filas, streams):

- Postgres NOTIFY `lead.created`, `lead.stage_changed`, `lead.score_changed`, `interaction.logged` via triggers; semântica at-least-once.
- Supabase Realtime pub/sub managed para UIs conectadas; semântica at-most-once.
- Dead-letter queue em tabela `webhook_failures`; replay pendente (ADR-014).
- Scheduled jobs para `lead_no_contact`, retenção GDPR e delays de automação; idempotency key para evitar duplicação.

Tratamento de erros e edge cases cobre três fluxos e 5 cenários transversais (ver matriz detalhada em documentação interna). Princípios: fail-closed em ambiguidade de autorização; idempotência por `event_id`; dead-letter para payloads malformados; retry com backoff exponencial para falhas transitórias.

---

### Modelo de dados (alto nível)

Entidades principais (owned pelo módulo)

- Lead: contacto comercial potencial com origem, qualificação, pipeline stage, score, temperatura e metadados.
- LeadInteraction: evento na timeline (call, email, whatsapp, note, status_change, meeting, task, assignment_change).
- AuditLog: registo de acções sensíveis (exportação, bulk reassign, delete, merges, tentativas RLS).
- WebhookFailure: payloads falhados candidatos a replay (suporte a ADR-014).

Entidades referenciadas (owned por outros módulos)

- Agency: FK em todas as tabelas (`agency_id`), owned por Auth e Tenancy.
- Client: FK em `leads.client_id`, owned por Gestão de Clientes.
- User (agency_user): FK em `leads.agent_id` e `lead_interactions.user_id`.
- ClientUser (portal_user): consumido via RLS filtrada.
- PipelineStage: FK em `leads.pipeline_stage_id`, owned por Pipeline e Kanban.
- AdCampaign: FK em `leads.campaign_id`, owned por Tracking de Tráfego.

Relações

- Agency 1..N Client 1..N Lead 1..N LeadInteraction.
- Lead N..1 PipelineStage (FK opcional).
- Lead N..1 AdCampaign (FK opcional).
- Lead N..1 User (agent_id, opcional).
- LeadInteraction N..1 User (user_id, opcional).
- AuditLog N..1 Agency, N..1 User, N..0 Lead.
- WebhookFailure N..1 Agency.

Fonte de verdade

- Postgres Supabase é source of truth para `leads`, `lead_interactions`, `audit_logs`, `webhook_failures`.
- Componentes que lêem estado derivado (preview de score no cliente, timeline em tempo real) devem refrescar via mutation ou subscription; não existe cache alternativo ao Postgres (suporte a ADR-010 e ADR-011).

Versionamento e evolução

- Lead DTO canónico versionado (ADR-013): campo `schema_version` começa em `v1`; mudanças breaking criam `v2` em paralelo antes de migrar consumidores.
- Enum aberto em `lead_interactions.type` via TEXT para permitir novos tipos sem migration.
- Metadata em JSONB para dados ainda sem coluna dedicada.

Retenção (ADR-008 pendente)

- `leads` e `lead_interactions`: retenção indefinida na Fase 1; particionamento mensal avaliado aos 500 mil linhas em `lead_interactions`.
- `audit_logs`: retenção de 2 anos.
- `webhook_failures`: retenção de 30 dias com purga automática.
- GDPR right-to-erasure: endpoint dedicado que cascata para as quatro tabelas em transacção única.

---

### Interfaces públicas

| Nome | Tipo | Protocolo | Exposição | SLAs/Limites |
| ---- | ---- | ---------- | --------- | ------------- |
| tRPC Router `leads` | API | tRPC sobre HTTP/JSON | Interna | p95 menor ou igual a 500 ms; autz por JWT com claims |
| Webhook `api/webhooks/ghl` | Webhook inbound | HTTPS + HMAC-SHA256 | Externa (assinada) | p95 ack menor ou igual a 300 ms; rate 100 req/min por IP, 1000/hora por agência |
| Webhook `api/webhooks/tally` | Webhook inbound | HTTPS + HMAC | Externa | idem |
| Webhook `api/webhooks/typeform` | Webhook inbound | HTTPS + HMAC | Externa | idem |
| Webhook `api/manychat` | Webhook inbound | HTTPS + HMAC | Externa | idem |
| Webhook `api/n8n` | Webhook inbound | HTTPS + shared secret | Externa | idem |
| Supabase Realtime channel `agency:<id>` | Stream | WebSocket managed | Interna | at-most-once; cliente precisa reconectar se disconnect |
| Supabase Realtime channel `client:<id>` | Stream | WebSocket managed | Interna (subset client_user) | idem |
| Postgres NOTIFY `lead.*` e `interaction.*` | Evento interno | pg_notify | Interna | at-least-once; consumidores devem ser idempotentes |
| Evolution API Adapter outbound | HTTP client | HTTPS REST | Externa (VPS cliente) | rate limit gerido no Automation Builder; retry 3x com backoff |
| Webhook `api/webhooks/evolution` (status de entrega) | Webhook inbound | HTTPS + token | Externa | idem webhooks; regista `lead_interaction` com outcome |
| Supabase Auth | Identity API | HTTPS JSON | Interna (SDK) | managed; JWT access token 60 min, refresh token 30 dias |
| Export CSV job artefacto | Artefacto | Supabase Storage (URL assinada) | Externa ao utilizador autenticado | TTL 24 h (ADR-016) |

---

### Considerações de escalabilidade e disponibilidade

Abordagem geral

- Horizontal scaling dos apps Next.js via Vercel serverless (auto-scale gerido).
- Postgres scaling vertical via Supabase Pro com upgrade disponível para compute maior; particionamento mensal de `lead_interactions` como próximo passo quando aos 500 mil linhas (ADR-008).
- Realtime e Edge Functions escalam de forma managed pelo Supabase.
- Single-region EU na Fase 1; multi-região só justifica na Fase 3 se houver clientes LATAM ou US (alinhado com PRD macro).

Técnicas aplicadas

- Load balancing managed por Vercel e Supabase (nenhuma config manual na Fase 1).
- Caching: apenas Tanstack Query no cliente com `staleTime` de 30 s para listagens e 0 para perfil de lead (ADR-010).
- Rate limiting: 100 req/min por IP e 1000 req/hora por agência nos webhooks inbound; protecção específica para acções WhatsApp outbound via Automation Builder (ADR-009).
- Autoscaling: managed por Vercel (per-request) e Supabase (connection pool via Supavisor).
- Paginação server-side obrigatória em `leads.list` com limite superior de 500 por página.
- Backpressure: quando DB atinge 90% do pool, devolver 503 temporário com `Retry-After`; alerta P1.

Meta de disponibilidade

- Webhooks inbound (interface externa): 99.9% uptime mensal, SLI = % de requests que retornam 200 ou 4xx.
- tRPC internal: 99.5% uptime mensal.
- Error budget mensal: aproximadamente 3h30min de downtime para serviços internos.
- Recuperação de falhas: retry com backoff exponencial (100 ms, 500 ms, 2 s) em operações transitórias; dead-letter queue para falhas persistentes; runbook de emergência para incidentes RLS P0.

Escala prevista Fase 1

- Até 50 agências e 500 clientes, até 500 mil leads totais, até 5 milhões de `lead_interactions`, 100 utilizadores concorrentes (meta do PRD macro).
- Supabase Pro suporta este volume com folga; reavaliação necessária aos 80% de qualquer limite de plano.

---

### Segurança

Autenticação

- Supabase Auth gere identidade (email e password, OAuth Google para agência, opcional para portal).
- JWT access token com claims custom via `custom_access_token_hook`: `user_type`, `agency_id`, `client_id`, `role`. Claims em `user.app_metadata` (imutável pelo cliente).
- Refresh tokens geridos pelo Supabase SDK com rotação automática.
- Session TTL: access token 60 min, refresh token 30 dias.
- MFA opcional (TOTP) na Fase 1; obrigatório para `agency_admin` em Fase 2.

Autorização

- RLS-first: 7 policies principais (`agency_leads_all`, `client_leads_read`, `agency_interactions_all`, `client_interactions_read`, `agency_audit_read`, `webhook_failures_admin_read`, `service_role_bypass` restrito).
- Aplicação como defesa em profundidade: middlewares tRPC `enforceAgencyUser` e `enforceClientUser` rejeitam cedo; RLS é a autoridade final.
- Role-based actions: exportação CSV, bulk reassign e delete restritos a `agency_admin` e `agency_manager`.
- Edge Functions com service role obrigatoriamente filtram por `agency_id` em todas as queries; lint rule a criar.

Proteção de dados

- Criptografia em trânsito: TLS 1.3 everywhere; webhook endpoints rejeitam HTTP plain.
- Criptografia em repouso: Postgres data encryption managed por Supabase (AES-256).
- Backups encriptados (Supabase Pro default).
- PII (`email`, `phone`): valor original em plaintext acessível via RLS; `email_normalized` (lowercase e trim) e `phone_normalized` (E.164) para dedup; `email_hash` e `phone_hash` (SHA-256 com salt por agência) para queries sem carregar plain.
- PII nunca logado em texto claro (lint rule proíbe).
- Direito ao esquecimento (GDPR Article 17): endpoint autenticado com cascata transaccional.
- Portabilidade (GDPR Article 20): endpoint de exportação em JSON.
- Data Processing Agreement assinado com Supabase antes de GA.

Gestão de segredos

- Supabase Vault para secrets que a DB precisa ler (tokens de integrações por agência, HMAC secrets dos webhooks).
- Vercel env vars para secrets do runtime Node (service role key, OpenAI key, Evolution API token).
- Nunca hardcoded; lint rule impede.

Webhooks

- HMAC signature validation obrigatória inbound; falhas retornam 401 sem detalhes.
- Rate limiting por IP (100 req/min) e por agência (1000 req/hora).
- Webhooks outbound (via Automation Builder): apenas HTTPS, allowlist opcional por agência, SSRF protection (bloquear IPs privados e metadata endpoints como `169.254.169.254`).

---

### Observabilidade

Logs

- JSON estruturado, uma linha por evento, ISO-8601 timestamps.
- Campos obrigatórios: `level`, `ts`, `correlation_id`, `user_id` (hash), `agency_id`, `component`, `event`, `message`.
- PII nunca em plain (lint rule).
- Destino: Vercel Log Drain para Axiom ou equivalente (ADR-017 pendente); retenção 30 dias.
- Nível default produção: `info`; `debug` por feature flag.

Métricas

- `leads_created_total` por `source`, `agency_id`, `client_id`, `method`.
- `leads_webhook_errors_total` por `provider`, `reason`.
- `lead_score_duration_ms` (histogram) por `agency_id`.
- `lead_dedup_merges_total` por `agency_id`.
- `trpc_request_duration_ms` (histogram) por `router`, `procedure`, `status`.
- `rls_denials_total` por `table`, `user_type`.
- `cross_tenant_attempts_total` por `user_type`.
- `audit_exports_total` por `agency_id`, `format`.
- `webhook_failures_queue_depth` (gauge).
- `score_recalc_failed_total` por `agency_id`.

Tracing

- OpenTelemetry-compatible; exporter a definir em ADR-017.
- Spans principais: `leads.create`, `leads.update`, `leads.list`, `leads.score`, `leads.dedupe`, `webhook.ghl.process`, `webhook.tally.process`, `webhook.typeform.process`, `automation.trigger`.
- Amostragem: 100% de erros, 10% de requests OK (ajustável por rota crítica).
- Propagação de `correlation_id` do webhook inbound ao outbound.

Dashboards e alertas (candidatos a ADR-017)

- Saúde do módulo: RPS, error rate, latência p50/p95/p99.
- Ingestão de leads: taxa por provider, erros, dedup efficiency.
- Segurança: cross_tenant_attempts, rls_denials, HMAC failures.
- Capacity: DB size, egress, connection pool utilisation.

Alertas priorizados

- P1: `cross_tenant_attempts_total` maior que 0 (investigar imediato).
- P1: `rls_denials_total` maior que 100/min (tentativa coordenada).
- P1: Postgres connection pool maior que 90%.
- P2: `webhook_failures_queue_depth` maior que 100.
- P2: error rate tRPC maior que 5% durante 5 min.
- P3: `score_recalc_failed_total` maior que 10/h.
- P3: DB size maior que 80% do plano.

SLOs (candidatos a ADR-018)

- Disponibilidade externa webhooks: 99.9% mensal.
- Disponibilidade interna tRPC: 99.5% mensal.
- Latência p95 tRPC menor ou igual a 500 ms.
- Latência p95 webhook ack menor ou igual a 300 ms.
- Integridade: 0 eventos de `cross_tenant_attempts` com sucesso confirmado (incidente P0 se ocorrer).

---

### Riscos arquiteturais e mitigação

#### Violação silenciosa de RLS expõe dados entre agências
- **Probabilidade:** baixa
- **Impacto:** crítico (incidente P0, perda de confiança, GDPR)
- **Mitigação:**
  - Testes automatizados de RLS em CI (suite dedicada que tenta cross-tenant reads como utilizador adversário)
  - Peer review obrigatório em migrations que alterem policies
  - Lint rule a exigir filtro explícito de `agency_id` em queries com service role
  - Alerta P1 imediato em `cross_tenant_attempts_total` maior que 0
- **Plano de contingência:** runbook de emergência: `REVOKE` temporário do papel afectado, investigação por auditoria dos logs, deploy de fix, relatório de incidente, notificação das agências afectadas dentro de 72h (GDPR).

#### Webhook provider externo muda formato ou assinatura sem aviso
- **Probabilidade:** média
- **Impacto:** alto (ingestão parada, leads perdidas)
- **Mitigação:**
  - Testes de contrato por provider em CI
  - Validação Zod granular com erros específicos
  - Alerta automático em `leads_webhook_errors_total{reason='schema'}` acima de baseline
  - Dead-letter queue preserva payloads para replay
- **Plano de contingência:** hotfix do schema no handler do provider; replay da dead-letter queue (ADR-014) após o fix.

#### Free tier ou plano Supabase atingido por crescimento inesperado
- **Probabilidade:** média
- **Impacto:** alto (DB lock, upload rejeitado, degradação)
- **Mitigação:**
  - Alerta aos 80% de qualquer limite (DB size, egress, compute, invocations)
  - Dashboard de capacity com trend 30 dias
  - Playbook de upgrade Pro para plano superior
  - ADR-003 define threshold de migração managed para self-host
- **Plano de contingência:** upgrade de plano imediato; se self-host for o destino, activar plano de migração documentado (downtime planeado, janela fora de horas úteis).

#### Evolution API no VPS do cliente indisponível
- **Probabilidade:** média
- **Impacto:** médio (sem WhatsApp outbound, CRM continua)
- **Mitigação:**
  - Health check periódico do VPS com alerta suave à agência
  - Circuit breaker no Evolution Adapter: após 3 falhas consecutivas, marcar provider indisponível por 5 min
  - Fila local de retries com TTL de 24h
  - Feature flag para fallback a ManyChat ou WhatsApp Business Cloud API oficial (ADR-002)
- **Plano de contingência:** activação manual do fallback provider; notificação à agência; replay da fila após recuperação.

#### Score Engine retorna valores inconsistentes entre cliente (preview) e servidor (persistido)
- **Probabilidade:** baixa
- **Impacto:** médio (confusão operacional, decisões com dados errados)
- **Mitigação:**
  - Função partilhada em `packages/` importada por cliente, servidor e Edge Functions
  - Testes unitários de paridade (mesmo input em ambos os ambientes)
  - Alerta em `score_recalc_failed_total` acima de 10/h
- **Plano de contingência:** desactivar preview live temporariamente; investigar desvio; deploy de fix.

#### Retry de provider externo cria duplicação apesar de idempotência
- **Probabilidade:** baixa
- **Impacto:** médio (poluição de dados, má atribuição)
- **Mitigação:**
  - `event_id` único do provider usado como idempotency key
  - Unique constraint composto em Postgres como barreira final
  - Logs marcam `idempotent_hit=true`
- **Plano de contingência:** reconciliação manual via audit logs; merge assistido por operador se necessário.

#### Volume de `lead_interactions` degrada queries de timeline e analytics
- **Probabilidade:** alta (no médio prazo)
- **Impacto:** médio (latência da UI cresce)
- **Mitigação:**
  - Índice composto em `(lead_id, created_at DESC)`
  - Paginação obrigatória na timeline
  - Trigger de particionamento mensal aos 500 mil linhas (ADR-008)
- **Plano de contingência:** particionar retrospectivamente por data; arquivar interacções com mais de 2 anos em tabela fria.

#### `service_role_key` vaza por bug ou misconfig
- **Probabilidade:** baixa
- **Impacto:** crítico (bypass total de RLS possível)
- **Mitigação:**
  - Secret apenas em env vars do runtime (Vercel), nunca commitado
  - Rotação trimestral
  - Uso restrito a Edge Functions e handlers específicos
  - Lint rule para detectar hardcoded patterns
- **Plano de contingência:** rotação imediata no Supabase; invalidação de todos os tokens ativos; auditoria forense dos últimos 90 dias de logs.

---

### ADRs e próximos passos

ADRs associados (backlog a formalizar)

- ADR-001: Plano Supabase para Fase 1 (Pro vs Free vs self-host). Recomendação actual: Pro; reavaliar aos 80 EUR/mês totais.
- ADR-002: WhatsApp provider (Evolution API via VPS vs ManyChat vs WhatsApp Business Cloud API oficial). Recomendação: Evolution como primário com fallback por feature flag.
- ADR-003: Estratégia de migração Supabase managed para self-host. Threshold de disparo e plano de migração documentado.
- ADR-004: Claims JWT via `custom_access_token_hook` (story 01.7). Em implementação.
- ADR-005: Remoção do `createNullClient` em favor de Supabase local e MSW (story 01.8). Em implementação.
- ADR-006: Mecanismo de invocação da Edge Function em mutações (Postgres trigger vs hook tRPC vs webhook interno). Pendente.
- ADR-007: Scheduler temporal (`pg_cron` vs Supabase Scheduled Functions) para `lead_no_contact` e delays de automações. Pendente.
- ADR-008: Política de retenção de `lead_interactions` (particionamento mensal vs trimestral vs sem particionamento). Recomendação inicial: sem particionamento até 500 mil linhas.
- ADR-009: Rate limiter por agência para acções WhatsApp (protecção contra ban). Pendente.
- ADR-010: CRM não adopta Redis ou cache distribuído na Fase 1. Tanstack Query e Postgres bastam.
- ADR-011: Postgres é source of truth único; componentes que lêem estado derivado vão à DB.
- ADR-012: `pg_notify` mais Edge Functions como canal de eventos internos na Fase 1.
- ADR-013: Lead DTO canónico versionado; mudanças breaking criam `v2` paralelo antes de migrar.
- ADR-014: Mecanismo de replay da dead-letter queue de webhooks (UI admin vs CLI vs retry automático com backoff; política de alerting).
- ADR-015: Optimistic concurrency control via coluna `updated_at`.
- ADR-016: Exportação CSV de volume grande (mais de 5 mil leads) como job assíncrono com artefacto em Supabase Storage, bucket `exports/`, TTL 24h, URL assinada.
- ADR-017: Stack de dashboards e alertas (Axiom vs Datadog vs Grafana Cloud).
- ADR-018: SLIs, SLOs formais com error budget policy.

Decisões pendentes (a formalizar nos ADRs acima)

- Threshold exacto para migração managed para self-host (ADR-003).
- Mecanismo preferido de invocação da Edge Function (ADR-006).
- Scheduler definitivo (ADR-007).
- Replay automation da dead-letter queue (ADR-014).
- Stack de observabilidade (ADR-017).
- Error budget policy (ADR-018).

Próximos passos

1. Implementar stories 01.7 (JWT claims) e 01.8 (remoção do NullClient). Prioridade P1.
2. Formalizar ADRs 001 a 018 seguindo o template de ADR a definir em pass separado.
3. Desenhar suite de testes RLS para CI e integrar no pipeline antes do próximo release major.
4. Escrever FDD derivado deste HLD para a feature de ingestão via webhook (primeira área crítica pela superfície de risco externa).
5. Definir baselines numéricas das métricas principais (volume de leads, latências actuais, error rate) antes de activar os SLOs formais.
6. Consolidar o runbook de incidentes RLS e validá-lo em simulação (game day).
7. Assinar DPA com Supabase e publicar política de retenção e erasure antes de GA.
