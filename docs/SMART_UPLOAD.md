# 📂 Smart Upload - Guia Completo Cross-Platform

## Visão Geral

O TTBH v1.1.0 inclui um sistema inteligente de upload que:
- **Detecta automaticamente** seu sistema operacional (Windows, Linux ou macOS).
- **Sugere o caminho exato** da pasta onde o jogo grava seus arquivos.
- **Permite upload em massa** selecionando a pasta inteira de uma só vez via `webkitdirectory`.
- **Filtra automaticamente** os arquivos relevantes (`.es3`, `.bak`, `Player.log`, `backend.dat`), ignorando arquivos de cache ou temporários.

---

## 🗺️ Caminhos Padrão por Sistema Operacional

### Windows

**Caminho Principal:**
```text
%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero
```

**Exemplo Real:**
```text
C:\Users\SeuUsuario\AppData\LocalLow\TesseractStudio\TaskbarHero
```

**Como Navegar Rapidamente:**
1. Pressione `Win + E` para abrir o Explorador de Arquivos (ou `Win + R` para Executar).
2. Cole o caminho na barra de endereço ou na caixa do Executar.
3. Pressione `Enter`.
4. Arraste os arquivos para o TTBH ou use o botão **"📁 Selecionar Pasta Completa"**.

**Arquivos Esperados:**
- `SaveFile_Live.es3` — Save atual do jogo
- `SaveFile_Live_1.es3.bak` a `SaveFile_Live_5.es3.bak` — Backups automáticos de segurança
- `Player.log` — Log de telemetria da sessão
- `Player-prev.log` — Log da sessão anterior
- `backend.dat` — Metadados de sessão e rede

---

### Linux (Nativo)

**Caminho Principal:**
```text
~/.config/unity3d/TesseractStudio/TaskbarHero
```

**Como Navegar Rapidamente:**
```bash
cd ~/.config/unity3d/TesseractStudio/TaskbarHero
ls -la
```

**Via Gerenciador de Arquivos Gráfico:**
1. Abra seu gerenciador de arquivos (Nautilus, Dolphin, Thunar, etc.).
2. Pressione `Ctrl + L` para focar na barra de endereço.
3. Cole: `~/.config/unity3d/TesseractStudio/TaskbarHero`.
4. Pressione `Enter`.

---

### Linux (via Steam Proton)

Se você joga *Taskbar Hero* através do Steam Play / Proton no Linux, o jogo opera em um prefixo Wine/Proton embutido:

**Caminho Proton:**
```text
~/.steam/steam/steamapps/compatdata/3678970/pfx/drive_c/users/steamuser/AppData/LocalLow/TesseractStudio/TaskbarHero
```

*(Em distribuições Debian/Ubuntu com Steam deb, pode constar em `~/.steam/debian-installation/steamapps/compatdata/3678970/...`)*

**Nota:** O identificador numérico `3678970` é o AppID oficial do Taskbar Hero na Steam.

---

### macOS

**Caminho Principal:**
```text
~/Library/Application Support/TesseractStudio/TaskbarHero
```

**Como Navegar Rapidamente:**
1. Abra o Finder.
2. Pressione `Cmd + Shift + G` (Ir para Pasta).
3. Cole: `~/Library/Application Support/TesseractStudio/TaskbarHero`.
4. Pressione `Enter`.

---

## 🚀 Métodos de Upload Disponíveis

### Método 1: Selecionar Pasta Completa (Recomendado)
- Clique no botão **"📁 Selecionar Pasta Completa"**.
- Escolha a pasta `TaskbarHero`.
- O navegador processa todos os saves, backups e logs em lote de uma só vez com filtragem automática de extensões válidas.

### Método 2: Arrastar e Soltar (Drag & Drop)
- Clique em **"📋 Copiar"** na barra do caminho detectado.
- Cole o caminho no seu explorador de arquivos.
- Selecione os arquivos (`Ctrl+A` / `Cmd+A`) e arraste para o retângulo tracejado.

### Método 3: Carregamento Automático Steam (Linux)
- Caso esteja no Linux e executando o servidor HTTP local na máquina do jogo, o botão **"⚡ Carregar Save Atual da Steam (Linux)"** realiza a leitura imediata sem qualquer clique adicional.

---

## 🔒 Privacidade e Segurança (Zero Telemetry)

- **100% Client-Side:** Toda a leitura e decodificação ocorrem na memória do seu navegador.
- **Sem Envio Externo:** Nenhum byte de save ou log é transmitido para a internet.
- **Auditoria Transparente:** O código em [assets/js/smart_upload.js](file:///mnt/TMP/APPs/TBH/assets/js/smart_upload.js) e [assets/js/upload_manager.js](file:///mnt/TMP/APPs/TBH/assets/js/upload_manager.js) opera localmente.

---

## 🛠️ API JavaScript (smart_upload.js)

```javascript
// Detectar SO
const os = window.TTBH_SmartUpload.detectOS(); // 'windows' | 'linux' | 'mac'

// Obter caminho principal
const path = window.TTBH_SmartUpload.getPrimaryPath();

// Obter caminhos alternativos
const paths = window.TTBH_SmartUpload.getAllPaths();

// Copiar para a área de transferência
await window.TTBH_SmartUpload.copyToClipboard(path);

// Obter instruções de abertura por SO
const instructions = window.TTBH_SmartUpload.getOpenInstructions();
console.log(instructions.steps, instructions.shortcut);
```
