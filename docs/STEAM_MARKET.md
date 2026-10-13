# 💰 Integração Steam Community Market - TTBH v1.1.0

## Visão Geral

O TTBH agora suporta busca de preços em **tempo real** do Steam Community Market, respeitando a arquitetura **Zero Telemetry** e **100% client-side**.

## Arquitetura em 3 Camadas

```
┌──────────────────────────────────────┐
│  TTBH (Browser - 100% local)         │
│  └─ market_price.js                  │
│     ├─ Camada 1: Cache localStorage  │ (7 dias TTL padrão)
│     ├─ Camada 2: Proxy CORS local    │ (http://localhost:8765)
│     └─ Camada 3: Fallback CSV manual │ (Importação tradicional)
└──────────────────────────────────────┘
         ▲
         │ (HTTP local sem telemetria)
         │
┌──────────────────────────────────────┐
│  steam_proxy.py (opcional)           │
│  └─ Servidor Python local            │
│     └─ Consulta oficial à Steam      │
└──────────────────────────────────────┘
```

## Como Usar

### 1. Iniciar o Proxy Local (Opcional)

No diretório raiz da aplicação, abra um terminal e execute:

```bash
python3 tools/steam_proxy.py
```

O proxy ficará disponível em `http://localhost:8765`.

### 2. Configurar no TTBH

Na aba **Storage / Stash Value**, configure:
- **Proxy URL:** `http://localhost:8765` (padrão)
- **Cache TTL:** 7 dias (padrão, customizável de 1 a 30 dias)

### 3. Testar Conexão

Clique em **🔍 Testar Proxy** para verificar a disponibilidade imediata do serviço.

### 4. Buscar Preços

Clique em **🚀 Buscar Preços Steam** para atualizar todos os itens do inventário e mochila com respeito automático ao rate limit da Steam.

## Segurança e Privacidade (Privacy-by-Design)

- ✓ **100% local:** Nenhum dado sai da sua máquina para servidores de terceiros ou serviços analíticos.
- ✓ **Sem intermediários públicos:** Não usamos proxies públicos (ex: allorigins, corsproxy) que possam interceptar seus identificadores.
- ✓ **Código auditável e enxuto:** O script [tools/steam_proxy.py](file:///mnt/TMP/APPs/TBH/tools/steam_proxy.py) possui ~130 linhas legíveis em biblioteca padrão Python 3.
- ✓ **Cache offline:** Todas as cotações ficam persistidas no `localStorage` do seu navegador.

## Fallback Offline (CSV / JSON)

Caso não queira rodar o servidor proxy Python, a importação manual continua disponível:
1. Abra o modal clicando em **📥 Importar Preços (CSV)**.
2. Cole linhas no formato `itemKey,gold,timestamp`.
3. Clique em **Processar Importação**.

## API JavaScript

```javascript
// Buscar preço de um item individual
const price = await window.marketPrice.getPrice('301011', 'Espada Celestial');

// Buscar múltiplos itens em lote
const prices = await window.marketPrice.getPricesBatch([
    { itemKey: '301011', marketHashName: 'Espada Celestial' },
    { itemKey: '301012', marketHashName: 'Escudo do Baluarte' }
]);

// Testar saúde do proxy
const health = await window.marketPrice.checkProxyHealth();

// Métricas de cache
const stats = window.marketPrice.getCacheStats();

// Limpar cache local
window.marketPrice.clearCache();
```
