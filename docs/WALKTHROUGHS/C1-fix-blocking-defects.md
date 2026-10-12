# Walkthrough: Correção de Defeitos Bloqueadores (FASE C1)

## Metadados
- **Fase:** C1 — Correção de Defeitos Bloqueadores (P0/P1)
- **Data:** 2026-10-13
- **Commit:** 050e43c
- **IDs:** RSK-ARCH-003, RSK-ARCH-004

## Problema 1: RSK-ARCH-003
- **Sintoma:** TypeError ao carregar saves na Timeline de Backups
- **Causa:** Chamada a método inexistente `cryptoEngine.decryptES3(ab)`
- **Localização:** `assets/js/app.js` ~L1686, função `handleTimelineFiles()`
- **Correção:** Substituir por `cryptoEngine.decryptBuffer(ab)`
- **Justificativa:** O módulo `crypto.js` expõe `decryptBuffer(buffer)` na L44 como método público de descriptografia. O nome `decryptES3` nunca existiu na API.

## Problema 2: RSK-ARCH-004
- **Sintoma:** ReferenceError ao importar preços de mercado
- **Causa:** Chamada a função inexistente `renderStorage(data)`
- **Localização:** `assets/js/app.js` ~L1983, callback `btnDoImportPrices`
- **Correção:** Substituir por `filterAndRenderStorage()`
- **Justificativa:** A função `filterAndRenderStorage()` (L1047) não recebe parâmetros. Ela lê `window.__lastParsedSaveData` internamente. A chamada antiga passava argumento desnecessário para uma função que não existia com essa assinatura.

## Validação
- Suíte `tests/e2e_smoke.js`: 13/13 PASSED
- Suíte `tests/log_parser.test.js`: 15/15 asserts passed (exit 0)
- Regressão: Nenhuma suite existente quebrou

## Lições Aprendidas
- Ambas as falhas eram "dead code paths" — só ativadas em fluxos específicos
  (timeline multi-save e importação de preços), o que permitiu que passassem
  despercebidas até a auditoria.
