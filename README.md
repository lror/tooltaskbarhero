# 🎮 ToolTaskBarHero (TTBH)

**Análise avançada de saves para Taskbar Hero — 100% client-side, zero telemetry**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/seu-usuario/ttbh/releases)
[![Tests](https://img.shields.io/badge/tests-34%2F34%20passing-brightgreen.svg)](./tests/)

---

## 🚀 Visão Geral

O **ToolTaskBarHero (TTBH)** é uma ferramenta analítica de alta performance para jogadores de **Taskbar Hero** (Steam App ID: 3678970). Opera 100% no navegador do usuário, sem envio de dados para servidores externos.

### Principais Features

- 🔐 **Descriptografia WebCrypto** — AES-128-CBC + PBKDF2 nativo
- 📊 **Dashboard Completo** — Métricas globais, roster de heróis, inventário
- 🔨 **Aba BUILD Dedicada** — Visualização detalhada de builds com Hard Caps
- 🧊 **Otimizador do Cubo** — Regra de ±10 níveis com guardrails
- ⚔️ **BiS Finder** — Best-in-Slot para 6 heróis × 10 slots
- 🌳 **Planejador de Runas** — Árvore SVG com 248 nós
- 📈 **Telemetria V2** — Análise de `Player.log` com cooldowns fracionários
- 🤖 **Exportador IA v3.0** — Relatório END GAME SPEC com penalidades de Tormento
- 💰 **Stash Value** — Avaliação financeira do inventário em BRL
- 📦 **Upload Múltiplo** — Web Worker para processamento assíncrono
- 📊 **Histórico Local** — IndexedDB para progressão da conta

---

## ⚡ Início Rápido

### Pré-requisitos

- Navegador moderno (Chrome, Firefox, Edge, Brave)
- Python 3.x ou Node.js (para servidor local)

### Instalação

```bash
# Inicie o servidor local (escolha uma opção)
python3 -m http.server 8000
# ou
npx http-server -p 8000
```

### Uso

1. Abra `http://localhost:8000` no navegador
2. Clique em **"⚡ Modo Demo"** para carregar dados de demonstração
3. Ou use o **Smart Upload** (detecção automática de SO) ou arraste seu `SaveFile_Live.es3`
4. Explore as abas analíticas e a aba **🔨 BUILD**

---

## 📂 Localização dos Saves

O TTBH detecta automaticamente seu sistema operacional e sugere o caminho correto:

### Windows
```
%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero
```
**Exemplo:** `C:\Users\SeuNome\AppData\LocalLow\TesseractStudio\TaskbarHero`

### Linux (Nativo)
```
~/.config/unity3d/TesseractStudio/TaskbarHero
```

### Linux (via Steam Proton)
```
~/.steam/steam/steamapps/compatdata/3678970/pfx/drive_c/users/steamuser/AppData/LocalLow/TesseractStudio/TaskbarHero
```

### macOS
```
~/Library/Application Support/TesseractStudio/TaskbarHero
```

### Como Encontrar Rapidamente

1. Abra o TTBH no navegador (`http://localhost:8000`).
2. O caminho exato da sua máquina é exibido no topo da tela de conexão.
3. Clique em **"📋 Copiar"** para copiar o caminho diretamente para a área de transferência.
4. Abra o gerenciador de arquivos e cole o caminho.
5. Arraste os arquivos para o TTBH ou clique em **"📁 Selecionar Pasta Completa"** para importar tudo de uma vez.

Consulte o **[Guia Completo de Smart Upload](./docs/SMART_UPLOAD.md)** para mais detalhes.

---

## 📖 Documentação

- **[Como Iniciar](./docs/COMO_INICIAR.md)** — Guia completo de instalação e uso
- **[Changelog](./CHANGELOG.md)** — Histórico de mudanças
- **[Notas de Release](./RELEASE_NOTES_v1.0.0.md)** — Novidades da v1.0.0
- **[Relatório de Release](./RELATÓRIO-DE-RELEASE-v1.0.0.md)** — Documento técnico completo
- **[Política de Privacidade](./docs/legal/PRIVACY.md)** — LGPD e Zero Telemetry
- **[Termos de Uso](./docs/legal/TERMS.md)** — Licença e responsabilidades

---

## 🏗️ Arquitetura

### Stack Técnica

- **Frontend:** HTML5 + CSS3 (Glassmorphism) + JavaScript ES6 Modules
- **Criptografia:** Web Crypto API nativa (zero dependências)
- **Armazenamento:** IndexedDB + localStorage (cache de cotações)
- **Testes:** Node.js com suítes E2E, Log Parser e XSS Adversarial

---

## 🧪 Testes

### Executar Testes

```bash
./tools/ci/run_all.sh
```

### Cobertura

- ✅ **13/13** E2E Smoke Tests
- ✅ **15/15** Log Parser Tests
- ✅ **6/6** XSS Adversarial Tests
- **Total:** 34/34 testes passando (100%)

---

## 🔒 Segurança

### Postura de Segurança

- **Zero Telemetry:** Nenhum dado sai do navegador
- **CSP Restritiva:** `default-src 'self'`
- **SRI em Fontes:** Hashes SHA-384 no Google Fonts
- **XSS Mitigado:** Helper `safeHtml` com escape contextual
- **PII Anonimizado:** SteamID e username mascarados no exportador IA

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** — veja o arquivo [LICENSE](./LICENSE) para detalhes.

---

**Feito com 💙 para a comunidade Taskbar Hero**
