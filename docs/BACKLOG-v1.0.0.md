# BACKLOG v1.0.0 — RECONCILIAÇÃO E BASELINE AUDITADA

Documento de reconciliação, baseline viva e backlog priorizado do projeto ToolTaskBarHero (TTBH).
Base de dados sincronizada com o relatório de auditoria independente (`AUDITORIA/00` a `AUDITORIA/99`).

---

## Tabela de Reconciliação Geral

| ID | Tipo | Descrição | Severidade | Fase Alvo | Dependências | Esforço |
|---|---|---|---|---|---|---|
| RSK-ARCH-001 | Risco Arquitetural | Acoplamento excessivo no controller monolítico app.js (2290 linhas com 55 innerHTML diretos) | Média | v1.0.0 | Nenhuma | 3d |
| RSK-ARCH-002 | Risco Arquitetural | Volume excessivo de script estático síncrono em gamedata.js (1.9 MB carregado no rodapé) | Baixa | v1.0.0 | Nenhuma | 1d |
| RSK-ARCH-003 | Risco Arquitetural | Invocação de método inexistente cryptoEngine.decryptES3 em app.js#L1686 na timeline de backups | Alta | v1.0.0 | RF-017, RF-003 | 0.5d |
| RSK-ARCH-004 | Risco Arquitetural | Referência a função inexistente renderStorage em callback de importação de mercado em app.js#L1983 | Média | v1.0.0 | RF-022 | 0.5d |
| RSK-ARCH-005 | Risco Arquitetural | Fragilidade de caminho absoluto e dependência do usuário lror no symlink steam_save | Baixa | v1.0.0 | RF-002 | 0.5d |
| RSK-DATA-001 | Risco de Dados | Dupla serialização JSON aninhada em PlayerSaveData.value exigindo parse recursivo defensivo | Média | v1.0.0 | RF-005 | 1d |
| RSK-DATA-002 | Risco de Dados | Campo ofuscado ObscuredInt com valores inteiros negativos em timestamps (lastExitSteamUnixSecEncrypted) | Baixa | v1.0.0 | RNF-003 | 0.5d |
| RSK-DATA-003 | Risco de Dados | Ambiguidade de representação de slots vazios contendo ItemUniqueId = "0" ou "null" | Baixa | v1.0.0 | RF-008 | 0.5d |
| RSK-DATA-004 | Risco de Dados | Assimetria de catálogo histórico de runas (saves com 248 runas vs versões com 197) | Média | v1.0.0 | RF-016 | 1d |
| RSK-SEC-001 | Risco de Segurança | Injeção potencial de DOM XSS através de 55 pontos com concatenação de innerHTML não escapado | Alta | v1.0.0 | THR-002, THR-006 | 2d |
| RSK-SEC-002 | Risco de Segurança | Ausência de política Content Security Policy (CSP) declarada em meta tags de index.html | Média | v1.0.0 | Nenhuma | 0.5d |
| RSK-SEC-003 | Risco de Segurança | Carregamento de fontes externas Google Fonts sem atributo de integridade Subresource Integrity (SRI) | Baixa | v1.0.0 | Nenhuma | 0.5d |
| RSK-SEC-004 | Risco de Segurança | Exposição de PII (SteamID e username do sistema operacional) no relatório gerado para IA | Média | v1.0.0 | RF-023 | 0.5d |
| RSK-SECRET-001 | Risco de Segredos | Chave mestra estática AES-128 embutida em código cliente ([REDACTED] em crypto.js#L13) | Média | v1.0.0 | RF-003, THR-004 | 1d |
| RSK-NEW-001 | Risco v1.1.0 | Risco de bloqueio da main thread por descriptografia simultânea de múltiplos arquivos | Alta | v1.1.0 | FEAT-1101 | 2d |
| RSK-NEW-002 | Risco v1.1.0 | Risco de crescimento, migração e quota do banco local IndexedDB | Média | v1.1.0 | FEAT-1102 | 3d |
| RSK-NEW-003 | Risco v1.1.0 | Risco de schema desconhecido para backend.dat | Alta | v1.1.0 | FEAT-1103 | 2d |
| RSK-NEW-004 | Risco v1.1.0 | Risco de retenção histórica de PII em analytics local se anonimização não for aplicada | Média | v1.1.0 | FEAT-1104 | 1d |
| THR-001 | Ameaça STRIDE | Spoofing: Manipulação de ownerSteamId em save forjado para falsa titularidade de conta | Baixa | v1.0.0 | RF-005 | 1d |
| THR-002 | Ameaça STRIDE | Tampering: Adulteração de payload .es3 com injeção de tags HTML maliciosas em nomes de itens | Alta | v1.0.0 | RF-007, RF-008, RSK-SEC-001 | 2d |
| THR-003 | Ameaça STRIDE | Repudiation: Corrupção proposital de save com alegação indevida de falha no parser | Baixa | v1.0.0 | RF-024 | 0.5d |
| THR-004 | Ameaça STRIDE | Information Disclosure: Extração de chave criptográfica pública do jogo via código cliente | Média | v1.0.0 | RF-003, RSK-SECRET-001 | 1d |
| THR-005 | Ameaça STRIDE | Denial of Service: Ingestão de arquivos gigantes ou malformados travando memória do navegador | Média | v1.0.0 | RF-001 | 1d |
| THR-006 | Ameaça STRIDE | Elevation of Privilege: Execução de código arbitrário via DOM XSS e manipulação de contexto | Alta | v1.0.0 | RSK-SEC-001 | 2d |
| RF-001 | Requisito Funcional | Ingestão Manual de Save (.es3 ou .bak) via drag-and-drop e input file | Normal | v1.0.0 | Nenhuma | 1d |
| RF-002 | Requisito Funcional | Ingestão Local Proton/Steam via symlink HTTP direto em ambiente Linux | Normal | v1.0.0 | Nenhuma | 1d |
| RF-003 | Requisito Funcional | Descriptografia WebCrypto (PBKDF2 SHA-1 100 iter, AES-128-CBC, descompressão GZIP) | Alta | v1.0.0 | Nenhuma | 2d |
| RF-004 | Requisito Funcional | Modo Demonstração com carregamento de payload sintético completo sem save real | Baixa | v1.0.0 | Nenhuma | 0.5d |
| RF-005 | Requisito Funcional | Dashboard Global com métricas consolidadas (Gold, Cubo, Estágio, PlayTime, POWER Score) | Alta | v1.0.0 | RF-001, RF-003 | 2d |
| RF-006 | Requisito Funcional | Visualização do Roster da Party com 6 heróis, destaque para os 3 ativos e papéis táticos | Normal | v1.0.0 | RF-005 | 1.5d |
| RF-007 | Requisito Funcional | Ficha Modal Detalhada de Herói com 10 slots de equipamentos, skills ativas e talentos | Alta | v1.0.0 | RF-006 | 2d |
| RF-008 | Requisito Funcional | Navegador de Inventário (Bolsa e Mochila) com filtros, busca textual e segurança do Cubo | Normal | v1.0.0 | RF-005 | 2d |
| RF-009 | Requisito Funcional | Otimizador do Cubo de Síntese aplicando regra de margem estrita de +/- 10 níveis | Normal | v1.0.0 | RF-008 | 1d |
| RF-010 | Requisito Funcional | Eficiência e Buffs de Mascotes com projeção de ganhos (Morcego vs Vigia) | Normal | v1.0.0 | RF-005 | 1d |
| RF-011 | Requisito Funcional | Análise de Gargalo de Clear Time contra teto de 60s com recomendação de recuo de fase | Normal | v1.0.0 | RF-005 | 1d |
| RF-012 | Requisito Funcional | Calculadora de Farming com ranking de estágios por EXP/h e Gold/h com penalidade | Normal | v1.0.0 | RF-011 | 1.5d |
| RF-013 | Requisito Funcional | Simulador de Abertura de Baús estocástico determinístico com PRNG Mulberry32 | Normal | v1.0.0 | Nenhuma | 1d |
| RF-014 | Requisito Funcional | Otimizador de Baús e EV em ouro com Monte Carlo e buscador de drops | Normal | v1.0.0 | RF-013, RF-022 | 1.5d |
| RF-015 | Requisito Funcional | Best-in-Slot (BiS) Finder para os 10 slots dos 6 heróis com delta percentual de melhoria | Normal | v1.0.0 | RF-007, RF-008 | 2d |
| RF-016 | Requisito Funcional | Planejador da Árvore de Runas em SVG com 248 nós canônicos e projeção de custo | Normal | v1.0.0 | Nenhuma | 2d |
| RF-017 | Requisito Funcional | Linha do Tempo de Backups com gráfico de progressão e deltas entre saves | Alta | v1.0.0 | RF-001, RF-003 | 2d |
| RF-018 | Requisito Funcional | Painel de Atividade Acumulada para 17 categorias de telemetria canônica e top subchaves | Normal | v1.0.0 | RF-005 | 1d |
| RF-019 | Requisito Funcional | Parser Analítico de Player.log com extração de 23 padrões analíticos de execução | Normal | v1.0.0 | Nenhuma | 1.5d |
| RF-020 | Requisito Funcional | Telemetria V2 de Tempo de Execução com detecção de cooldowns, ciclo e softlock de fase | Normal | v1.0.0 | RF-019 | 1.5d |
| RF-021 | Requisito Funcional | Avaliação Financeira de Stash em Reais (BRL) para itens negociáveis Rare+ | Normal | v1.0.0 | RF-008, RF-022 | 1d |
| RF-022 | Requisito Funcional | Importação de Cotações de Mercado CSV/JSON com cache em localStorage e stale TTL | Normal | v1.0.0 | Nenhuma | 1d |
| RF-023 | Requisito Funcional | Exportador de Diagnóstico para IA gerando relatório estruturado em formato Markdown | Normal | v1.0.0 | RF-005, RF-015 | 1d |
| RF-024 | Requisito Funcional | Inspetor e Download de JSON descriptografado limpo com interface em árvore | Normal | v1.0.0 | RF-003 | 0.5d |
| RNF-001 | Requisito Não-Funcional | Zero Telemetry: Processamento 100% no cliente sem envio de dados para servidores remotos | Crítica | v1.0.0 | Nenhuma | Contínuo |
| RNF-002 | Requisito Não-Funcional | Fidelidade Criptográfica: Decodificação idêntica ao Easy Save 3 da Unity via WebCrypto API | Alta | v1.0.0 | RF-003 | Contínuo |
| RNF-003 | Requisito Não-Funcional | Precisão Numérica Int64: Preservação de SteamID de 17 dígitos e Ticks .NET sem arredondamento | Alta | v1.0.0 | RF-005 | Contínuo |
| RNF-004 | Requisito Não-Funcional | Resiliência safeParseJSON: Cascata de parse (int64v2 -> raw -> exotics) com diagnóstico | Alta | v1.0.0 | RF-001 | Contínuo |
| RNF-005 | Requisito Não-Funcional | Performance de Renderização: Paginação visual do inventário (máx 300 itens/bloco) | Média | v1.0.0 | RF-008 | Contínuo |
| RNF-006 | Requisito Não-Funcional | Localização pt-BR: Interface, atributos, itens e runas apresentados em Português-Brasil | Baixa | v1.0.0 | Nenhuma | Contínuo |
| RNF-007 | Requisito Não-Funcional | SPA Zero Dependências: Execução estática sem bundler (Webpack/Vite) em tempo de execução | Alta | v1.0.0 | Nenhuma | Contínuo |
| RNF-008 | Requisito Não-Funcional | Tolerância a Schema Drift: Detecção de divergência de schema e aviso não-bloqueante | Média | v1.0.0 | RF-005 | Contínuo |
