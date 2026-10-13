/**
 * [V1.1.0] Configuração do Steam Community Market
 * Usuário pode customizar proxy, TTL de cache e moeda
 */
window.TTBH_STEAM_CONFIG = window.TTBH_STEAM_CONFIG || {
    // AppID oficial do Taskbar Hero na Steam
    appId: 3678970,
    
    // Proxy CORS local (usuário roda steam_proxy.py)
    // Se vazio, usa apenas cache + fallback CSV
    proxyUrl: 'http://localhost:8765',
    
    // TTL do cache em dias (default: 7)
    cacheTtlDays: 7,
    
    // Moeda: 1=USD, 3=EUR, 7=BRL
    currency: 7,
    
    // Rate limiting (ms entre requests)
    requestDelay: 3000,
    
    // Máximo de requests por sessão
    maxRequestsPerSession: 50,
    
    // Tentar proxy automaticamente ao carregar
    autoFetchOnLoad: false
};

// Mapeamento de itemKey -> market_hash_name (amostra inicial)
// Expandido dinamicamente via busca fuzzy
window.TTBH_MARKET_HASH_MAP = window.TTBH_MARKET_HASH_MAP || {
    // Formato: { itemKey: 'market_hash_name' }
    // Preenchido pelo usuário ou por busca automática
};
