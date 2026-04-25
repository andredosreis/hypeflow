---
status: Proposed
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [integration, whatsapp, cost]
supersedes: null
amends: null
---

# ADR-0002: WhatsApp provider (Evolution API primário, fallback por feature flag)

## Context and Problem Statement

Estado anterior (Idle): WhatsApp outbound feito via ManyChat (custo por subscriber e por flow). Evento de mudança: o cliente já opera um VPS próprio para outras ferramentas e quer reduzir custo de WhatsApp outbound para o volume esperado (dezenas de milhares de mensagens/mês no agregado da agência).

Providers disponíveis:

- **WhatsApp Business Cloud API oficial (Meta):** preço por conversa iniciada, oficial, resiliente, mas 2 a 5 vezes mais caro que alternativas self-hosted.
- **ManyChat:** oferece fluxos conversacionais complexos out-of-the-box; preço escala com subscribers activos; caro em volume.
- **Evolution API self-hosted (comunitário):** custo marginal próximo de zero (apenas VPS, já pago); não oficial; risco de banimento da conta WhatsApp se Meta endurecer políticas.

## Decision Drivers

- Custo mensal total para volume previsto.
- Risco operacional (ban, mudanças de contrato).
- Disponibilidade de fluxos conversacionais avançados (ManyChat forte aqui).
- Integração com o Automation Builder do OS.
- Flexibilidade de fallback sem reescrever código.

## Considered Options

1. **ManyChat como primário único** (rejected): custo escala mal; paga-se por subscribers mesmo inactivos. Vantagem de fluxos conversacionais não compensa em volume típico.
2. **WhatsApp Business Cloud API oficial como primário** (rejected agora): preço previsível mas 2 a 5 vezes mais caro que Evolution. Justifica-se para clientes enterprise; fica como opção de fallback/upgrade.
3. **Evolution API como primário com fallback para ManyChat ou Cloud API via feature flag por agência** (chosen).

## Decision Outcome

Adoptar **Evolution API como provider primário** para WhatsApp outbound, corrido no VPS do cliente.

Manter ManyChat e WhatsApp Business Cloud API como providers alternativos, seleccionáveis por agência através de feature flag em `agencies.settings.whatsapp_provider`. O Automation Builder introduz uma abstracção `WhatsAppProvider` (adapter pattern) para que a acção `send_whatsapp` invoque o provider configurado sem que o código de negócio saiba qual.

Activação inicial: Evolution para todas as agências. Mudança requer apenas actualização de config, não deploy.

## Consequences

### Positive

- Custo marginal próximo de zero; só custo de VPS (já pago).
- Controlo total sobre envio (retry, queue, templates).
- Dados não passam por terceiros adicionais além do próprio Meta/WhatsApp.
- Fallback por flag permite migração a quente se Evolution cair ou for banido.

### Negative

- Risco de banimento da conta WhatsApp (políticas do Meta contra ferramentas não oficiais são ambíguas e podem endurecer).
- Responsabilidade operacional de manter o VPS com Evolution up (cai com o VPS).
- Sem fluxos conversacionais complexos embutidos (ManyChat continua melhor aí; cobrir com fluxos externos se necessário).
- Manter 3 providers implementados aumenta superfície de testes e número de adapters a manter.
- Fica de fora de certificação oficial Meta se a agência quiser isso no futuro.

## Links

- **relatesTo:** [ADR-0009](0009-rate-limiter-whatsapp.md)
