# RELATÓRIO DE DESCOBERTA E RECONHECIMENTO AUTÔNOMO (SYSTEM DISCOVERY)

```
Documento: 00-RELATORIO-DESCOBERTA.md
Versão: v2.0
Commit auditado: [NÃO ENCONTRADO: diretório não versionado via .git]
Data: 2026-10-12T11:00:00-03:00
Autor: Antigravity (Auditor Técnico Independente)
Status: Auditoria concluída
```

---

## SUMÁRIO EXECUTIVO

1. **Escopo e Natureza do Sistema:** O sistema auditado é o **ToolTaskBarHero (TTBH)**, uma Single Page Application (SPA) analítica *client-side* voltada à inspeção, descriptografia de arquivos de save (`SaveFile_Live.es3`) em formato Easy Save 3 (Unity) e otimização matemática de progressão para o jogo *Taskbar Hero* (Steam App ID 3678970).
2. **Ambiente de Execução:** Aplicação sem dependência de backend remoto em tempo de execução, rodando 100% no navegador sobre Web Crypto API nativa (AES-CBC + PBKDF2) e ES6 Modules servidos localmente via HTTP.
3. **Maturidade Técnica:** Estágio de *Release Candidate* (v1.0.0-rc.1) com 12 módulos de análise, catálogo estático canônico com 248 runas, 10 tiers de equipamentos e suíte de testes de fumaça E2E com 13/13 asserções cobertas.
4. **Vetor Crítico de Segurança:** Presença de chave estática AES extraída do binário Unity embutida em texto claro no código-fonte cliente (`assets/js/crypto.js` e `index.html`), categorizada como vulnerabilidade de gestão de segredos (`RSK-SECRET-001`).
5. **Privacidade e Conformidade:** Arquitetura *Zero Telemetry*, sem transmissão de dados a servidores remotos, com isolamento local de dados do jogador (`localStorage` exclusivo para cache de cotações).

---

## 0.1 IDENTIFICAÇÃO E DELIMITAÇÃO DE ESCOPO

- **Raiz auditada:** `/mnt/TMP/APPs/TBH`
- **Diretórios e artefatos excluídos da análise de negócio:**
  - `taskbarhero.wiki/` (mirror estático HTML/assets de 6.4 GB referente à wiki comunitária de referência).
  - `tbhindex/` (dump estático de 2.8 MB da ferramenta legada concorrente *TBH Index*).
  - `cripto/` (dump binário de asset da Unity `sharedassets0.assets` de 18 MB).
  - `save/` e `steam_save/` (arquivos de dados brutos de usuário `.es3`, `.dat`, `.vdf` e logs `.log` de tempo de execução).
  - `.kilo/` (metadados internos de editor/ambiente).
- **Modo do repositório:** Single-app SPA modular com banco de dados estático embutido.
- **Subsistema principal auditado:** Aplicação web TTBH contida em `index.html`, `assets/css/styles.css` e `assets/js/*.js`.
- **Commit auditado:** `[NÃO ENCONTRADO: repositório local sem diretório .git ativo] [evidência: git rev-parse HEAD -> fatal: not a git repository]`.
- **Data/Hora da auditoria:** 2026-10-12T11:00:00-03:00 (ISO 8601).
- **Domínio de negócio:** Ferramenta analítica e de suporte a jogos (Gaming Analytics / Save Inspector & Combat Calculator).
- **Estágio aparente:** Release Candidate (v1.0.0-rc.1) `[evidência: STATUS.md#L1; README.md#L6]`.

> Confiança: Alta
> Justificativa: Identificação direta da raiz do projeto, diretórios excluídos delimitados e metadados de versão confirmados em documentação oficial.

---

## 0.2 STACK TÉCNICA

- **Linguagens e Padrões:**
  - HTML5 Semântico `[evidência: index.html#L1-L1200]`.
  - CSS3 Moderno com Glassmorphism, CSS Custom Properties e responsividade sem frameworks `[evidência: assets/css/styles.css#L1-L1585]`.
  - JavaScript Vanilla ES6+ com ECMAScript Modules (`import`/`export`) `[evidência: assets/js/*.js]`.
- **Runtimes e APIS Web:**
  - Navegadores modernos com suporte a ES Modules e `window.crypto.subtle` (Web Crypto API) `[evidência: assets/js/crypto.js#L42-L71]`.
  - Servidor de desenvolvimento local: Python 3 (`http.server`) ou Node.js `[evidência: docs/COMO_INICIAR.md#L18-L48]`.
- **Gerenciador de Pacotes e Dependências:**
  - Zero dependências de pacotes npm externas no runtime. Não há `package.json` ativo na raiz `[evidência: .kilo/.gitignore#L1-L6; listagem de diretório]`.
  - Toda a lógica criptográfica e matemática é implementada em código nativo sem bibliotecas externas (sem CryptoJS ou Lodash).
- **Armazenamento e Estado:**
  - Memória volátil de sessão (`window`, instâncias de classes em `app.js`).
  - Armazenamento persistente local: `window.localStorage` utilizado exclusivamente para cache de cotações (`ttbh_market_cache_v1`) `[evidência: assets/js/market_price.js#L8]` e anotações BiS (`ttbh_bis_notes_<heroId>`) `[evidência: assets/js/app.js#L1539]`.
- **Infraestrutura e Orquestração:**
  - Não aplicável no runtime (`[NÃO APLICÁVEL]`: aplicação client-side estática).
  - Integração local com sistema operacional Linux Proton via link simbólico `steam_save` `[evidência: docs/COMO_INICIAR.md#L34; assets/js/app.js#L213]`.

> Confiança: Alta
> Justificativa: Ausência comprovada de dependências externas via manifestos e validação direta das chamadas de API do navegador.

---

## 0.3 ESTRUTURA DO REPOSITÓRIO

Árvore arquitetural de alto nível (máx. 3 níveis):

```text
/mnt/TMP/APPs/TBH/
├── assets/
│   ├── css/
│   │   └── styles.css                     # Sistema de estilos e tokens visuais Glassmorphism
│   └── js/
│       ├── ai_exporter.js                 # Exportador analítico de telemetria para IA (Markdown)
│       ├── app.js                         # Orquestrador da interface e ciclo de vida da UI
│       ├── backup_timeline.js             # Comparador cronológico de deltas entre saves
│       ├── bis_finder.js                  # Otimizador Best-in-Slot para 6 heróis x 10 slots
│       ├── chest_optimizer.js             # Calculador de EV, Monte Carlo e fonte de drops
│       ├── chest_simulator.js             # Simulador estocástico de abertura (PRNG Mulberry32)
│       ├── crypto.js                      # Motor criptográfico WebCrypto (AES-CBC + PBKDF2)
│       ├── farming_calculator.js          # Calculador de taxas horárias e rankings de estágios
│       ├── gamedata.js                    # Base de dados estática do jogo (TBH_DB)
│       ├── log_parser.js                  # Leitor analítico de logs de execução (Player.log)
│       ├── market_price.js                # Serviço de cotações com cache em localStorage
│       ├── player_telemetry.js            # Telemetria V2 de tempo de execução e cooldowns
│       ├── rune_planner.js                # Árvore de talentos/runas com 248 nós e projeção SVG
│       ├── save_parser.js                 # Parser central do formato Easy Save 3 e normalizador
│       ├── stash_value.js                 # Calculador de patrimônio financeiro do inventário
│       ├── statistics_engine.js           # Motor de regras de combate, gargalo e score POWER
│       └── synthesis_simulator.js         # Simulador de síntese do Cubo com guardrails
├── docs/
│   ├── COMO_INICIAR.md                    # Guia de inicialização em desenvolvimento local
│   ├── descriptografia                    # Instruções de engenharia reversa do Easy Save 3
│   ├── Product Requirements Document-TTBH.md # PRD preliminar
│   ├── RELATORIO_AUDITORIA_TBH.md         # Relatório preliminar interno de desenvolvimento
│   └── algoritmo_de_estat_sticas.js       # Script de referência de regras de negócio
├── tests/
│   ├── e2e_smoke.js                       # Suíte consolidada de fumaça (13 suítes)
│   ├── fixtures/                          # Amostras sintéticas e reais de saves e logs
│   ├── log_parser.test.js                 # Asserções do leitor de Player.log (15/15)
│   └── parity_check.js                    # Teste comparativo contra concorrentes
├── index.html                             # Página única da aplicação
├── pets_catalog.json                      # Catálogo complementar de mascotes
├── runeLevels_248.json                    # Níveis e custos de progressão das 248 runas
├── wiki_runes_197.json                    # Base histórica de 197 runas
├── wiki_runes_248.json                    # Base canônica consolidada de 248 runas
└── [EXCLUÍDOS DE ANÁLISE DE NEGÓCIO: taskbarhero.wiki/, tbhindex/, cripto/, save/, steam_save]
```

- **Código de terceiros / Vendorizado:** `tbhindex/` e `taskbarhero.wiki/` identificados e marcados como externos de referência histórica e documental.
- **Código gerado automaticamente:** `assets/js/gamedata.js` contém cabeçalho indicativo `// AUTO-GENERATED by engine/build_bundle.py — do not edit by hand. Source: data/wiki/*.json` `[evidência: assets/js/gamedata.js#L1]`.

> Confiança: Alta
> Justificativa: Árvore examinada exaustivamente via comandos de leitura do filesystem.

---

## 0.4 SUPERFÍCIES EXPOSTAS

- **Pontos de Entrada de Interface (UI):**
  - Dropzone de arquivo local para arquivos `.es3` e `.bak` `[evidência: index.html#L53-L68]`.
  - Botão de leitura direta via HTTP do Proton Steam: `GET /steam_save/SaveFile_Live.es3` `[evidência: assets/js/app.js#L213]`.
  - Dropzone secundário para arquivos de log do jogo (`Player.log`, `Player-prev.log`) `[evidência: index.html#L1042-L1044; assets/js/app.js#L2138-L2160]`.
  - Dropzone de múltiplos arquivos para linha do tempo `[evidência: index.html#L973-L974; assets/js/app.js#L1638-L1666]`.
  - Modal de importação manual de cotações em CSV/JSON `[evidência: index.html#L1173-L1188; assets/js/app.js#L1970-L1985]`.
- **Endpoints de Rede Remotos:** `[NÃO ENCONTRADO]`
  - O sistema não efetua chamadas `fetch()`, `XMLHttpRequest` ou `WebSocket` para servidores externos da internet. O único `fetch` é estritamente local para a rota relativa `/steam_save/...` servida pelo próprio servidor local.
- **Filas e Barramentos Assíncronos:** Inexistentes. Toda comunicação entre componentes é síncrona ou mediada por Promises de APIs do navegador.

> Confiança: Alta
> Justificativa: Verificação via varredura estática de todas as ocorrências de `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` e URLs absolutas nos scripts JavaScript.

---

## 0.5 MODELO DE DADOS APARENTE

Entidades preliminares detectadas no esquema de dados do jogador (`PlayerSaveData` e `AccountSaveData` do Easy Save 3):

1. **Conta e Sessão (`AccountSaveData` / `commonSaveData`):** `ownerSteamId` (UInt64 representado em string), `playTime`, `version`, `currentStageKey`, `maxCompletedStage`, `lastSavedTime` (Ticks .NET).
2. **Moedas e Recursos (`currenySaveDatas`):** Ouro (`Key 100001`), Diamantes e fichas especiais.
3. **Cubo de Síntese (`cubeSaveLevelData`):** `Level`, `Exp`.
4. **Heróis (`heroSaveDatas`):** `heroKey` (101: Cavaleiro, 201: Explorador, 301: Feiticeiro, 401: Sacerdote, 501: Caçador, 601: Matador), `HeroLevel`, `HeroExp`, `equippedItemIds` (10 slots por herói), `equippedSKillKey` (3 slots de habilidades ativas).
5. **Inventário e Armazenamento (`inventorySaveDatas`, `stashSaveDatas`, `tradingStashSaveDatas`):** `ItemUniqueId`, `IsUnlock`.
6. **Itens Detalhados (`itemSaveDatas`):** `UniqueId`, `ItemKey` (código numérico codificando tipo, tier, raridade e nível), modificadores (`inherentAttributes`, `decorationsList`, `engravingsList`, `inscriptionsList`).
7. **Runas (`RuneSaveData`):** Mapeamento de nós ativados e níveis alocados na árvore de 248 runas.
8. **Mascotes (`PetSaveData`):** `PetKey`, `IsUnlock`.
9. **Telemetria de Atividades (`aggregateSaveDatas`):** 17 tipos de contadores acumulados de ações do jogador.

> Confiança: Alta
> Justificativa: Validação cruzada com o código do parser em `assets/js/save_parser.js#L433-L599` e fixtures de save descriptografadas.

---

## 0.6 SINAIS DE SEGURANÇA PRESENTES

- **Autenticação:** `[NÃO APLICÁVEL]` no contexto da aplicação web. Não há tela de login nem credenciais de acesso ao TTBH. O identificador do jogador (`ownerSteamId`) é apenas lido de forma passiva do arquivo de save para apresentação visual `[evidência: assets/js/app.js#L423-L435]`.
- **Autorização e Controle de Acesso:** `[NÃO APLICÁVEL]` em nível de aplicação (execução local monousuário).
- **Criptografia e Funções Criptográficas:**
  - Algoritmo: AES-128-CBC com padding PKCS7 via Web Crypto API nativa `[evidência: assets/js/crypto.js#L59-L72]`.
  - Derivação de chave (KDF): PBKDF2 com digest SHA-1 e 100 iterações (especificação idêntica ao plugin Easy Save 3 em C#) `[evidência: assets/js/crypto.js#L51-L57]`.
  - Vetor de Inicialização (IV): primeiros 16 bytes do arquivo de save, reutilizados como Salt da derivação `[evidência: assets/js/crypto.js#L37-L38]`.
- **Gestão de Segredos:**
  - Chave AES estática de fábrica do jogo extraída via engenharia reversa: `[REDACTED] [evidência: assets/js/crypto.js#L13]`.
  - Campo na UI para sobrescrita manual de chave pelo usuário: `input#custom-password` `[evidência: index.html#L77]`.
- **Integridade e Tratamento de Erros:**
  - Cascata de parsing JSON com recuperação de inteiros de 64 bits (`safeParseJSON`: `int64v2` → `raw` → `exotics`) `[evidência: assets/js/save_parser.js#L78-L97]`.
  - Banner de alerta não-bloqueante para descompasso de versões (*Schema Drift Guard*) `[evidência: assets/js/app.js#L403-L421]`.
- **Logs e Trilha de Auditoria:** Sem transmissão de telemetria externa. Alertas de console locais restritos a diagnósticos operacionais.

> Confiança: Alta
> Justificativa: Análise direta do módulo de criptografia e tratamento de dados em `assets/js/crypto.js`.

---

## 0.7 GATILHOS NORMATIVOS DETECTADOS

| Framework | Gatilho de Aplicação | Evidência Encontrada | Status |
|---|---|---|---|
| **LGPD** | Presença de PII (identificadores pessoais, IP, nome de usuário, SteamID) | Identificado `ownerSteamId` de 17 dígitos no save `[evidência: assets/js/save_parser.js#L515]` e `localUser.username` no `Player.log` `[evidência: assets/js/log_parser.js#L7]` | **Aplicável (Técnico)** — Tratamento estritamente local no dispositivo do titular |
| **PCI-DSS** | Dados de cartão de pagamento, CVV, checkout | Busca por termos `card`, `cvv`, `pan`, `payment`, `credit`, `checkout` realizada. Nenhum campo financeiro real de pagamento presente `[evidência: busca estática no repositório]` | **[NÃO APLICÁVEL]** |
| **HIPAA** | Informações de saúde protegidas (PHI) | Busca por termos médicos/hospitalares realizada. Contexto de RPG incremental com termos de jogo apenas | **[NÃO APLICÁVEL]** |
| **SOC 2** | Processamento de dados B2B multi-tenant e SLA contratual | Aplicação B2C monousuário sem processamento em nuvem ou multitenancy | **[NÃO APLICÁVEL]** |
| **Marco Civil da Internet** | Provedor de aplicação com guarda e provimento de conexão/registros de acesso (Art. 15) | O software não atua como provedor remoto; trata-se de software de prateleira/cliente executado localmente na máquina do usuário sem servidor remoto central | **[NÃO APLICÁVEL]** (com ressalva de integridade de logs locais) |
| **ISO 27001 Anexo A** | Controles técnicos de segurança da informação (criptografia, segredos, higiene de código) | Controles técnicos observáveis em criptografia cliente, sanitização de entrada e gestão de chaves | **Aplicável (Controles Técnicos)** |
| **OWASP ASVS** | Verificação de segurança de aplicação web | Nível alvo inferido: L1 (Higiene de aplicação e client-side security) devido à ausência de infraestrutura de backend | **Aplicável (Nível L1)** |

> Confiança: Alta
> Justificativa: Verificação exaustiva de padrões normativos contra o código e fluxos de dados reais.

---

## 0.8 FORA DE ESCOPO DO RECONHECIMENTO

1. **Binários do Jogo na Steam:** Executáveis compilados (`TaskbarHero.exe`, DLLs da Unity em Mono/IL2CPP), uma vez que não integram o repositório auditado.
2. **Infraestrutura de Rede e Nuvem:** Roteadores, firewalls, DNS e CDN de terceiros, pois a ferramenta opera localmente sem infraestrutura de hospedagem própria configurada no repositório.
3. **Processos Corporativos e Recursos Humanos:** Políticas organizacionais da desenvolvedora do jogo (*Tesseract Studio*) ou do mantenedor da ferramenta, focando estritamente em controles técnicos e arquiteturais observáveis no repositório.

---

## FORA DE ESCOPO DA AUDITORIA

- Auditoria da engine Unity interna do jogo proprietário *Taskbar Hero*.
- Validação física de hardware do usuário ou compatibilidade de drivers de vídeo.
- Processos de governança corporativa de entidades externas à aplicação.

---

## RASTREABILIDADE DE SAÍDA

| ID | Tipo | Descrição Sumária |
|---|---|---|
| `REC-DISC-001` | Reconhecimento | Identificação do modo single-app SPA 100% client-side |
| `REC-DISC-002` | Reconhecimento | Detecção do mecanismo Web Crypto API AES-CBC com PBKDF2 |
| `REC-DISC-003` | Reconhecimento | Identificação de dados identificáveis de conta Steam (`ownerSteamId`) |
| `RSK-SECRET-001` | Risco | Chave AES de descriptografia estática hardcoded em assets cliente |

---

## LACUNAS, INCERTEZAS E RISCOS DE AUDITORIA

1. **Repositório Git Não Inicializado:** A ausência de metadados `.git` no diretório `/mnt/TMP/APPs/TBH` impede a verificação automatizada de histórico de commits, tags assinadas ou rastreabilidade de autoria de linhas de código (`git blame`).
2. **Dependência de Schemas Externos:** O jogo proprietário pode alterar os layouts internos das classes serializadas no Easy Save 3 em patches futuros, o que pode demandar atualização no dicionário `TBH_DB`.
