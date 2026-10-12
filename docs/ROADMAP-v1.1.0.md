# ROADMAP v1.1.0 — EXPANSÃO E RECURSOS AVANÇADOS

Este documento consolida as novas demandas de evolução funcional do ToolTaskBarHero (TTBH) para o marco **v1.1.0**.
Nenhuma feature listada neste documento faz parte do escopo da versão **v1.0.0** (estrita a estabilização, correções e hardening de segurança).

---

## Tabela de Novas Features

| ID | Nome | Descrição | Arquivos Alvo | Baseline Relacionada |
|---|---|---|---|---|
| FEAT-1101 | Módulo de descriptografia dedicado e upload simultâneo de múltiplos arquivos | Arquitetura de descriptografia assíncrona (Web Worker ou batch scheduler) permitindo envio e processamento concorrente de múltiplos arquivos do jogo sem bloqueio da main thread | backend.dat, Player-prev.log, Player.log, SaveFile_Live.es3, SaveFile_Live_1.es3.bak, SaveFile_Live_2.es3.bak, SaveFile_Live_3.es3.bak, SaveFile_Live_4.es3.bak, SaveFile_Live_5.es3.bak | RF-001, RF-002, RF-003, RF-017, RSK-ARCH-003, THR-005 |
| FEAT-1102 | Banco de dados local histórico com gráficos de progressão | Repositório local persistente via IndexedDB para armazenar snapshots sucessivos, permitindo renderizar gráficos de evolução da conta, taxas de ganho e tempo médio para obtenção de itens Tier 7+ | assets/js/db_history.js, assets/js/analytics_charts.js | RF-017, RF-018, RF-023, RNF-001, RSK-SEC-004 |
| FEAT-1103 | Parser para backend.dat | Engenharia reversa e parser de formato binário/serializado para o arquivo complementar backend.dat, integrando dados adicionais ao ecossistema | assets/js/backend_dat_parser.js | RSK-DATA-004, RSK-NEW-003 |
| FEAT-1104 | Aprimoramento do exportador IA-TBH | Expansão do gerador de relatório diagnóstico com incorporação de métricas históricas comparativas e rotinas de análise preditiva para melhoria contínua | assets/js/ai_exporter.js | RF-023, RSK-SEC-004 |

---

## Detalhamento das Demandas v1.1.0

### FEAT-1101: Módulo de descriptografia dedicado e upload simultâneo de múltiplos arquivos
- **Objetivo:** Permitir que o jogador selecione ou arraste simultaneamente todos os arquivos da pasta de save do jogo.
- **Arquivos Alvo:**
  - `backend.dat`
  - `Player-prev.log`
  - `Player.log`
  - `SaveFile_Live.es3`
  - `SaveFile_Live_1.es3.bak`
  - `SaveFile_Live_2.es3.bak`
  - `SaveFile_Live_3.es3.bak`
  - `SaveFile_Live_4.es3.bak`
  - `SaveFile_Live_5.es3.bak`
- **Baseline relacionada:** `RF-001`, `RF-002`, `RF-003`, `RF-017`, `RSK-ARCH-003`, `THR-005`.
- **Risco Associado:** `RSK-NEW-001` (Risco de congelamento da UI caso a descriptografia massiva não use Web Workers).

### FEAT-1102: Banco de dados local histórico com gráficos de progressão, evolução da conta e tempo médio para itens Tier 7+
- **Objetivo:** Persistir dados históricos em banco local sem ferir o princípio de privacidade (*Zero Telemetry*), viabilizando curvas de progressão temporal e cálculo analítico de tempo médio de aquisição de equipamentos de alto nível (Tier 7, Cósmico, Celestial).
- **Baseline relacionada:** `RF-017`, `RF-018`, `RF-023`, `RNF-001`, `RSK-SEC-004`.
- **Risco Associado:** `RSK-NEW-002` (Risco de crescimento descontrolado e limitações de quota de armazenamento do IndexedDB).

### FEAT-1103: Parser para backend.dat
- **Objetivo:** Investigar a estrutura de bytes, encoding e conteúdo do arquivo `backend.dat`, desenvolvendo decodificador seguro compatível.
- **Baseline relacionada:** `RSK-DATA-004`, `RSK-NEW-003`.
- **Risco Associado:** `RSK-NEW-003` (Risco de schema desconhecido e corrupção ao interpretar formato binário não documentado).

### FEAT-1104: Aprimoramento do exportador IA-TBH com dados históricos e análise de melhoria contínua
- **Objetivo:** Enriquecer o prompt Markdown gerado para IA com estatísticas de tendência e métricas de longo prazo, mantendo a camada de anonimização ativa.
- **Baseline relacionada:** `RF-023`, `RSK-SEC-004`.
- **Risco Associado:** `RSK-NEW-004` (Risco de retenção histórica de PII em analytics local se sanitização não for garantida).
