# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [1.0.1] - 2026-10-14
### Fixed
- Primeira execução em clone limpo não exibe mais erro vermelho de symlink Steam ausente (sonda silenciosa + botão opcional).
- Badge de status inicia neutro ("Aguardando save").
- favicon.svg linkado (elimina 404).
- "Log de Demonstração" usa fixture versionado no repo.
### Added
- tools/setup_steam_link.sh, docs/PRE-REQUISITOS.md, guia de primeira execução na UI.

## [1.0.0] - 2026-10-13
### 🛡️ Segurança (Hardening)
- Implementada Content Security Policy (CSP) restritiva (`RSK-SEC-002`).
- Adicionados hashes de Subresource Integrity (SRI) ao Google Fonts (`RSK-SEC-003`).
- Criado helper `window.TTBH.safeHtml` e refatorados 25 sinks dinâmicos de `innerHTML` para mitigar DOM XSS (`RSK-SEC-001`).
- Implementada anonimização condicional de SteamID e Username no Exportador para IA (`RSK-SEC-004`).
- Extraída chave AES estática para `crypto_config.js` com ADR de estratégia pública (`RSK-SECRET-001`).

### 🏗️ Arquitetura
- Refatoração massiva do monolito `app.js`: redução de 2.290 para ~630 linhas (73% de redução).
- Modularização em Views dedicadas: `hero_view.js`, `storage_view.js`, `telemetry_view.js`, `dashboard_view.js`, `market_view.js`, `timeline_view.js` (`RSK-ARCH-001`).

### 🐛 Correções de Defeitos (P0/P1)
- Corrigido `TypeError` na Timeline de Backups: `decryptES3` → `decryptBuffer` (`RSK-ARCH-003`).
- Corrigido `ReferenceError` na importação de preços: `renderStorage` → `filterAndRenderStorage` (`RSK-ARCH-004`).

### 🚀 Features (Preparação v1.1.0)
- Implementado `UploadManager` com suporte a upload simultâneo de múltiplos arquivos (`.es3`, `.bak`, `.log`, `.dat`).
- Criado Web Worker (`crypto_worker.js`) para descriptografia assíncrona sem bloquear a Main Thread.
- Implementado IndexedDB (`local_history_db.js`) para persistência local de snapshots de progressão da conta.
- Aprimorado `ai_exporter.js` com hook para inclusão de dados de evolução histórica da conta.

## [1.0.0-rc.1] - 2026-10-12
- Auditoria técnica completa e baseline estabelecida.

## [1.0.0] - 2026-10-13

### 🎉 Release Estável

#### Added
- Nova aba "BUILD" com visualização detalhada de heróis
- Exportador IA v3.0 END GAME SPEC com Hard Caps e penalidades de Tormento
- Upload múltiplo com Web Worker para processamento assíncrono
- IndexedDB para histórico local de progressão
- Parser de `backend.dat` para metadados de sessão
- Landing page estática em `docs/landing/index.html`
- Documentos legais (Política de Privacidade e Termos de Uso)
- Pipeline CI local (`./tools/ci/run_all.sh`)
- Suíte de testes XSS adversarial (6 payloads)

#### Changed
- `app.js` refatorado e modularizado
- Modularização completa em 6 Views ES6
- CSP restritiva implementada (`default-src 'self'`)
- SRI adicionado ao Google Fonts (SHA-384)
- 25 sinks de innerHTML protegidos com `safeHtml`
- PII anonimizado no exportador IA (SteamID, username)
- Chave AES externalizada para `crypto_config.js`

#### Fixed
- `RSK-ARCH-003`: Corrigido `cryptoEngine.decryptES3` → `decryptBuffer`
- `RSK-ARCH-004`: Corrigido `renderStorage` → `filterAndRenderStorage`
- Todos os riscos de segurança remediados
- Regressões de escopo após modularização resolvidas
