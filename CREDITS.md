# 🙏 Créditos e Atribuições

O **ToolTaskBarHero (TTBH)** não existiria sem as seguintes ferramentas, bibliotecas, APIs e comunidades. Agradecemos profundamente a todos os contribuidores.

---

## 🎮 Jogo e Comunidade

### Taskbar Hero
- **Desenvolvedor:** Tesseract Studio
- **Steam App ID:** 3678970
- **Steam Store:** [https://store.steampowered.com/app/3678970/Taskbar_Hero/](https://store.steampowered.com/app/3678970/Taskbar_Hero/)
- **Comunidade:** Agradecemos à comunidade de jogadores pelo feedback, suporte e testes beta.

### Easy Save 3
- **Desenvolvedor:** Moodkie Staff
- **Uso:** Sistema de save do jogo (formato `.es3` com AES-128-CBC)
- **Site:** [https://moodkie.com/product/easy-save-3/](https://moodkie.com/product/easy-save-3/)
- **Documentação:** [https://docs.moodkie.com/easy-save-3/](https://docs.moodkie.com/easy-save-3/)

---

## 🔧 Runtime e Linguagens

### Node.js
- **Uso:** Runtime para testes automatizados e CI/CD
- **Versão:** ≥18 (recomendado v20+)
- **Site:** [https://nodejs.org/](https://nodejs.org/)
- **Licença:** MIT

### Python
- **Uso:** Servidor HTTP local, proxy CORS, ferramentas de setup
- **Versão:** ≥3.8
- **Site:** [https://www.python.org/](https://www.python.org/)
- **Licença:** PSF License

---

## 🌐 APIs e Serviços

### Steam Community Market API
- **Uso:** Consulta de preços de itens (via proxy local opcional)
- **Endpoint:** `https://steamcommunity.com/market/priceoverview/`
- **Documentação:** [https://github.com/Revadike/InternalSteamWebAPI/wiki](https://github.com/Revadike/InternalSteamWebAPI/wiki)
- **Nota:** API semi-pública, sem documentação oficial. Usada com rate limiting e cache para respeitar os limites.

### Web Crypto API
- **Uso:** Descriptografia AES-128-CBC + PBKDF2 (nativa do navegador)
- **Especificação:** [https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- **Suporte:** Todos os navegadores modernos (Chrome, Firefox, Edge, Safari)
- **Licença:** W3C Standard

### IndexedDB
- **Uso:** Armazenamento local de histórico de progressão
- **Especificação:** [https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- **Licença:** W3C Standard

---

## 🛠️ Ferramentas de Desenvolvimento

### GitHub CLI (`gh`)
- **Uso:** Automação de criação de repositório, releases e autenticação
- **Site:** [https://cli.github.com/](https://cli.github.com/)
- **Repositório:** [https://github.com/cli/cli](https://github.com/cli/cli)
- **Licença:** MIT

### http-server (Node.js)
- **Uso:** Servidor HTTP estático local (alternativa ao Python)
- **Comando:** `npx http-server -p 8000`
- **Repositório:** [https://github.com/http-party/http-server](https://github.com/http-party/http-server)
- **Licença:** MIT

### Python `http.server`
- **Uso:** Servidor HTTP estático local (método padrão)
- **Comando:** `python3 -m http.server 8000`
- **Documentação:** [https://docs.python.org/3/library/http.server.html](https://docs.python.org/3/library/http.server.html)
- **Licença:** PSF License

### GitHub Actions
- **Uso:** CI/CD automatizado (testes em cada push/PR)
- **Documentação:** [https://docs.github.com/en/actions](https://docs.github.com/en/actions)
- **Licença:** Proprietário (gratuito para repositórios públicos)

---

## 🎨 Recursos Visuais

### Google Fonts (Inter)
- **Uso:** Tipografia da interface
- **Site:** [https://fonts.google.com/specimen/Inter](https://fonts.google.com/specimen/Inter)
- **Licença:** SIL Open Font License 1.1
- **SRI:** Usamos Subresource Integrity (SHA-384) para garantir integridade

### Emoji Icons
- **Uso:** Ícones de navegação e status
- **Padrão:** Unicode Emoji (nativo do sistema operacional)
- **Especificação:** [https://unicode.org/emoji/](https://unicode.org/emoji/)

### Heroicons (inspiração)
- **Uso:** Inspiração para design de ícones (não usamos diretamente)
- **Site:** [https://heroicons.com/](https://heroicons.com/)
- **Licença:** MIT

---

## 📚 Padrões e Especificações

### OWASP ASVS (Application Security Verification Standard)
- **Uso:** Framework de referência para hardening de segurança
- **Versão:** 4.0.3 (Level 1)
- **Site:** [https://owasp.org/www-project-application-security-verification-standard/](https://owasp.org/www-project-application-security-verification-standard/)
- **Licença:** CC BY-SA 4.0

### Conventional Commits
- **Uso:** Padrão de mensagens de commit
- **Especificação:** [https://www.conventionalcommits.org/](https://www.conventionalcommits.org/)
- **Licença:** MIT

### Keep a Changelog
- **Uso:** Formato do arquivo CHANGELOG.md
- **Especificação:** [https://keepachangelog.com/](https://keepachangelog.com/)
- **Licença:** CC BY-SA 4.0

### Semantic Versioning (SemVer)
- **Uso:** Versionamento do projeto (v1.0.0, v1.0.1, etc.)
- **Especificação:** [https://semver.org/](https://semver.org/)
- **Licença:** CC BY 3.0

### LGPD (Lei Geral de Proteção de Dados)
- **Uso:** Compliance com privacidade de dados (Brasil)
- **Lei:** Lei nº 13.709/2018
- **Texto:** [http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

## 🔬 Ferramentas de Teste e Qualidade

### Acorn (JavaScript Parser)
- **Uso:** Validação de sintaxe ES6 em testes
- **Repositório:** [https://github.com/acornjs/acorn](https://github.com/acornjs/acorn)
- **Licença:** MIT

### Playwright (Browser Automation)
- **Uso:** Testes E2E automatizados no navegador (se habilitado)
- **Site:** [https://playwright.dev/](https://playwright.dev/)
- **Licença:** Apache 2.0

---

## 💡 Inspirações e Projetos Similares

### Path of Exile Tools
- **Projetos:** PoE Trade, PoB (Path of Building), Awakened PoE Trade
- **Inspiração:** Design de ferramentas de análise de inventário e builds
- **Nota:** Não usamos código desses projetos, apenas inspiração de UX/UI

### Diablo Tools
- **Projetos:** D4Builds, Maxroll, Icy Veins
- **Inspiração:** Visualização de builds e estatísticas de personagens
- **Nota:** Não usamos código desses projetos, apenas inspiração de UX/UI

---

## 👥 Contribuidores

### Equipe de Desenvolvimento
- **Arquiteto de Prompt:** Qwen (Engenheiro de Prompt Sênior)
- **Executor de Código:** Antigravity (Agente de Execução)
- **Product Owner:** Usuário final (você!)

### Agradecimentos Especiais
- **Comunidade Taskbar Hero:** Pelo feedback constante e testes beta
- **Desenvolvedores do Easy Save 3:** Pela documentação clara do formato de criptografia
- **Contribuidores do OWASP:** Pelo framework de segurança gratuito e abrangente
- **Mantenedores do Node.js e Python:** Pelas ferramentas robustas e bem documentadas

---

## 📄 Licenças de Terceiros

### Resumo de Licenças
| Projeto | Licença | Uso |
|---------|---------|-----|
| Node.js | MIT | Runtime |
| Python | PSF | Servidor HTTP |
| GitHub CLI | MIT | Automação |
| http-server | MIT | Servidor HTTP |
| Google Fonts (Inter) | SIL OFL 1.1 | Tipografia |
| OWASP ASVS | CC BY-SA 4.0 | Framework de segurança |
| Conventional Commits | MIT | Padrão de commits |
| Keep a Changelog | CC BY-SA 4.0 | Formato de changelog |
| SemVer | CC BY 3.0 | Versionamento |

---

## 🔗 Links Úteis

- **Repositório do TTBH:** [https://github.com/lror/tooltaskbarhero](https://github.com/lror/tooltaskbarhero)
- **Documentação:** [https://github.com/lror/tooltaskbarhero/tree/master/docs](https://github.com/lror/tooltaskbarhero/tree/master/docs)
- **Issues:** [https://github.com/lror/tooltaskbarhero/issues](https://github.com/lror/tooltaskbarhero/issues)
- **Steam Store (Taskbar Hero):** [https://store.steampowered.com/app/3678970/](https://store.steampowered.com/app/3678970/)

---

**Última atualização:** 2026-10-14  
**Versão do documento:** 1.0.1

*Se você acredita que algum crédito está faltando ou incorreto, por favor abra uma issue no repositório.*
