# Guia de Inicialização e Uso: ToolTaskBarHero (TTBH)

Este documento orienta como inicializar, configurar e utilizar o **ToolTaskBarHero (TTBH)**, uma ferramenta web client-side voltada para análise de progresso, auditoria de combate e otimização de farm do jogo *Taskbar Hero*.

---

## 1. Visão Geral da Arquitetura

- **Interface:** HTML5, CSS3 Moderno (Glassmorphism, responsivo) e JavaScript Modular (ES6).
- **Processamento:** **100% Client-Side**. Toda a descriptografia (AES-CBC via Web Crypto API) e análise estatística ocorrem diretamente no navegador. Nenhum arquivo de save é enviado para servidores externos.
- **Requisitos de Sistema:** Navegador web moderno (Google Chrome, Brave, Mozilla Firefox, Edge) com suporte a módulos ES6 e Web Crypto API.
- **Servidor HTTP Local:** Como a aplicação utiliza módulos ES6 (`import`/`export`), ela **deve** ser servida através de um servidor HTTP (o protocolo `file:///` bloqueia módulos JavaScript por políticas de CORS do navegador).

---

## 2. Como Iniciar o Sistema

### Opção 1: Inicialização via Python 3 (Recomendado)

O Linux já possui o `python3` instalado nativamente. Na raiz do projeto (`/mnt/TMP/APPs/TBH`), execute:

```bash
# 1. Navegue até o diretório da aplicação (se ainda não estiver nele)
cd /mnt/TMP/APPs/TBH

# 2. Inicie o servidor HTTP local
python3 -m http.server 8000
```

Abra o seu navegador e acesse:
👉 **[http://localhost:8000](http://localhost:8000)**

> [!TIP]
> O symlink `steam_save` existente na raiz permite que o botão **"⚡ Carregar Save Atual da Steam (Linux)"** leia diretamente o arquivo de save via `fetch` local quando servido pelo Python.

---

### Opção 2: Inicialização via Node.js / npx (Alternativa)

Caso tenha o ecossistema Node instalado:

```bash
# Com http-server
npx http-server . -p 8000 -c-1

# Ou com serve
npx serve . -l 8000
```

---

### Opção 3: Extensões de IDE (VS Code / Antigravity IDE)

Se preferir usar interface gráfica:
1. Abra a extensão **Live Server** (caso instalada).
2. Clique com o botão direito no arquivo `index.html` e selecione **"Open with Live Server"**.

---

## 3. Como Carregar o Save do Jogo

O TTBH oferece 3 formas simples de carregar seus dados:

### A. Carregamento Automático da Steam (Linux)
Se você joga *Taskbar Hero* via Steam no Linux (Proton):
1. Com o servidor local ativo, clique no botão verde: **"⚡ Carregar Save Atual da Steam (Linux)"**.
2. A aplicação fará a leitura instantânea do arquivo apontado pelo symlink `steam_save/SaveFile_Live.es3`.

### B. Upload / Arrastar Arquivo Manualmente
Caso queira analisar um backup ou esteja em outro caminho:
1. Arraste o arquivo `SaveFile_Live.es3` diretamente para a área de dropzone tracejada.
2. Ou clique em **"📁 Procurar Arquivo Manualmente"** e selecione o arquivo.

**Caminho padrão do save no Linux (Steam/Proton):**
```text
~/.steam/debian-installation/steamapps/compatdata/3678970/pfx/drive_c/users/steamuser/AppData/LocalLow/TesseractStudio/TaskbarHero/SaveFile_Live.es3
```

*(Ou na pasta de compatdata padrão: `~/.local/share/Steam/steamapps/compatdata/3678970/...`)*

### C. Modo de Demonstração (Demo)
Para testar a interface sem ter um arquivo de save em mãos:
1. Clique no botão **"⚡ Modo Demo"** no cabeçalho superior.
2. O sistema carregará dados pré-configurados de telemetria, heróis, inventário e análise estatística.

---

## 4. Funcionalidades e Navegação

Uma vez carregado o save, o painel exibirá:

| Aba / Módulo | Finalidade |
| :--- | :--- |
| **Geral (Overview)** | Resumo de Ouro, EXP, Nível do Cubo, estágio atual do mapa e métricas rápidas. |
| **Heróis & Party** | Inspeção detalhada de cada herói (níveis, 10 slots de equipamentos com tiers e raridades, talentos e atributos de combate calculados). Clique em um herói para abrir o modal de auditoria. |
| **Inventário (Storage)** | Lista completa de itens guardados com filtros por tipo, tier e tags de recomendação para o Cubo. |
| **Otimizador do Cubo** | Separação rigorosa de itens baseada na regra de ±10 níveis: indica quais itens devem ser usados em **Síntese** e quais devem ir para **Alquimia (Venda)**. |
| **Pets & Farm** | Cálculo de eficiência de ganhos com Pets (Morcego vs. Vigia) e projeções horárias. |
| **Auditoria & Gargalos** | Análise de tempo de limpeza de onda (*Clear Time*). Se o tempo exceder 60s, sugere rebaixar o estágio para manter a rentabilidade de baús. Permite também exportar relatórios para IA. |
| **Exportar JSON** | Baixa o arquivo decodificado em formato `.json` limpo para conferência manual.

---

## 5. Resolução de Problemas Comuns

- **Erro de CORS / Módulos não carregam:** Certifique-se de que abriu o sistema via `http://localhost:8000` e **não** direto por duplo clique no arquivo (`file:///...`).
- **Falha ao carregar direto da Steam:** Verifique se o symlink `steam_save` aponta para o diretório correto do seu usuário Steam. Se necessário, use a opção de carregar o arquivo manualmente.
- **Senha AES incorreta:** O sistema usa por padrão a chave extraída do jogo original. Se o jogo sofrer uma atualização com nova chave, clique em *"Opções avançadas / Senha personalizada"* na tela de upload e insira a nova chave.
