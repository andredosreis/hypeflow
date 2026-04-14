# HYPE Flow OS — Epics Overview

**Date:** 2026-04-06  
**PO:** Pax (@po) via Orion (aios-master)  
**Status:** Backlog — Aguarda priorização final

---

## Mapa de Epics

```
HYPE Flow OS
│
├── FASE 1 — MVP (Priority P1)
│   ├── EPIC-01: Autenticação & Multi-tenant Setup
│   ├── EPIC-02: Dashboard Master (Agência)
│   ├── EPIC-03: CRM & Gestão de Leads
│   ├── EPIC-04: Pipeline & Kanban
│   ├── EPIC-05: Tracking de Tráfego (Meta + Google)
│   ├── EPIC-06: Calls & Google Meet
│   ├── EPIC-07: Gestão de Clientes
│   ├── EPIC-09: Portal do Cliente — Dashboard
│   ├── EPIC-10: Portal do Cliente — Pipeline View
│   └── EPIC-13: Integrações Core (Meta, Google Ads, Meet)
│
│   └── EPIC-07: Motor de Automações Nativo + N8N + Make + ManyChat
│
└── FASE 2 — Expansão (Priority P2/P3)
    ├── EPIC-08: Relatórios & Analytics Avançados
    ├── EPIC-11: Portal do Cliente — ROI Detalhado
    ├── EPIC-12: Comunicação & Suporte
    ├── EPIC-14: Configurações & Permissões Avançadas
    └── EPIC-15: Notificações Avançadas
```

---

## EPIC-01: Autenticação & Multi-tenant Setup

**Objectivo:** Sistema de autenticação robusto com isolamento total de dados entre agências e clientes.

**User Stories:**
- [ ] 1.1 Como admin da agência, quero criar a minha conta e configurar o espaço de trabalho
- [ ] 1.2 Como admin, quero convidar membros da equipa com diferentes roles
- [ ] 1.3 Como admin, quero criar contas de acesso para clientes (portal)
- [ ] 1.4 Como utilizador, quero fazer login com email + password com MFA opcional
- [ ] 1.5 Como utilizador, quero recuperar a minha password por email
- [ ] 1.6 Como sistema, os dados de cada cliente devem ser isolados via RLS

**Acceptance Criteria gerais:**
- Roles: agency_admin, agency_manager, agency_viewer, client_admin, client_viewer
- JWT com claims: user_id, role, agency_id, client_id
- RLS policies em todas as tabelas sensitivas
- Onboarding wizard após primeiro login

---

## EPIC-02: Dashboard Master (Agência)

**Objectivo:** Centro de comando executivo da agência com todas as métricas chave em tempo real.

**User Stories:**
- [ ] 2.1 Como admin, quero ver o total de leads activas por todos os clientes
- [ ] 2.2 Como admin, quero ver o MRR total e por cliente
- [ ] 2.3 Como gestor, quero ver o pipeline de todas as leads com filtros por cliente/agente
- [ ] 2.4 Como gestor, quero receber alertas de leads sem seguimento há mais de 48h
- [ ] 2.5 Como admin, quero ver um gráfico de funil de conversão global
- [ ] 2.6 Como admin, quero filtrar o dashboard por período (semana/mês/trimestre)
- [ ] 2.7 Como gestor, quero ver o feed de actividade recente da equipa

**KPIs do dashboard:**
- Total leads activas
- Leads sem seguimento (alerta)
- Taxa de conversão (lead → fecho)
- Calls agendadas esta semana
- MRR total dos clientes
- ROI médio gerado para clientes

---

## EPIC-03: CRM & Gestão de Leads

**Objectivo:** Sistema CRM completo para gestão de todas as leads de todos os clientes.

**User Stories:**
- [ ] 3.1 Como gestor, quero ver todas as leads numa tabela com filtros avançados
- [ ] 3.2 Como gestor, quero abrir o perfil de uma lead com toda a sua timeline
- [ ] 3.3 Como gestor, quero atribuir leads a agentes da equipa
- [ ] 3.4 Como gestor, quero adicionar notas e interacções a uma lead
- [ ] 3.5 Como gestor, quero classificar leads por temperatura (Frio/Morno/Quente)
- [ ] 3.6 Como sistema, leads recebidas de Meta/Google devem entrar automaticamente
- [ ] 3.7 Como gestor, quero fazer acções em massa (reatribuir, mudar status, exportar)
- [ ] 3.8 Como gestor, quero ver o score de qualificação de cada lead
- [ ] 3.9 Como gestor, quero registar manualmente uma nova lead

**Campos da Lead:**
```
- id, agency_id, client_id
- nome, email, telefone
- source (canal de origem)
- campaign_id (campanha de origem)
- status (nova, qualificada, contactada, agendada, proposta, fechada, perdida)
- score (0-100)
- temperature (cold, warm, hot)
- agent_id (responsável)
- tags []
- created_at, updated_at, last_contact_at
```

---

## EPIC-04: Pipeline & Kanban

**Objectivo:** Visualização e gestão do funil comercial com Kanban interactivo.

**User Stories:**
- [ ] 4.1 Como gestor, quero ver todas as leads organizadas por fases num Kanban
- [ ] 4.2 Como gestor, quero arrastar leads entre fases (drag & drop)
- [ ] 4.3 Como gestor, quero ver o card de cada lead com info resumida
- [ ] 4.4 Como gestor, quero filtrar o Kanban por cliente, agente, fonte, período
- [ ] 4.5 Como gestor, quero ver um indicador visual quando uma lead passa o SLA da fase
- [ ] 4.6 Como admin, quero personalizar as fases do pipeline por cliente
- [ ] 4.7 Como gestor, quero mudar de Kanban para lista e vice-versa
- [ ] 4.8 Como gestor, quero ver o valor total em pipeline por fase (forecast)
- [ ] 4.9 Como gestor, quero aceder a quick-actions no card (ligar, agendar, WhatsApp)

---

## EPIC-05: Tracking de Fontes de Tráfego

**Objectivo:** Centro de comando unificado de todas as fontes de tráfego (pago + orgânico).

**User Stories:**
- [ ] 5.1 Como gestor de tráfego, quero ver métricas de Facebook Ads (impressões, CPL, ROAS)
- [ ] 5.2 Como gestor de tráfego, quero ver métricas de Google Ads (CPC, CPL, keywords top)
- [ ] 5.3 Como gestor de tráfego, quero comparar o custo por lead por canal num só ecrã
- [ ] 5.4 Como gestor de tráfego, quero ver um heatmap de performance por dia/hora
- [ ] 5.5 Como gestor de tráfego, quero configurar alertas quando CPL ultrapassa a meta
- [ ] 5.6 Como admin, quero conectar as contas de Meta Ads e Google Ads por cliente
- [ ] 5.7 Como gestor de tráfego, quero ver atribuição multi-touch por lead
- [ ] 5.8 Como gestor de tráfego, quero comparar período actual vs anterior

**Fontes Fase 1:**
- Facebook Ads (Meta API)
- Instagram Ads (Meta API)
- Google Ads (Google Ads API)

**Fontes Fase 2:**
- LinkedIn Ads
- Google Orgânico (Search Console)
- GA4 (tráfego web)
- WhatsApp (mensagens)

---

## EPIC-06: Calls & Google Meet

**Objectivo:** Gestão completa do ciclo de vida das calls de vendas com integração Meet.

**User Stories:**
- [ ] 6.1 Como gestor, quero agendar uma call com uma lead e gerar o link Meet automático
- [ ] 6.2 Como gestor, quero ver o meu calendário de calls desta semana
- [ ] 6.3 Como gestor, quero receber lembretes 15min antes de cada call
- [ ] 6.4 Como gestor, quero registar o resultado de uma call (avançou/perdeu/follow-up)
- [ ] 6.5 Como gestor, quero ver o histórico de todas as calls de uma lead
- [ ] 6.6 Como admin, quero ver métricas de calls por agente (show-up, conversão, duração)
- [ ] 6.7 Como sistema, calls no Google Calendar devem sincronizar com a plataforma
- [ ] 6.8 Como gestor, quero adicionar notas durante/após a call
- [ ] 6.9 Como gestor, quero ver o briefing automático da lead antes da call

**Métricas de calls:**
- Show-up rate (agendadas vs realizadas)
- Conversão pós-call por agente
- Duração média por fase do funil
- Calls por semana/mês

---

## EPIC-07: Gestão de Clientes (Agência)

**Objectivo:** Módulo de gestão de todos os clientes activos da agência.

**User Stories:**
- [ ] 7.1 Como admin, quero ver todos os clientes com o seu status e métricas resumidas
- [ ] 7.2 Como account manager, quero abrir a ficha completa de um cliente
- [ ] 7.3 Como admin, quero criar um novo cliente com onboarding checklist
- [ ] 7.4 Como account manager, quero ver o health score do cliente (verde/amarelo/vermelho)
- [ ] 7.5 Como admin, quero atribuir um account manager a cada cliente
- [ ] 7.6 Como account manager, quero registar notas e reuniões com o cliente
- [ ] 7.7 Como admin, quero ver o MRR por cliente e data de renovação de contrato
- [ ] 7.8 Como account manager, quero ver todos os leads activos do cliente num clique

---

## EPIC-09: Portal do Cliente — Dashboard

**Objectivo:** Dashboard de transparência para o cliente ver o ROI e performance da agência.

**User Stories:**
- [ ] 9.1 Como cliente, quero fazer login no meu portal dedicado
- [ ] 9.2 Como cliente, quero ver quantas leads recebi este mês vs meta
- [ ] 9.3 Como cliente, quero ver a taxa de qualificação das minhas leads
- [ ] 9.4 Como cliente, quero ver o número de agendamentos realizados
- [ ] 9.5 Como cliente, quero ver um gráfico de leads ao longo do tempo
- [ ] 9.6 Como cliente, quero ver o investimento vs retorno estimado
- [ ] 9.7 Como cliente, só posso ver os meus próprios dados (zero acesso a outros clientes)

---

## EPIC-10: Portal do Cliente — Pipeline View

**Objectivo:** Visibilidade read-only do estado das leads do cliente.

**User Stories:**
- [ ] 10.1 Como cliente, quero ver as minhas leads organizadas por fase (Kanban read-only)
- [ ] 10.2 Como cliente, quero filtrar leads por data e por estado
- [ ] 10.3 Como cliente, quero ver o detalhe de cada lead (origem, estado, próximo passo)
- [ ] 10.4 Como cliente, quero ver quantas leads estão em cada fase

---

## EPIC-13: Integrações Core

**Objectivo:** Conectar as APIs externas fundamentais para operação do MVP.

**User Stories:**
- [ ] 13.1 Como admin, quero conectar a conta Meta Business de um cliente (OAuth)
- [ ] 13.2 Como admin, quero conectar a conta Google Ads de um cliente (OAuth)
- [ ] 13.3 Como admin, quero conectar a conta Google (Meet + Calendar) da equipa
- [ ] 13.4 Como sistema, os dados de Meta e Google Ads devem sincronizar a cada 6h
- [ ] 13.5 Como admin, quero ver o status de cada integração (activa/erro/expirada)
- [ ] 13.6 Como sistema, quando uma integração falha devo receber alerta

---

## Dependências entre Epics

```
EPIC-01 (Auth) ──→ TODOS os outros epics dependem deste

EPIC-13 (Integrações) ──→ EPIC-05 (Tráfego) depende deste
EPIC-13 (Integrações) ──→ EPIC-06 (Calls/Meet) depende deste
EPIC-03 (CRM) ──→ EPIC-04 (Kanban) usa dados do CRM
EPIC-03 (CRM) ──→ EPIC-06 (Calls) usa dados do CRM
EPIC-07 (Clientes) ──→ EPIC-09, 10 (Portal) usa dados de clientes
```

---

## Estimativa de Esforço (Story Points — referência)

| Epic | Stories | SP Est. | Sprint |
|------|---------|---------|--------|
| EPIC-01 | 6 | 21 | Sprint 1 |
| EPIC-13 | 6 | 34 | Sprint 1-2 |
| EPIC-03 | 9 | 34 | Sprint 2-3 |
| EPIC-04 | 9 | 34 | Sprint 3-4 |
| EPIC-02 | 7 | 21 | Sprint 3-4 |
| EPIC-06 | 9 | 34 | Sprint 4-5 |
| EPIC-05 | 8 | 34 | Sprint 4-5 |
| EPIC-07 | 8 | 21 | Sprint 5 |
| EPIC-09 | 7 | 21 | Sprint 5-6 |
| EPIC-10 | 4 | 13 | Sprint 6 |

**Total MVP:** ~267 story points ≈ 10-12 sprints (2 semanas cada)  
**Timeline estimada:** 5-6 meses para MVP completo

---

*Epics criados por: Pax (@po) via Orion (aios-master)*
