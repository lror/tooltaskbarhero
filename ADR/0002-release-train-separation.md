# ADR 0002: Separação de Trens de Release (v1.0.0 vs v1.1.0)

- **Status:** Aceito
- **Data:** 2026-10-12
- **Decisores:** Antigravity (Auditor & Engenheiro Chefe)
- **Contexto:** Baseline técnica pós-auditoria de código do ToolTaskBarHero (TTBH).

---

## 1. Contexto do Problema

A auditoria técnica (Fase 0 a 0.5 consolidada em `AUDITORIA/`) identificou uma base funcional rica (v1.0.0-rc.1), porém com dívidas técnicas e vulnerabilidades que exigem estabilização imediata:
- Bugs críticos como `cryptoEngine.decryptES3` na timeline (`RSK-ARCH-003`) e chamada incorreta `renderStorage` (`RSK-ARCH-004`).
- Riscos de segurança como XSS via 55 pontos de `innerHTML` (`RSK-SEC-001`), ausência de CSP (`RSK-SEC-002`) e vazamento de PII em exportações (`RSK-SEC-004`).

Simultaneamente, o usuário expressou demandas de novas capacidades avançadas (upload simultâneo de múltiplos arquivos, parser para `backend.dat`, banco de dados local histórico em IndexedDB, gráficos de progressão temporal e expansão do exportador IA).

Tentar implementar novas funcionalidades simultaneamente à correção de vulnerabilidades estruturais introduz alto risco de quebra de regressão e contaminação de escopo.

---

## 2. Decisão Arquitetural

Decidimos segregar estritamente o ciclo de vida do software em dois trens de lançamento distintos e sequenciais:

### Trem de Release v1.0.0 — Hardening, Correções e Estabilidade
- **Foco:** Correção cirúrgica de defeitos, segurança, conformidade e garantia de testes da base existente.
- **Entregas:**
  1. Correção dos bugs arquiteturais imediatos (`RSK-ARCH-003`, `RSK-ARCH-004`).
  2. Implementação de defesas de segurança (`CSP`, mitigação de DOM XSS, anonimização de PII no exportador).
  3. Cobertura e automação completa dos testes de regressão existentes sem criar novas dependências de runtime.
- **Restrição estrita:** Proibida a introdução de novas features de negócio na v1.0.0.

### Trem de Release v1.1.0 — Expansão Funcional e Módulos Avançados
- **Foco:** Inovação funcional e suporte a novos arquivos e persistência de séries temporais.
- **Entregas:**
  1. `FEAT-1101`: Módulo de descriptografia dedicado e upload simultâneo de múltiplos arquivos (logs, backups e saves).
  2. `FEAT-1102`: Banco de dados local histórico via IndexedDB com gráficos de progressão e métricas de itens Tier 7+.
  3. `FEAT-1103`: Parser de engenharia reversa para `backend.dat`.
  4. `FEAT-1104`: Aprimoramento do exportador IA com telemetria longitudinal.

---

## 3. Consequências

- **Positivas:**
  - Estabilidade garantida para a baseline v1.0.0 antes de qualquer expansão arquitetural.
  - Zero risco de introduzir vulnerabilidades de concorrência ou exaustão de memória na main thread na versão auditada.
  - Rastreabilidade limpa entre os achados da auditoria e os commits de correção.
- **Negativas / Trade-offs:**
  - As novas features do usuário (gráficos históricos, suporte a múltiplos uploads) são postergadas até a finalização do ciclo de hardening da v1.0.0.
