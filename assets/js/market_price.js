/**
 * assets/js/market_price.js
 * [V1.1.0] Market Price Service com Steam Community Market API Real
 * Arquitetura em 3 camadas: Cache localStorage (7 dias TTL) → Proxy CORS local → Fallback CSV / DB
 * 100% Client-Side. Zero telemetria de dados do jogador.
 */

const MARKET_CACHE_KEY = 'ttbh_market_cache_v1';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export class MarketPriceService {
    constructor(tbhDb = {}, options = {}) {
        this.db = tbhDb || {};
        this.options = options;
        this.requestCount = 0;
        this.config = (typeof window !== 'undefined' && window.TTBH_STEAM_CONFIG) ? window.TTBH_STEAM_CONFIG : {
            appId: 3678970,
            proxyUrl: 'http://localhost:8765',
            currency: 7,
            requestDelay: 3000,
            maxRequestsPerSession: 50,
            cacheTtlDays: 7
        };
        this.cache = this.loadCache();
    }

    // ═══════════════════════════════════════════════════════
    // CACHE MANAGEMENT
    // ═══════════════════════════════════════════════════════

    loadCache() {
        try {
            if (typeof localStorage !== 'undefined') {
                const raw = localStorage.getItem(MARKET_CACHE_KEY);
                if (!raw) return {};
                const parsed = JSON.parse(raw);
                const items = parsed.items || parsed;
                const now = Date.now();
                const ttl = ((this.config?.cacheTtlDays || 7) * 24 * 60 * 60 * 1000) || SEVEN_DAYS_MS;
                const validItems = {};
                for (const [key, data] of Object.entries(items || {})) {
                    if (data && typeof data === 'object') {
                        if (!data.timestamp || (now - data.timestamp) < ttl) {
                            validItems[String(key)] = data;
                        }
                    } else if (typeof data === 'number') {
                        validItems[String(key)] = {
                            gold: data,
                            price: data,
                            timestamp: now,
                            source: 'legacy_cache',
                            confidence: 'medium'
                        };
                    }
                }
                return validItems;
            }
        } catch (e) {
            console.warn('[MarketPrice] Falha ao carregar cache do localStorage:', e);
        }
        return {};
    }

    _loadCache() {
        return this.loadCache();
    }

    saveCache() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify({
                    items: this.cache,
                    lastUpdate: Date.now()
                }));
            }
        } catch (e) {
            console.warn('[MarketPrice] Falha ao salvar cache:', e);
        }
    }

    _saveCache() {
        this.saveCache();
    }

    getCachedPrice(itemKey) {
        const key = String(itemKey || '');
        const cached = this.cache[key];
        if (!cached) return null;
        const ttl = ((this.config?.cacheTtlDays || 7) * 24 * 60 * 60 * 1000) || SEVEN_DAYS_MS;
        if (cached.timestamp && (Date.now() - cached.timestamp > ttl)) return null;
        return cached;
    }

    // ═══════════════════════════════════════════════════════
    // FETCH REAL (VIA PROXY LOCAL)
    // ═══════════════════════════════════════════════════════

    async fetchFromProxy(marketHashName) {
        if (!this.config.proxyUrl) {
            throw new Error('Proxy não configurado');
        }

        if (this.requestCount >= (this.config.maxRequestsPerSession || 50)) {
            throw new Error('Limite de requests por sessão atingido');
        }

        const url = `${this.config.proxyUrl}/price?` +
            `name=${encodeURIComponent(marketHashName)}` +
            `&currency=${this.config.currency || 7}` +
            `&appid=${this.config.appId || 3678970}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        this.requestCount++;

        if (!data.success) {
            throw new Error('Item não encontrado no mercado');
        }

        const lowest = this.parsePrice(data.lowest_price);
        const median = this.parsePrice(data.median_price);
        const effectivePrice = lowest > 0 ? lowest : median;

        return {
            gold: effectivePrice,
            price: effectivePrice,
            lowestPrice: lowest,
            medianPrice: median,
            volume: parseInt(data.volume, 10) || 0,
            currency: this.config.currency || 7,
            source: 'steam',
            confidence: 'verified',
            timestamp: Date.now(),
            raw: data
        };
    }

    parsePrice(priceStr) {
        if (!priceStr) return 0;
        // Ex: "R$ 1,23" ou "1,23€" -> 1.23
        const cleaned = String(priceStr)
            .replace(/[^\d,\.]/g, '')
            .replace(',', '.');
        return parseFloat(cleaned) || 0;
    }

    // ═══════════════════════════════════════════════════════
    // API PÚBLICA
    // ═══════════════════════════════════════════════════════

    /**
     * Retorna preço de um item (Cache → Proxy → Fallback DB)
     * @param {string|number} itemKey
     * @param {string|null} marketHashName
     * @returns {Promise<{gold: number, price: number, source: string, isStale: boolean, usedFallback: boolean}>}
     */
    async getPrice(itemKey, marketHashName = null) {
        const key = String(itemKey || '');
        const now = Date.now();
        const ttl = ((this.config?.cacheTtlDays || 7) * 24 * 60 * 60 * 1000) || SEVEN_DAYS_MS;

        // 1. Tentar Cache Válido
        const entry = this.cache[key];
        if (entry && (typeof entry.gold === 'number' || typeof entry.price === 'number')) {
            const isStale = (now - (entry.timestamp || 0)) > ttl;
            const gold = entry.gold !== undefined ? entry.gold : entry.price;
            return {
                ...entry,
                gold,
                price: gold,
                source: entry.source || 'cache',
                timestamp: entry.timestamp || now,
                isStale,
                usedFallback: false,
                cached: true,
                confidence: entry.confidence || 'high'
            };
        }

        // 2. Tentar Proxy se nome do mercado estiver disponível
        const hashName = marketHashName || (typeof window !== 'undefined' && window.TTBH_MARKET_HASH_MAP && window.TTBH_MARKET_HASH_MAP[key]);
        if (hashName && this.config.proxyUrl) {
            try {
                await this.delay(this.config.requestDelay || 3000);
                const fetched = await this.fetchFromProxy(hashName);
                this.cache[key] = {
                    ...fetched,
                    marketHashName: hashName
                };
                this.saveCache();
                return {
                    ...fetched,
                    marketHashName: hashName,
                    isStale: false,
                    usedFallback: false,
                    cached: false
                };
            } catch (e) {
                console.warn(`[MarketPrice] Falha ao consultar Steam para ${hashName}:`, e.message);
            }
        }

        // 3. Fallback estático do TBH_DB
        const staticItem = (this.db.gear && this.db.gear[key]) || null;
        let fallbackGold = 0;
        if (staticItem && typeof staticItem.cost === 'number') {
            fallbackGold = staticItem.cost;
        } else if (this.db.itemValues && typeof this.db.itemValues[key] === 'number') {
            fallbackGold = this.db.itemValues[key];
        }

        return {
            gold: fallbackGold,
            price: fallbackGold,
            source: fallbackGold > 0 ? 'static_db' : 'none',
            timestamp: now,
            isStale: true,
            usedFallback: true,
            cached: false,
            confidence: 'low'
        };
    }

    /**
     * Busca preços de múltiplos itens em lote com rate limiting
     */
    async getPricesBatch(items) {
        const results = {};
        const toFetch = [];

        for (const item of items) {
            const key = String(item.itemKey || item.id || '');
            const cached = this.getCachedPrice(key);
            if (cached) {
                const gold = cached.gold !== undefined ? cached.gold : cached.price;
                results[key] = { ...cached, gold, price: gold, source: 'cache', cached: true };
            } else if (item.marketHashName) {
                toFetch.push(item);
            } else {
                results[key] = await this.getPrice(key);
            }
        }

        for (const item of toFetch) {
            const key = String(item.itemKey || item.id || '');
            try {
                results[key] = await this.getPrice(key, item.marketHashName);
            } catch (e) {
                results[key] = { gold: 0, price: 0, source: 'error', error: e.message };
            }
        }

        return results;
    }

    /**
     * Define preço manual no cache
     */
    setManualPrice(itemKey, gold, source = 'manual') {
        const key = String(itemKey || '');
        const numGold = Math.max(0, Number(gold) || 0);
        this.cache[key] = {
            gold: numGold,
            price: numGold,
            source,
            timestamp: Date.now(),
            confidence: source === 'manual' ? 'verified' : 'medium'
        };
        this.saveCache();
        return this.cache[key];
    }

    /**
     * Importa preços de CSV ou JSON
     */
    importPrices(data, format = 'csv') {
        let imported = 0;
        let skipped = 0;
        const now = Date.now();

        if (format === 'json') {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            if (typeof parsed === 'object' && parsed !== null) {
                for (const [key, val] of Object.entries(parsed)) {
                    const gold = typeof val === 'object' ? (val.gold !== undefined ? val.gold : val.price) : val;
                    const ts = (typeof val === 'object' && val.timestamp) ? Number(val.timestamp) : now;
                    if (typeof gold === 'number' && !isNaN(gold)) {
                        this.cache[String(key)] = {
                            gold,
                            price: gold,
                            source: 'import_json',
                            timestamp: ts,
                            confidence: 'high'
                        };
                        imported++;
                    } else {
                        skipped++;
                    }
                }
            }
        } else {
            const text = String(data || '').trim();
            const lines = text.split(/\r?\n/);
            for (const line of lines) {
                if (!line.trim() || line.startsWith('#') || line.startsWith('itemKey')) continue;
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const itemKey = parts[0].trim();
                    const gold = parseFloat(parts[1].trim());
                    const ts = parts[2] ? parseInt(parts[2].trim(), 10) : now;
                    if (itemKey && !isNaN(gold)) {
                        this.cache[itemKey] = {
                            gold,
                            price: gold,
                            source: 'import_csv',
                            timestamp: isNaN(ts) ? now : ts,
                            confidence: 'high'
                        };
                        imported++;
                    } else {
                        skipped++;
                    }
                } else {
                    skipped++;
                }
            }
        }

        this.saveCache();
        return { imported, skipped };
    }

    /**
     * Retorna metadados do preço de um item
     */
    getMetadata(itemKey) {
        const key = String(itemKey || '');
        const entry = this.cache[key];
        if (!entry) {
            return {
                exists: false,
                source: 'none',
                lastUpdated: null,
                isStale: false,
                confidence: 'none'
            };
        }
        const ttl = ((this.config?.cacheTtlDays || 7) * 24 * 60 * 60 * 1000) || SEVEN_DAYS_MS;
        const isStale = (Date.now() - (entry.timestamp || 0)) > ttl;
        return {
            exists: true,
            source: entry.source || 'cache',
            price: entry.gold !== undefined ? entry.gold : entry.price,
            gold: entry.gold !== undefined ? entry.gold : entry.price,
            lastUpdated: entry.timestamp ? new Date(entry.timestamp).toISOString() : null,
            timestamp: entry.timestamp,
            isStale,
            confidence: entry.confidence || 'medium'
        };
    }

    /**
     * Verifica saúde do proxy local
     */
    async checkProxyHealth() {
        if (!this.config.proxyUrl) return { ok: false, reason: 'no_proxy' };

        try {
            const response = await fetch(`${this.config.proxyUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            if (!response.ok) return { ok: false, reason: 'http_error' };
            const data = await response.json();
            return { ok: data.status === 'ok', data };
        } catch (e) {
            return { ok: false, reason: 'connection_error', error: e.message };
        }
    }

    /**
     * Estatísticas do cache
     */
    getCacheStats() {
        const items = Object.values(this.cache);
        const now = Date.now();
        const ttl = ((this.config?.cacheTtlDays || 7) * 24 * 60 * 60 * 1000) || SEVEN_DAYS_MS;

        return {
            total: items.length,
            valid: items.filter(i => i.timestamp && (now - i.timestamp) < ttl).length,
            expired: items.filter(i => !i.timestamp || (now - i.timestamp) >= ttl).length,
            requestCount: this.requestCount,
            maxRequests: this.config.maxRequestsPerSession || 50
        };
    }

    getCacheSize() {
        return Object.keys(this.cache).length;
    }

    clearCache() {
        this.cache = {};
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(MARKET_CACHE_KEY);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const marketPrice = new MarketPriceService();

if (typeof window !== 'undefined') {
    window.marketPrice = marketPrice;
    window.TTBH_MarketPrice = MarketPriceService;
}
