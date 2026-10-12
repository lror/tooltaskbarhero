# TTBH — Taskbar Hero Tracker & Helper

> Alternativa 100% client-side ao TBH Index e TBH Helper.  
> Seus saves **nunca saem do seu navegador**.

[![Release](https://img.shields.io/badge/release-v1.0.0--rc.1-blue.svg)](file:///mnt/TMP/APPs/TBH/RELEASE_NOTES_v1.0.0.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Zero Telemetry](https://img.shields.io/badge/Privacy-100%25%20Client--Side-brightgreen.svg)](#privacy)

---

## Features
- 📊 **Save Inspector:** Parsing completo de EasySave3 AES-128-CBC (248 runas, 9 pets, 17 tipos de aggregates canônicos).
- 🎯 **BiS Finder:** Sugestão ponderada do melhor equipamento para todos os 10 slots dos 6 heróis com indicador de Drop Source cruzado.
- 🌳 **Rune Planner:** Árvore interativa SVG com os 248 nós canônicos, requisitos de ramificação e projeção de custo de avanço.
- 🧪 **Synthesis Simulator:** Projeção de Cube EXP oficial por grade, evolução de nível do Cubo e guardrails contra perdas financeiras.
- 📜 **Log Parser:** Leitor analítico de `Player.log` com extração de 23 padrões (cooldowns, abates, seeds e transições).
- 💰 **Market Price API:** Cotação com cache local em `localStorage`, importação rápida em lote (CSV/JSON) e fallback seguro.
- 🎁 **Chest Optimizer & Drop Finder:** Cálculo de EV (Expected Value) líquido em ouro, simulador Monte Carlo e recomendação de drops.
- ⏱️ **Backup Timeline:** Análise comparativa entre múltiplos arquivos `.es3` com deltas temporais e gráficos vetoriais.
- 📈 **Stash Value & Combat Power:** Avaliação patrimonial da conta e cálculo do Score POWER (0-100) aberto e transparente.

---

## Quick Start
1. Abra `index.html` em qualquer navegador web moderno (Edge, Chrome, Firefox).
2. Arraste e solte o arquivo `SaveFile_Live.es3`.
3. Explore as abas de análise, planejamento e otimização.

---

## Privacy
Tudo roda 100% no seu navegador usando WebCrypto e JavaScript vanilla. Nenhum cookie de rastreamento, nenhuma API externa e nenhuma telemetria.

---

## License
MIT License.
