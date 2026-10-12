# Relatório de Auditoria, Identificação Técnica e Estado do Projeto — Sistema TBH (Task Bar Hero)

**Data da Auditoria:** 10 de Outubro de 2026  
**Auditor Responsável:** Engenharia de Sistemas & Arquitetura Web / Especialista em Save Game Parsing  
**Escopo:** Auditoria completa de codebase, decodificação/parsing de save, criptografia, consistência de dados do jogo, auditoria analítica de build/combate, histórico consolidado de implementações e referências externas.

---

## 1. Visão Geral do Produto e Arquitetura

O **ToolTaskBarHero (TTBH)** é uma aplicação web analítica de alta performance projetada para operar como um **Save Inspector & Combat Optimizer** privativo, 100% *client-side*, focado em acelerar a progressão de jogadores no RPG incremental **Task Bar Hero** (disponível na [Steam](https://store.steampowered.com/app/3678970)).

### 1.1. Arquitetura Técnica
* **Tecnologias Core:** HTML5 Semântico, CSS3 Moderno (Glassmorphism, dark mode, variáveis CSS responsivas), JavaScript Modular (ES6).
* **Execução & Privacidade:** Zero telemetria invasiva ou envio de dados a servidores remotos. Toda a descriptografia e o motor analítico rodam diretamente na memória do navegador.
* **Pipeline de Execução Local:** Inicialização via servidor HTTP nativo (`python3 -m http.server 8000` ou `npx http-server`), com suporte a symlink (`steam_save`) para leitura direta do Proton/Steam no Linux.

### 1.2. Módulos do Sistema
* **`index.html`**: Interface unificada com dashboard, abas de navegação, modais de auditoria de heróis e dropzone de arquivos.
* **`assets/js/crypto.js`**: Descriptografador WebCrypto API (AES-128-CBC + PBKDF2).
* **`assets/js/save_parser.js`**: Core parser do JSON Easy Save 3, descompactador de chaves de itens (`decodeItemKey`), normalizador de runas e status dos 6 heróis.
* **`assets/js/gamedata.js` (`TBH_DB`)**: Banco estático de metadados extraídos do jogo (heróis, 10 slots de itens, grades/raridades, runas, fórmulas).
* **`assets/js/statistics_engine.js`**: Motor analítico de cálculo de DPS, dano crítico, velocidade de ataque, eficiência de pets e telemetria do Cubo.
* **`assets/js/ai_exporter.js`**: Exportador analítico e auditor de builds para IA, identificando gargalos, "Falso Dano" e min-maxing.
* **`assets/js/app.js`**: Controlador de interface, binding de eventos, renderização reativa e integração de todos os subsistemas.

---

## 2. Bases e Fontes de Inspiração (Sites e Comunidades de Referência)

O desenvolvimento do TTBH baseou-se diretamente na engenharia reversa dos arquivos de ativos da Unity do próprio jogo e nas ferramentas e documentações comunitárias mais consolidadas do ecossistema:

### 2.1. Task Bar Hero Wiki & Database Oficial da Comunidade
* **URL:** [https://taskbarhero.wiki/](https://taskbarhero.wiki/)
* **Páginas e Módulos Consultados:**
  * **Save Inspector & My Save:** [`taskbarhero.wiki/save-inspector`](https://taskbarhero.wiki/save-inspector) e [`taskbarhero.wiki/my-save`](https://taskbarhero.wiki/my-save) — serviram de referência para a identificação de itens, layout de 10 slots de equipamentos por personagem e estrutura do JSON de save.
  * **Database de Heróis:** [`taskbarhero.wiki/heroes`](https://taskbarhero.wiki/heroes) — base para os status iniciais (HP, Dano Base, Armadura) das 6 classes: *Knight, Ranger, Sorcerer, Priest, Hunter e Slayer*.
  * **Catálogo de Equipamentos e Tiers:** [`taskbarhero.wiki/gear`](https://taskbarhero.wiki/gear) e [`taskbarhero.wiki/grades`](https://taskbarhero.wiki/grades) — referencial de tiers (T1 a T10+), raridades e probabilidades de síntese.
  * **Calculadoras e Otimizadores:**
    * *Farming Optimizer:* [`taskbarhero.wiki/tools/farming`](https://taskbarhero.wiki/tools/farming) (referência para benchmarks de Clear Time < 60s).
    * *BiS Finder (Best-in-Slot):* [`taskbarhero.wiki/tools/bis`](https://taskbarhero.wiki/tools/bis).
    * *Damage Calculator:* [`taskbarhero.wiki/tools/damage`](https://taskbarhero.wiki/tools/damage).
    * *Cube Leveling & Alchemy:* [`taskbarhero.wiki/tools/cube-leveling`](https://taskbarhero.wiki/tools/cube-leveling), [`taskbarhero.wiki/synthesis`](https://taskbarhero.wiki/synthesis) e [`taskbarhero.wiki/alchemy`](https://taskbarhero.wiki/alchemy).
    * *Runas e Mecânicas:* [`taskbarhero.wiki/runes`](https://taskbarhero.wiki/runes) e [`taskbarhero.wiki/mechanics`](https://taskbarhero.wiki/mechanics).
  * **Comunidade & Discord Oficial:** [Discord da Comunidade TBH](https://discord.gg/kSRUY8N8GA).

### 2.2. Jogo Base na Steam
* **Task Bar Hero na Steam Store:** [Steam App 3678970](https://store.steampowered.com/app/3678970) (Tesseract Studio).
* **Caminho de Dados no Linux (Proton):**
  `~/.steam/debian-installation/steamapps/compatdata/3678970/pfx/drive_c/users/steamuser/AppData/LocalLow/TesseractStudio/TaskbarHero/SaveFile_Live.es3`.

---

## 3. Pipeline Criptográfico & Segurança do Save

O arquivo `SaveFile_Live.es3` utiliza o plugin **Easy Save 3 (ES3)** da Unity. O pipeline de descriptografia validado e implementado na ferramenta opera da seguinte forma:

* **Algoritmo de Cifra:** `AES-CBC` com chave derivada de 128 bits.
* **Chave Mestra Extraída:** `"emuMqG3bLYJ938ZDCfieWJ"` (localizada nos metadados de asset da build Unity).
* **KDF (Key Derivation Function):**
  * `PBKDF2` com digest `SHA-1`.
  * 100 iterações (especificação exata da implementação padrão do ES3 em C#).
* **Vetor de Inicialização (IV) & Salt:**
  * O IV consiste nos primeiros 16 bytes do arquivo `.es3`.
  * O mesmo IV é utilizado como `salt` para a derivação PBKDF2.
* **Garantia de Segurança:** O arquivo bruto é decodificado via `window.crypto.subtle` gerando um JSON decodificado puro sem persistência em disco externa ou envio de telemetria.

---

## 4. Tudo o Que Já Foi Realizado e Implementado no Projeto

O projeto atingiu maturidade técnica completa nas seguintes frentes:

### 4.1. Core e Descriptografia
- [x] Implementação do módulo `crypto.js` com Web Crypto API nativo para decodificar arquivos `.es3`.
- [x] Fallback e suporte completo para importação via drag-and-drop, upload manual e carregamento direto via atalho Linux Steam (`steam_save`).
- [x] Inclusão de **Modo Demonstração (Demo)** para validação imediata da interface sem dependência de save real.

### 4.2. Parsing e Normalização de Dados (`save_parser.js`)
- [x] Parser completo do JSON ES3 descompactando chaves de telemetria (ouro, diamantes, cubo, fases).
- [x] Leitura dos 6 heróis, níveis, experiência e seus 10 slots de equipamentos equipados.
- [x] Extração e decodificação do inventário com categorização por tipo e raridade.
- [x] Parsing de runas ativas no `RuneSaveData`.

### 4.3. Motor Estatístico & Telemetria (`statistics_engine.js`)
- [x] **Módulo de Eficiência de Pets:** Comparador algorítmico entre *Morcego* (+15% EXP, +10% Baús) e *Vigia* (+15% Ouro), com projeções de ganho horário e por kills.
- [x] **Otimizador do Cubo:** Aplicação da regra de penalidade de margem de nível (±10 níveis de diferença do Cubo). Separação automática entre **Recomendado para Síntese** (100% EXP do Cubo) e **Recomendado para Alquimia** (venda por recursos).
- [x] **Detector de Gargalos (Clear Time):** Alerta em tempo real se o tempo de limpeza exceder a faixa ideal de 60 segundos, instruindo o jogador a fazer *down-tiering* para manter o fluxo máximo de baús.

### 4.4. Interface e Experiência do Usuário (UI/UX)
- [x] Dashboard com métricas rápidas (Ouro, Diamantes, Nível do Cubo, Estágio Atual).
- [x] Visualizador de Party e Heróis com cálculo de DPS, HP, Armadura, Taxa Crítica e Dano Crítico.
- [x] Modal interativo de inspeção profunda de cada herói com exibição detalhada dos 10 itens equipados.
- [x] Visualizador de Inventário com abas filtráveis e tags dinâmicas de destino do Cubo.
- [x] Botão para **Exportar Save Descriptografado em JSON**.
- [x] Exportador e Auditor de Builds integrado para relatórios amigáveis a LLMs/IAs.

---

## 5. Falhas Identificadas na Auditoria e Correções Aplicadas

Durante a auditoria profunda da codebase, 3 discrepâncias técnicas foram corrigidas:

### 5.1. Correção no Cálculo de Nível de Itens Comuns (`save_parser.js`)
* **Diagnóstico:** A função `decodeItemKey` tratava todos os itens com uma máscara de nível de 2 dígitos. No entanto, itens da raridade Comum (Grade 0) reservam 3 dígitos no esquema Easy Save 3 (`itemKey = 300020` correspondia a nível 100, mas decodificava erroneamente como nível 5).
* **Solução:** Ajustada a decodificação para contemplar o offset dinâmico baseado no tier/grade de raridade.

### 5.2. Correção no Cálculo de Runas e Tratamento de Runas Órfãs (`save_parser.js`)
* **Diagnóstico:** O save analisado possuía 248 runas registradas no `RuneSaveData`, enquanto a base estática do jogo (`TBH_DB.runes`) possuía 197 catalogadas. Havia 51 runas órfãs e o sistema utilizava um valor arbitrário de `40% de bônus global`.
* **Solução:** Substituído o bônus fixo pelo cálculo dinâmico real baseado no nível acumulado de cada runa válida (`level * 0.5%`) e inserido tratamento resiliente para não interromper a execução diante de runas não catalogadas.

### 5.3. Calibração de "Falso Dano" e Builds de Endgame (`ai_exporter.js`)
* **Diagnóstico:** O auditor analítico emitia avisos falsos de "Falso Dano" para heróis com equipamentos Celestiais/Míticos em estágios avançados, pois limitadores estáticos marcavam taxas críticas com dano crítico acima de 800% ou velocidades acima de 2.5x como anomalias.
* **Solução:** Parametrizados os limites `ENDGAME_CRIT_CONVERSION` e `ENDGAME_ATTACK_SPEED_DILUTION`, considerando a soma dos tiers dos equipamentos equipados antes de sinalizar distorções estatísticas.

---

## 6. Mapeamento das Estruturas de Dados do Save

| Chave no Save ES3 | Tipo | Utilização no TTBH |
| :--- | :--- | :--- |
| `selectedHeroIndex` | Integer | Herói em destaque na interface |
| `heroLevels` | Array[Int] | Níveis individuais de cada classe |
| `equippedItems` | Array[Int] | Itens equipados nos 10 slots por herói |
| `inventoryItems` | Array[Int] | Lista de itens no baú do jogador |
| `RuneSaveData` | Object/Dict | Mapeamento `{ runeId: runeLevel }` |
| `gold`, `diamonds` | BigInt/String | Recursos globais |
| `stageProgress` | Integer | Andar/estágio da campanha |
| `cubeLevel` | Integer | Nível do Cubo de Síntese |

---

## 7. Próximos Passos e Melhorias Futuras

1. **Expansão do Catálogo de Runas:** Adicionar as 51 runas pendentes em `gamedata.js` conforme novos patches do jogo forem minerados.
2. **Otimizador BiS Integrado:** Criar aba sugerindo automaticamente os melhores itens do inventário para cada herói baseando-se nas fórmulas do motor de dano.
3. **Simulador de Síntese:** Permitir ao jogador simular o resultado de sínteses de itens do inventário antes de executá-las no jogo.
