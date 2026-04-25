# FDD — Lead Qualification Engine

**Versão:** 0.1  
**Data:** 2026-04-22  
**Autor:** Andre dos Reis  
**Status:** Draft  
**Pacote:** `@hypeflow/lead-qualification-engine`

---

## Índice

1. [Contexto e Motivação Técnica](#1-contexto-e-motivação-técnica)
2. [Requisitos Funcionais](#2-requisitos-funcionais)
3. [Requisitos Não-Funcionais](#3-requisitos-não-funcionais)
4. [Arquitectura e Contratos de Interface](#4-arquitectura-e-contratos-de-interface)
5. [Plano de Testes](#5-plano-de-testes)
6. [Observabilidade e Critérios de Aceite](#6-observabilidade-e-critérios-de-aceite)
7. [Exclusões e Scope v0.1](#7-exclusões-e-scope-v01)

---

## 1. Contexto e Motivação Técnica

### 1.1 Problema de Negócio

À medida que o volume de leads numa agência cresce, os operadores perdem capacidade de decidir manualmente quais contactos priorizar. Uma fila de 50+ leads sem ordenação por intenção obriga o operador a abrir cada lead individualmente, o que aumenta o tempo de resposta médio e reduz a taxa de conversão.

O HypeFlow OS não possui actualmente qualquer mecanismo de scoring. Todos os leads têm o mesmo peso visual na lista — um operador não consegue distinguir, ao primeiro olhar, um lead com alta intenção de compra de um lead frio gerado por tráfego orgânico de baixa qualidade.

### 1.2 Decisão Arquitectural: Motor Puro

O Lead Qualification Engine é implementado como uma **função pura TypeScript** — sem acesso directo à base de dados, sem efeitos laterais, sem estado global. Esta decisão garante:

- **Testabilidade total:** cada combinação de inputs produz um output verificável sem mocks de infraestrutura
- **Portabilidade:** o motor pode ser chamado em Server Components, Server Actions, Route Handlers ou scripts de backfill sem depender de contexto de request
- **Determinismo:** dado o mesmo `input` e `config`, o resultado é sempre idêntico — crítico para auditabilidade e debugging
- **Performance previsível:** sem I/O no caminho crítico; p95 < 5ms é atingível

O acesso à base de dados — para buscar os dados do lead e a configuração de pesos — é sempre responsabilidade do caller.

### 1.3 Utilizadores do Sistema

| Utilizador | Interacção com o Engine |
|---|---|
| Operador de vendas | Vê score e tier na lista de leads; abre modal de lead com breakdown de pontuação |
| Admin da agência | Configura os pesos por nicho via UI; activa/desactiva o score ordering |
| Automation Builder | Usa `tier` como condição de trigger em regras de automação |
| Sistema (backfill) | Chama `scoreLead()` em batch para calcular scores de leads históricos |

---

## 2. Requisitos Funcionais

### 2.1 Sinais de Pontuação

O motor calcula um score composto a partir de 6 sinais. Cada sinal produz um valor normalizado entre 0.0 e 1.0, que é depois multiplicado pelo peso configurado.

| Sinal | Campo fonte | Descrição |
|---|---|---|
| `platform` | `lead.source` | Canal de origem do lead (ex: WhatsApp > Instagram > Facebook) |
| `completeness` | `lead.*` | Proporção de campos obrigatórios preenchidos (nome, telefone, email, nicho) |
| `campaign_quality` | `lead.campaign_id → campaign.quality_score` | Score de qualidade da campanha de origem |
| `message_intent` | `lead.first_message` | Presença de palavras-chave de alta intenção no primeiro contacto |
| `recency` | `lead.created_at` | Proximidade temporal da criação do lead relativamente a `now` |
| `response_speed` | `lead_interactions.created_at WHERE type IN ('call', 'whatsapp')` | Velocidade da primeira interacção do operador após a criação do lead |

### 2.2 Estrutura de Output

```typescript
interface ScoreResult {
  score: number;         // Inteiro 0-100
  tier: 'cold' | 'warm' | 'hot';
  breakdown: Array<{
    signal: string;
    raw_value: number;   // Valor normalizado 0.0–1.0
    weight: number;      // Peso configurado 0.0–1.0
    contribution: number; // raw_value * weight * 100
  }>;
  weights_version: string; // SHA-256 truncado a 8 chars do config de pesos
}
```

**Invariante:** `score === Math.round(sum(breakdown[i].contribution))`

**Tiers:**

| Tier | Range |
|---|---|
| `cold` | 0–39 |
| `warm` | 40–69 |
| `hot` | 70–100 |

### 2.3 Estrutura de Configuração de Pesos

```typescript
interface ScoreWeightsConfig {
  client_id: string;
  niche: string;
  weights: {
    platform: number;
    completeness: number;
    campaign_quality: number;
    message_intent: number;
    recency: number;
    response_speed: number;
  };
  keywords: {
    high_intent: string[];   // ex: ["quero comprar", "qual o preço"]
    medium_intent: string[]; // ex: ["mais informações", "me chame"]
  };
  recency_decay_hours: number; // Score de recency cai a 0 após este número de horas
}
```

A soma de todos os pesos em `weights` deve ser igual a 1.0. O Zod schema valida esta invariante no momento de parsing do config.

### 2.4 Defaults por Nicho

| Nicho | Peso `message_intent` | Peso `completeness` | Peso `recency` | Diferencial de Keywords |
|---|---|---|---|---|
| `imobiliário` | 0.35 (↑) | 0.20 | 0.15 | Inclui "visita", "disponível", "planta" |
| `crédito` | 0.20 | 0.35 (↑) | 0.15 | Inclui "aprovado", "score", "renda" |
| `clínica` | 0.20 | 0.20 | 0.30 (↑) | Inclui "urgente", "consulta", "dor" |
| `default` | 0.20 | 0.20 | 0.20 | Keywords genéricas de intenção |

Os nichos diferem tanto nos pesos como nas keywords. O admin pode sobrescrever qualquer valor via UI.

### 2.5 Controlo de Acesso

O engine não implementa controlo de acesso — é uma função pura sem consciência de sessão. O isolamento multi-tenant é responsabilidade do caller:

- O caller deve buscar o config com `WHERE client_id = X` antes de invocar `scoreLead()`
- O caller deve garantir que o `ScoreInput` pertence ao mesmo `client_id` do config
- Erros de isolamento são silenciosos para o engine — produzem um score incorrecto sem lançar excepção

---

## 3. Requisitos Não-Funcionais

### 3.1 Performance

| Métrica | Target | Contexto |
|---|---|---|
| Latência p95 `scoreLead()` | < 5ms | Função pura, sem I/O |
| Latência p95 com cache hit | < 1ms | Config já em memória |
| Latência p99 `scoreLead()` | < 20ms | Inclui parsing Zod do config |

O budget de 5ms refere-se exclusivamente à execução da função — não inclui o tempo de fetch do config à base de dados (responsabilidade do caller).

### 3.2 Determinismo

Três fontes de não-determinismo foram identificadas e mitigadas:

| Fonte | Mitigação |
|---|---|
| `Date.now()` para calcular `recency` e `response_speed` | O caller injeta `now: Date` no `ScoreInput`; o engine nunca chama `Date.now()` internamente |
| Ordem de iteração no `breakdown` array | Constante `CRITERION_ORDER: string[]` define a ordem fixa dos sinais; o breakdown é sempre construído nessa ordem |
| Normalização de strings em keyword matching | Todas as comparações usam `toLowerCase().trim()` tanto no `first_message` como nas `keywords` |

Com estas mitigações, `scoreLead(input, config)` é **referentially transparent**: o mesmo par `(input, config)` produz sempre o mesmo `ScoreResult`.

### 3.3 Isolamento Multi-Tenant

O engine é stateless e não valida `client_id`. O isolamento é garantido pelas seguintes responsabilidades do caller:

1. Buscar config com `SELECT * FROM score_weights WHERE client_id = $1`
2. Construir `ScoreInput` apenas com dados do lead do mesmo `client_id`
3. Nunca partilhar uma instância de config entre requests de clientes diferentes

O cache de config (§4.4) está keyed por `client_id` — não há risco de cross-tenant config leak no cache.

### 3.4 Resiliência de Configuração

Se o config de pesos não existir para um `client_id`, o caller aplica o config `default` do nicho detectado no lead. O engine nunca recebe um config nulo — o fallback é sempre resolvido antes de `scoreLead()` ser invocado.

---

## 4. Arquitectura e Contratos de Interface

### 4.1 Localização no Monorepo

```
packages/
└── lead-qualification-engine/
    ├── package.json           # name: "@hypeflow/lead-qualification-engine"
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts           # Exports públicos: scoreLead, invalidateConfig
    │   ├── engine.ts          # Implementação de scoreLead()
    │   ├── signals/
    │   │   ├── platform.ts
    │   │   ├── completeness.ts
    │   │   ├── campaign_quality.ts
    │   │   ├── message_intent.ts
    │   │   ├── recency.ts
    │   │   └── response_speed.ts
    │   ├── config/
    │   │   ├── cache.ts       # TTL cache com promise deduplication
    │   │   ├── defaults.ts    # Configs default por nicho
    │   │   └── schema.ts      # Zod schema de ScoreWeightsConfig
    │   └── types.ts           # ScoreInput, ScoreResult, ScoreWeightsConfig
    └── __tests__/
        ├── engine.test.ts
        ├── cache.test.ts
        └── signals/
```

### 4.2 Tipo ScoreInput

```typescript
interface ScoreInput {
  lead_id: string;
  client_id: string;
  source: string;                        // Campo: lead.source
  fields_filled: string[];               // Campos preenchidos no lead
  required_fields: string[];             // Campos obrigatórios do nicho
  campaign_quality_score: number | null; // 0.0–1.0, null se sem campanha
  first_message: string | null;          // Texto do primeiro contacto
  created_at: string;                    // ISO 8601
  first_interaction_at: string | null;   // ISO 8601 — lead_interactions.created_at
                                         // WHERE type IN ('call', 'whatsapp')
                                         // ORDER BY created_at ASC LIMIT 1
  now: Date;                             // Injectado pelo caller — nunca Date.now() interno
}
```

### 4.3 API Pública

```typescript
// Função principal — síncrona, pura, sem efeitos laterais
function scoreLead(input: ScoreInput, config: ScoreWeightsConfig): ScoreResult

// Invalidação explícita do cache de config
function invalidateConfig(clientId: string): void
```

O pacote expõe apenas estas duas funções e os tipos `ScoreInput`, `ScoreResult`, `ScoreWeightsConfig`.

### 4.4 Cache de Configuração

O cache de config é gerido internamente pelo módulo `config/cache.ts`. O caller não interage directamente com o cache — chama `getConfig(clientId)` que resolve internamente.

**Comportamento:**

| Situação | Comportamento |
|---|---|
| Config não em cache | Fetch ao Supabase, armazena resultado + timestamp |
| Config em cache (TTL válido) | Retorna imediatamente sem I/O |
| Config em cache (TTL expirado) | Fetch ao Supabase, substitui entrada |
| Dois requests simultâneos (cache miss) | Promise deduplication — apenas um fetch ocorre; ambos aguardam o mesmo promise |
| `invalidateConfig(clientId)` chamado | Remove entrada do cache imediatamente |

**TTL:** 60 segundos  
**Deduplication:** O cache armazena o `Promise<ScoreWeightsConfig>` durante o fetch em curso, não apenas o resultado resolvido. Requests concorrentes recebem o mesmo promise em vez de disparar múltiplos fetches.

### 4.5 Integração pelos Callers

| Caller | Trigger | Dados injectados | Nota |
|---|---|---|---|
| Modal de lead (Client Component) | Com debounce de 300ms após última alteração de campo | `ScoreInput` construído a partir do estado do formulário | Chama Server Action que invoca `scoreLead()` |
| Lista de leads (Server Component) | No render da página | `ScoreInput` de cada lead na página corrente | Score calculado server-side, enviado como prop serializada |
| Automation Builder | Avaliação de condição de trigger | `ScoreInput` do lead que activou o trigger | Acesso apenas ao `tier`, não ao breakdown completo |
| Script de backfill | Manual / agendado | `ScoreInput` construído a partir de query batch | Processa leads em chunks de 100 |

---

## 5. Plano de Testes

### 5.1 Testes Unitários do Engine (14 obrigatórios)

**Grupo 1 — Invariante score/breakdown (2 testes)**

| ID | Descrição |
|---|---|
| U-01 | Score inteiro é igual a `Math.round(sum(contribution))` para input máximo |
| U-02 | Score inteiro é igual a `Math.round(sum(contribution))` para input mínimo |

**Grupo 2 — Tiers (3 testes)**

| ID | Descrição |
|---|---|
| U-03 | Score 0 → tier `cold` |
| U-04 | Score 69 → tier `warm`; score 70 → tier `hot` |
| U-05 | Score 100 → tier `hot` |

**Grupo 3 — Sinais individuais (6 testes, um por sinal)**

| ID | Sinal | Cenário |
|---|---|---|
| U-06 | `platform` | Source "whatsapp" produz valor normalizado máximo para config que privilegia WhatsApp |
| U-07 | `completeness` | 3 de 5 campos preenchidos → raw_value 0.6 |
| U-08 | `campaign_quality` | `campaign_quality_score: null` → contribuição 0 |
| U-09 | `message_intent` | `first_message` com keyword de alta intenção → raw_value 1.0 |
| U-10 | `recency` | Lead criado há `recency_decay_hours + 1h` → raw_value 0.0 |
| U-11 | `response_speed` | `first_interaction_at: null` → contribuição 0 |

**Grupo 4 — Determinismo (2 testes)**

| ID | Descrição |
|---|---|
| U-12 | Mesmo `(input, config)` chamado 100× produz sempre o mesmo `ScoreResult` |
| U-13 | Breakdown array tem sempre a mesma ordem (CRITERION_ORDER) independente dos valores |

**Grupo 5 — weights_version (1 teste)**

| ID | Descrição |
|---|---|
| U-14 | `weights_version` é SHA-256 do JSON canónico do config truncado a 8 chars; configs diferentes produzem versões diferentes |

### 5.2 Testes de Cache (5 obrigatórios)

| ID | Descrição |
|---|---|
| C-01 | Cache miss dispara exactamente 1 fetch ao Supabase |
| C-02 | Cache hit (TTL válido) não dispara nenhum fetch |
| C-03 | Cache expirado (TTL + 1ms) dispara novo fetch |
| C-04 | Dois requests simultâneos em cache miss disparam exactamente 1 fetch (promise deduplication) |
| C-05 | `invalidateConfig(clientId)` remove a entrada; próximo request dispara fetch |

### 5.3 Teste de Isolamento Multi-Tenant (1 obrigatório)

| ID | Descrição |
|---|---|
| I-01 | Config do `client_id: "A"` não é retornado ao chamar `getConfig("B")` — chaves de cache são sempre prefixadas por `client_id` |

### 5.4 Benchmark de Performance (1 obrigatório)

| ID | Descrição | Threshold |
|---|---|---|
| P-01 | `scoreLead()` chamado 1000× em sequência; p95 de duração medido com `performance.now()` | p95 < 5ms |

---

## 6. Observabilidade e Critérios de Aceite

### 6.1 Formato de Log

Todos os logs do engine são emitidos em JSON estruturado via Pino. Campos obrigatórios em todos os eventos:

```json
{
  "timestamp": "ISO 8601",
  "level": "info | warn | error",
  "service": "lead-qualification-engine",
  "lead_id": "uuid",
  "client_id": "uuid",
  "event": "string",
  "duration_ms": "number"
}
```

**Campos proibidos (PII):** `first_message`, `email`, `phone`, `name`. Estes campos nunca aparecem em logs, independente do nível.

### 6.2 Eventos de Log

| Evento | Nível | Campos adicionais | Sampling |
|---|---|---|---|
| `score_calculated` | `info` | `score`, `tier`, `weights_version` | 10% em produção |
| `config_cache_hit` | `info` | `client_id`, `ttl_remaining_ms` | 1% em produção |
| `config_cache_miss` | `info` | `client_id` | 100% |
| `score_slow` | `warn` | `duration_ms`, `threshold_ms: 150` | 100% |

O evento `score_calculated` é amostrado a 10% em produção para evitar volume excessivo de logs em agências com alto throughput. Em ambiente de desenvolvimento e staging, sampling é 100%.

### 6.3 Métrica de Performance

**Métrica:** `score_engine_duration_ms`  
**Tipo:** Histogram  
**Labels:** `client_id`, `tier`, `cache_hit: boolean`  
**Alerta:** p95 > 150ms durante 5 minutos consecutivos → alerta `score_engine_slow`

O threshold de alerta é 150ms (não 5ms) porque inclui o tempo de fetch de config ao Supabase em cache miss. O budget de 5ms é para a função pura isolada.

### 6.4 Critérios de Aceite

**Categoria 1 — Correcção do Score**

- AC-1.1: Dado um lead com todos os campos preenchidos, source WhatsApp, mensagem com keyword de alta intenção e criado há menos de 1 hora, o score é ≥ 70 com qualquer config que some 1.0
- AC-1.2: A invariante `score === Math.round(sum(breakdown[i].contribution))` é verdadeira para todos os leads processados em produção durante os primeiros 7 dias (verificado via log sampling)
- AC-1.3: Dois calls a `scoreLead()` com o mesmo `input` e `config` e o mesmo `now` produzem o mesmo `ScoreResult` — verificado pelo teste U-12

**Categoria 2 — Performance**

- AC-2.1: p95 de `score_engine_duration_ms` < 150ms em produção nos primeiros 7 dias de activação
- AC-2.2: Benchmark P-01 passa em CI em cada Pull Request

**Categoria 3 — Activação com Shadow Mode**

- AC-3.1: A feature flag `agency.settings.score_ordering_enabled` existe e é lida pelo componente de lista de leads antes de ordenar por score
- AC-3.2: Com `score_ordering_enabled: false`, a lista de leads é renderizada na ordem original (por `created_at DESC`); o score é calculado e logado mas não afecta a ordenação — shadow mode activo
- AC-3.3: O rollout para cada agência segue um período mínimo de **5 dias úteis** de shadow mode com `score_ordering_enabled: false` antes de activar a ordenação real; qualquer anomalia detectada nos logs durante este período bloqueia a activação

---

## 7. Exclusões e Scope v0.1

Esta secção define explicitamente o que está **fora do scope** da versão 0.1 do Lead Qualification Engine. Funcionalidades não listadas no FDD acima não estão implementadas e não devem ser assumidas como disponíveis.

### 7.1 Regras Condicionais entre Sinais

**Excluído:** Lógica do tipo "SE `platform = whatsapp` E `message_intent > 0.8` ENTÃO aplicar multiplicador de 1.5× ao score total".

O v0.1 implementa apenas uma soma ponderada linear: `score = sum(signal_value * weight) * 100`. Não há interacções condicionais entre sinais, multiplicadores, thresholds por sinal, ou lógica de boosting.

**Motivação:** A soma linear é auditável, explicável ao operador e suficiente para diferenciar leads. Regras condicionais aumentam a complexidade de debugging sem evidência de ganho de qualidade no contexto actual.

### 7.2 Scoring por Machine Learning ou Modelos Preditivos

**Excluído:** Modelos estatísticos, regressão logística, gradient boosting, redes neuronais, embeddings de texto para `first_message`, ou qualquer forma de aprendizagem a partir de dados históricos de conversão.

O v0.1 usa pesos configurados manualmente pelo admin. ML requer dados históricos de conversão por nicho que ainda não existem no HypeFlow OS.

### 7.3 Enriquecimento de Dados

**Excluído:** Chamadas a APIs externas para enriquecer o lead antes do scoring — validação de número de telefone (ex: Twilio Lookup), detecção de email corporativo vs pessoal, enriquecimento de perfil LinkedIn, ou geolocalização por IP.

O engine recebe apenas os dados já presentes na base de dados do HypeFlow OS. Integrações de enriquecimento são candidatas para v0.2+.

### 7.4 Deduplicação Cross-Client

**Excluído:** Detectar que o mesmo lead (por telefone ou email) existe em múltiplos `client_id` e aplicar um score de "lead já qualificado por outra agência". O engine trata cada `(lead_id, client_id)` como entidade independente.

### 7.5 Interface de Replay e Backtesting

**Excluído:** UI ou CLI para recalcular scores históricos com uma nova configuração de pesos e comparar com os scores originais. O backfill (§4.5) existe mas é executado via script manual sem interface de comparação.

**Excluído também:** Visualização de "como o score teria sido se os pesos fossem X" (what-if analysis).

### 7.6 Exportação de Scores

**Excluído:** Exportação de scores para CSV, Excel, ou integração com ferramentas de BI externas (Google Sheets, Looker, Metabase). Os scores são visíveis apenas na interface do HypeFlow OS.

### 7.7 Lógica de Automação no Engine

**Excluído:** O engine não dispara acções — não envia notificações, não altera status do lead, não cria tarefas. O `tier` resultante pode ser usado pelo Automation Builder como condição de trigger, mas o engine em si é passivo.

A decisão de "o que fazer com um lead `hot`" é sempre do Automation Builder ou do operador — nunca do engine.

### 7.8 Histórico de Scores e Audit Trail

**Excluído:** Persistência de scores anteriores para comparação temporal ("este lead subiu de `cold` para `warm` nos últimos 3 dias"). O `breakdown` no `ScoreResult` documenta a composição do score no momento do cálculo, mas scores anteriores não são armazenados em base de dados em v0.1.

**Excluído também:** Logging de cada recalculo de score com diff face ao score anterior.

### 7.9 Configuração de Pesos via API Programática

**Excluído:** Endpoint REST ou tRPC para criar/actualizar configs de pesos programaticamente. Em v0.1, a configuração é feita exclusivamente via UI de settings da agência.

---

## Referências

| Documento | Localização |
|---|---|
| PRD HypeFlow OS | `docs/prd/hypeflow-os-prd.md` |
| Arquitectura HypeFlow OS | `docs/architecture/hypeflow-os-architecture.md` |
| FDD Lead Ingestion Hub | `docs/fdd/lead-ingestion-hub-fdd.md` |
| ADR-0019 Next.js Best Practices Skill | `docs/adrs/0019-nextjs-best-practices-skill.md` |
| TypeScript Development Guidelines | `docs/guidelines/typescript-development-guidelines.md` |
| Next.js Best Practices Guidelines | `docs/guidelines/nextjs-best-practices-guidelines.md` |
