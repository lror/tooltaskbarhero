# Política de Privacidade - ToolTaskBarHero (TTBH)

**Última atualização:** 13 de outubro de 2026  
**Versão:** 1.0.0

## 1. Resumo Executivo

O **ToolTaskBarHero (TTBH)** é uma ferramenta **100% client-side** que processa todos os dados localmente no seu navegador. **Nenhum dado é enviado, armazenado ou processado em servidores externos.** Esta política descreve como seus dados são tratados dentro do próprio dispositivo.

## 2. Dados Coletados e Processados

### 2.1 Dados que VOCÊ fornece voluntariamente
- **Arquivos de save do jogo** (`.es3`, `.bak`): Processados localmente para extração de estatísticas.
- **Logs do jogador** (`Player.log`, `Player-prev.log`): Analisados localmente para telemetria de combate.
- **Arquivos de backend** (`backend.dat`): Parseados localmente para metadados de sessão.

### 2.2 Dados gerados localmente
- **Snapshots de progressão**: Resumos anonimizáveis (stage, ouro, contagem de itens Tier 7+) armazenados no **IndexedDB do seu navegador**.
- **Preferências de UI**: Configurações como "Anonimizar identificadores" salvas em memória de sessão.

## 3. O que NÃO fazemos

- ❌ **NÃO** transmitimos dados para servidores externos
- ❌ **NÃO** utilizamos cookies de rastreamento
- ❌ **NÃO** integramos analytics de terceiros (Google Analytics, etc.)
- ❌ **NÃO** vendemos ou compartilhamos dados
- ❌ **NÃO** exigimos criação de conta ou login

## 4. Anonimização de Dados Sensíveis

Quando você utiliza o recurso **"Exportar para IA-TBH"**, a ferramenta oferece (ativado por padrão) a anonimização automática de:
- **SteamID** → Substituído por `[STEAM_ID_ANONIMIZADO]`
- **Username** → Substituído por `[USUARIO_ANONIMIZADO]`

Você pode desativar essa anonimização caso precise dos identificadores para diagnósticos pessoais.

## 5. Armazenamento Local (IndexedDB)

Os snapshots de progressão são armazenados no **IndexedDB** do seu navegador sob o nome `TTBH_HistoryDB`. Você pode:
- **Limpar esses dados** a qualquer momento através das configurações do navegador
- **Exportar** seus dados via função de exportação da ferramenta
- **Ignorar** o armazenamento desmarcando a opção de histórico (quando disponível)

## 6. Conformidade LGPD

Em conformidade com a **Lei Geral de Proteção de Dados (Lei nº 13.709/2018)**:

- **Base legal**: Consentimento explícito do usuário ao utilizar a ferramenta
- **Direito de acesso**: Todos os dados estão acessíveis via exportação
- **Direito de exclusão**: Basta limpar o IndexedDB do navegador
- **Direito à portabilidade**: Dados exportáveis em formato JSON
- **Encarregado de dados**: Por ser uma ferramenta local sem operador externo, o próprio usuário é o controlador dos dados

## 7. Segurança

- **Content Security Policy (CSP)** restritiva para prevenir injeção de código
- **Subresource Integrity (SRI)** em recursos externos (Google Fonts)
- **Sanitização de HTML** em todas as interpolações de dados do usuário
- **Chave de criptografia** tratada como configuração pública do jogo (não credencial)

## 8. Alterações nesta Política

Alterações serão documentadas no [CHANGELOG.md](../CHANGELOG.md) do projeto.

## 9. Contato

Por ser um projeto open-source client-side, dúvidas podem ser reportadas via issues no repositório oficial do projeto.

---

*Esta política foi elaborada para ser transparente e concisa. O TTBH acredita que privacidade deve ser o padrão, não uma opção.*
