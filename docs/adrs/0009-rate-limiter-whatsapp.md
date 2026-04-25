---
status: Proposed
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [security, integration, whatsapp]
supersedes: null
amends: null
---

# ADR-0009: Rate limiter WhatsApp por agência

## Context and Problem Statement

Estado: Evolution API é o provider WhatsApp primário (ver [ADR-0002](0002-whatsapp-provider.md)). WhatsApp enforcements (mesmo para Business Cloud API oficial, e mais para Evolution não oficial) têm limites não oficiais de envio. Envios acima de um threshold (alguns multi-dígitos por minuto para contas novas) podem resultar em banimento da conta. Evento que força decisão: o Automation Builder permite acção `send_whatsapp`, e uma regra mal configurada pode disparar centenas de mensagens em segundos se, por exemplo, fizer match em muitas leads de uma vez.

## Decision Drivers

- Protecção contra banimento da conta WhatsApp (incidente com custo elevado de recuperação).
- Protecção contra bugs ou má configuração de automações.
- Configurabilidade por agência (diferentes contas têm diferentes limites implícitos, dependendo da idade e "saúde" da conta).
- Observabilidade: alertar antes de atingir o limite.
- Minimizar latência em envios normais (não impactar operação regular).

## Considered Options

1. **Sem rate limiter, confiar em Evolution ou no provider** (rejected): Evolution não implementa rate limit por default; risco de banimento alto.
2. **Rate limiter global do OS** (rejected): diferentes agências têm diferentes limites razoáveis; limite global forçaria o limite da agência mais restritiva a todas.
3. **Rate limiter por agência, configurável, aplicado no Automation Builder antes de invocar o provider** (chosen).

## Decision Outcome

Implementar rate limiter no Automation Builder antes da invocação do `WhatsAppProvider`:

- **Configurável por agência** via `agencies.settings.whatsapp_rate_limit` (default: 30 mensagens/minuto).
- **Algoritmo token bucket** clássico. Implementação inicial em Postgres (row lock + contador por janela temporal de 60s) para cumprir [ADR-0010](0010-sem-cache-distribuido-fase-1.md).
- Quando limite atingido: acção entra em fila de delay de 60s e tenta de novo. Payload marca `rate_limited_retries` para observabilidade.
- **Alerta** quando a agência passa 80% do limite em qualquer janela de 1 min.
- **Refuse hard** se exceder 5x o limite configurado (sintoma de bug, não de operação normal).

## Consequences

### Positive

- Protege contas WhatsApp de banimentos acidentais.
- Configurável para crescer conforme a conta ganha reputação.
- Alertas dão visibilidade a gestores antes de problema.
- Hard refuse previne amplificação por bugs de automação.

### Negative

- Adiciona latência: mensagens podem esperar até 60s em período de pico rate limited.
- Implementação requer estado partilhado entre Edge Functions. Solução inicial usa Postgres row lock (não ideal, mas simples e respeita [ADR-0010](0010-sem-cache-distribuido-fase-1.md)). Se passar a ser gargalo, reavaliar Redis com ADR superseding.
- Configuração errada (limite muito baixo) pode gerar fila grande; mitigação é alerta sobre queue depth.
- Testes requerem simulação de bursts para validar comportamento.

## Links

- **relatesTo:** [ADR-0002](0002-whatsapp-provider.md)
