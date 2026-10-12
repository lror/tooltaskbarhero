# STATUS TTBH — 2026-10-10 (v1.0.0-rc.1)

## CONFIRMADO (com testes automatizados)
- **Árvore Canônica de Runas:** 248 runas catalogadas com traduções pt-BR/en-US e `runeLevels` expandido para 248 entradas (zero nós órfãos de custo).
- **Rune Planner:** 248 nós com visualização SVG interativa, mapeamento de pré-requisitos (`prevReq`), cálculo de custos até o nível máximo e recomendação dos próximos 5 passos.
- **BiS Finder + Drop Source:** Mapeamento dos 10 slots para todos os 6 heróis, scoring ponderado e cruzamento automático com as tabelas de drop de baús.
- **Simulador de Síntese com Guardrails:** Cálculo de EXP de Cubo oficial por grade, evolução interpolada e flag `economicViability` alertando perdas financeiras.
- **Log Parser:** 15/15 asserts validados em fixture com 78 linhas cobrindo todos os 23 patterns de expressão regular (`Player.log`).
- **Linha do Tempo de Backups:** Ingestão de múltiplos snapshots `.es3`, cálculo de deltas de ouro/cubo/estágio/itens, aviso de contagem mínima (≥2 saves) e exportação em JSON.
- **Farming Calculator:** Cálculo de EXP/h e Gold/h com densidade EXP/HP real D4, ranking de stages, level gap penalties (⚠ PENALTY / ⚠ OVERLEVELED) e sugestão de rotas.
- **Chest Simulator & Optimizer:** Aberturas simuladas com PRNG Mulberry32 determinístico ponderado (D6), EV e Monte Carlo (100 aberturas).
- **Market Price API (Fase 10 RC):** Cache local via `localStorage` com TTL de 7 dias, importação CSV/JSON, fallback estático e toast de cotações stale.
- **Telemetria de Atividade Acumulada:** Enum canônico TBH de 17 tipos com top-3 sub-keys em abates e estágios.
- **Teste E2E de Fumaça:** 12/12 módulos testados e validados com 100% de sucesso (`tests/e2e_smoke.js`).
- **Teste de Paridade Competitiva:** 12/12 features validadas em `tests/parity_check.js` (TTBH supera TBH Index e TBH Helper).

## STATUS DE CONCORRÊNCIA
- **Privacidade:** TTBH é 100% client-side. Zero dados trafegados na rede.
- **Diferenciais Exclusivos:** Log Parser de runtime, Guardrails econômicos de síntese, Drop Source integrado ao BiS, Suporte completo pt-BR para 248 runas.

## HISTÓRICO COMPLETO DE FASES
- **Fase 1 a 4:** Engenharia reversa EasySave3, AES-128-CBC, PBKDF2 WebCrypto, parsing de 6 heróis, telemetria básica.
- **Fase 5:** Resolução do bloqueador das runas (197 base → 248 nós completos via `ym`).
- **Fase 6:** Saneamento de regressões, consolidação de chaves do `TBH_DB` e criação do `log_parser.js`.
- **Fase 7:** Telemetria canônica (17 aggregate types) e simulador de síntese.
- **Fase 8:** Implementação do BiS Finder, Rune Planner e guardrails econômicos.
- **Fase 9:** Consolidação de 248 `runeLevels`, Timeline de Backups e validação E2E completa.
- **Fase 10:** Farming Calculator, Chest Simulator e Cube Workshop com dados canônicos D1–D7.
- **Fase 10 (Release Candidate):** Market Price API local, Chest Optimizer com EV, Drop Finder no BiS, Error Boundaries e preparação do v1.0.0-rc.1.
- **HOTFIX 10.1:** Correção P0 de upload de saves novos (erro JSON pos 158). Pipeline de parse com cascata `safeParseJSON` (raw → int64 quote-aware → exotics), sanitizador quote-aware `(?<!")\b(\d{15,})\b(?!")`, exibição de trecho diagnóstico em `<details><pre>` e botão de copiar relatório no modal de erro.
- **FASE 11 (Hardening Pós-Hotfix & Telemetria V2 Player.log):**
  - **O1:** Implementação do `sanitizeInt64V2` escape-aware (context walker) suportando inteiros negativos e inverter cascata em `safeParseJSON` (`int64v2` → `raw` → `exotics`). Assert de precisão exata do SteamID (`76561198859674725`) sem arredondamento IEEE-754.
  - **O2:** Conversão de ticks .NET (`netTicksToUnixMs`) usando `BigInt` sem perda de precisão; população de `parsed.meta = { savedAtUnixMs, savedAtISO, playTimeSec, schemaVersion, obscured }`. `BackupTimeline` agora consome `meta.savedAtUnixMs` diretamente do JSON.
  - **O3:** Detecção e sinalização de campos `OBSCURED_FIELDS` (`lastExitSteamUnixSecEncrypted` negativo marcado como ObscuredInt, nunca interpretado como data).
  - **O4:** Schema Drift Guard ativo: comparação do `meta.schemaVersion` com `TBH_DB.meta.supportedSaveSchema` (1.2.8) e `supportedClientBuild` (1.0.4) com banner não-bloqueante na UI e inclusão no botão de cópia de diagnóstico.
  - **Telemetria V2:** Módulo `assets/js/player_telemetry.js` (`PlayerTelemetry`), extração de CoolDown fracionário com vírgula, WaitQueue com countdown em tempo real, seeds (Personal vs Queue), alerta de softlock de stage (`4309`) e injeção do ciclo mediano no Farming Calculator. E2E expandido para 13/13 suites verdes e 15/15 asserts de log preservados.
