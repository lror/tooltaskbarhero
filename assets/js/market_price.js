/**
 * assets/js/market_price.js
 * ToolTaskBarHero (TTBH) - Release Candidate v1.0.0
 * Market Price Service: Cache Local (localStorage) + Importação CSV/JSON + Preço Manual + Metadados
 * 100% Client-Side. Zero telemetria.
 */

const STORAGE_KEY = 'ttbh_market_cache_v1';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export class MarketPriceService {
  constructor(tbhDb = {}, options = {}) {
    this.db = tbhDb || {};
    this.options = options;
    this.cache = this._loadCache();
  }

  _loadCache() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[MarketPrice] Falha ao carregar cache do localStorage:', e);
    }
    return {};
  }

  _saveCache() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
      }
    } catch (e) {
      console.warn('[MarketPrice] Falha ao salvar cache no localStorage:', e);
    }
  }

  /**
   * Retorna preço de um item específico
   * @param {string|number} itemKey
   * @returns {Promise<{gold: number, source: string, isStale: boolean, usedFallback: boolean}>}
   */
  async getPrice(itemKey) {
    const key = String(itemKey || '');
    const entry = this.cache[key];
    const now = Date.now();

    if (entry && typeof entry.gold === 'number') {
      const isStale = (now - (entry.timestamp || 0)) > SEVEN_DAYS_MS;
      return {
        gold: entry.gold,
        source: entry.source || 'cache',
        timestamp: entry.timestamp || now,
        isStale,
        usedFallback: false,
        confidence: entry.confidence || 'high'
      };
    }

    // Fallback estático do TBH_DB
    const staticItem = (this.db.gear && this.db.gear[key]) || null;
    let fallbackGold = 0;
    if (staticItem && typeof staticItem.cost === 'number') {
      fallbackGold = staticItem.cost;
    } else if (this.db.itemValues && typeof this.db.itemValues[key] === 'number') {
      fallbackGold = this.db.itemValues[key];
    } else {
      // Heurística de fallback baseada em grade (se disponível)
      fallbackGold = 100;
    }

    return {
      gold: fallbackGold,
      source: 'static_fallback',
      timestamp: now,
      isStale: false,
      usedFallback: true,
      confidence: 'low'
    };
  }

  /**
   * Retorna preços em lote
   * @param {Array<string|number>} itemKeys
   * @returns {Promise<Object>} Mapeamento itemKey -> resultado getPrice
   */
  async getPrices(itemKeys = []) {
    const results = {};
    for (const key of itemKeys) {
      results[key] = await this.getPrice(key);
    }
    return results;
  }

  /**
   * Define manualmente o preço de um item (override de usuário)
   * @param {string|number} itemKey
   * @param {number} gold
   * @param {string} source
   */
  setManualPrice(itemKey, gold, source = 'manual') {
    const key = String(itemKey || '');
    const numGold = Math.max(0, Number(gold) || 0);
    this.cache[key] = {
      gold: numGold,
      source,
      timestamp: Date.now(),
      confidence: source === 'manual' ? 'verified' : 'medium'
    };
    this._saveCache();
    return this.cache[key];
  }

  /**
   * Importa preços de um CSV ou JSON exportado do TBH Index
   * Formato CSV: itemKey,gold,timestamp
   * @param {string|Object} data
   * @param {'csv'|'json'} format
   * @returns {{imported: number, skipped: number}}
   */
  importPrices(data, format = 'csv') {
    let imported = 0;
    let skipped = 0;
    const now = Date.now();

    if (format === 'json') {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [key, val] of Object.entries(parsed)) {
          const gold = typeof val === 'object' ? val.gold : val;
          const ts = (typeof val === 'object' && val.timestamp) ? Number(val.timestamp) : now;
          if (typeof gold === 'number' && !isNaN(gold)) {
            this.cache[String(key)] = {
              gold,
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
      // CSV parsing
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

    this._saveCache();
    return { imported, skipped };
  }

  /**
   * Retorna metadados do preço de um item
   * @param {string|number} itemKey
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
    const isStale = (Date.now() - (entry.timestamp || 0)) > SEVEN_DAYS_MS;
    return {
      exists: true,
      source: entry.source || 'cache',
      lastUpdated: new Date(entry.timestamp).toISOString(),
      timestamp: entry.timestamp,
      isStale,
      confidence: entry.confidence || 'medium'
    };
  }

  /**
   * Retorna contagem de itens em cache
   */
  getCacheSize() {
    return Object.keys(this.cache).length;
  }

  /**
   * Limpa cache local
   */
  clearCache() {
    this.cache = {};
    this._saveCache();
  }
}

export const marketPrice = new MarketPriceService();
