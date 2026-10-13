import { stashValueEngine } from '../stash_value.js';
import { StatisticsEngine } from '../statistics_engine.js';
import { marketPrice } from '../market_price.js';

const statsEngine = new StatisticsEngine();

// market_view.js - Extraído de app.js

export function renderStashValue(data) {
        const totalEl = document.getElementById('stash-value-total');
        const subEl = document.getElementById('stash-value-sub');
        const toggleBtn = document.getElementById('btn-toggle-price-mode');

        if (!totalEl || !data) return;

        const valData = stashValueEngine.calculateTotalStashValue(data);
        totalEl.textContent = valData.totalFormatted;
        
        if (subEl) {
            subEl.textContent = `Mochila: R$ ${valData.byLocation.stash.toFixed(2)} | Bolsa: R$ ${valData.byLocation.inventory.toFixed(2)} | Trade Ship: R$ ${valData.byLocation.tradeShip.toFixed(2)} (${valData.itemCount} itens)`;
        }

        if (toggleBtn && !toggleBtn._hasInitListener) {
            toggleBtn._hasInitListener = true;
            toggleBtn.addEventListener('click', () => {
                const nextMode = stashValueEngine.priceMode === "current" ? "preClose" : "current";
                stashValueEngine.setPriceMode(nextMode);
                toggleBtn.textContent = `🏷️ Modo: ${nextMode === "current" ? "Atual" : "Pré-Fechamento"}`;
                if (window.__lastParsedSaveData) {
                    renderStashValue(window.__lastParsedSaveData);
                } else if (typeof currentParsedData !== "undefined") {
                    renderStashValue(currentParsedData);
                }
            });
        }

        setupMarketControls();
    }

export function setupMarketControls() {
    const proxyInput = document.getElementById('input-proxy-url');
    const ttlInput = document.getElementById('input-cache-ttl');
    const btnCheck = document.getElementById('btn-check-proxy');
    const btnFetch = document.getElementById('btn-fetch-all');
    const btnClear = document.getElementById('btn-clear-cache');
    const statusTextEl = document.getElementById('market-status-text');
    const badgeEl = document.getElementById('market-status-badge');
    const cacheCountEl = document.getElementById('market-cache-count');

    function updateStatus(msg, type = 'info') {
        if (!statusTextEl) return;
        const colors = { info: 'var(--text-secondary)', success: '#4ade80', error: '#f87171', warn: '#fbbf24' };
        statusTextEl.style.color = colors[type] || colors.info;
        statusTextEl.innerHTML = msg;
    }

    function refreshCacheBadge() {
        if (!cacheCountEl) return;
        const stats = marketPrice.getCacheStats();
        cacheCountEl.textContent = `${stats.valid} itens em cache`;
    }

    if (proxyInput && !proxyInput._hasInitListener) {
        proxyInput._hasInitListener = true;
        proxyInput.addEventListener('change', function() {
            if (window.TTBH_STEAM_CONFIG) {
                window.TTBH_STEAM_CONFIG.proxyUrl = this.value.trim();
            }
            marketPrice.config.proxyUrl = this.value.trim();
            updateStatus('✓ Proxy URL atualizado com sucesso.', 'success');
        });
    }

    if (ttlInput && !ttlInput._hasInitListener) {
        ttlInput._hasInitListener = true;
        ttlInput.addEventListener('change', function() {
            const days = parseInt(this.value, 10) || 7;
            if (window.TTBH_STEAM_CONFIG) {
                window.TTBH_STEAM_CONFIG.cacheTtlDays = days;
            }
            marketPrice.config.cacheTtlDays = days;
            refreshCacheBadge();
            updateStatus(`✓ Cache TTL ajustado para ${days} dias.`, 'success');
        });
    }

    if (btnCheck && !btnCheck._hasInitListener) {
        btnCheck._hasInitListener = true;
        btnCheck.addEventListener('click', async function() {
            updateStatus('🔍 Testando conexão com proxy local...', 'info');
            const health = await marketPrice.checkProxyHealth();
            if (health.ok) {
                if (badgeEl) {
                    badgeEl.className = 'gear-tag badge-tier-2';
                    badgeEl.textContent = 'Proxy Online';
                }
                updateStatus(`✅ Proxy operacional! Versão: ${health.data?.version || '1.1.0'} (${health.data?.timestamp || ''})`, 'success');
            } else {
                if (badgeEl) {
                    badgeEl.className = 'gear-tag badge-tier-5';
                    badgeEl.textContent = 'Proxy Offline';
                }
                updateStatus(`❌ Proxy indisponível em <code>${marketPrice.config.proxyUrl}</code>. Execute <code>python3 tools/steam_proxy.py</code> no terminal.`, 'error');
            }
        });
    }

    if (btnClear && !btnClear._hasInitListener) {
        btnClear._hasInitListener = true;
        btnClear.addEventListener('click', function() {
            marketPrice.clearCache();
            refreshCacheBadge();
            updateStatus('🗑️ Cache de cotações limpo com sucesso.', 'success');
            if (window.__lastParsedSaveData) {
                renderStashValue(window.__lastParsedSaveData);
            }
        });
    }

    if (btnFetch && !btnFetch._hasInitListener) {
        btnFetch._hasInitListener = true;
        btnFetch.addEventListener('click', async function() {
            await fetchAllMarketPrices();
        });
    }

    refreshCacheBadge();
}

export async function fetchAllMarketPrices() {
    const statusTextEl = document.getElementById('market-status-text');
    const badgeEl = document.getElementById('market-status-badge');

    const updateStatus = (msg, type = 'info') => {
        if (!statusTextEl) return;
        const colors = { info: 'var(--text-secondary)', success: '#4ade80', error: '#f87171', warn: '#fbbf24' };
        statusTextEl.style.color = colors[type] || colors.info;
        statusTextEl.innerHTML = msg;
    };

    const health = await marketPrice.checkProxyHealth();
    if (!health.ok) {
        if (badgeEl) {
            badgeEl.className = 'gear-tag badge-tier-5';
            badgeEl.textContent = 'Proxy Offline';
        }
        updateStatus(`❌ Proxy offline. Execute <code>python3 tools/steam_proxy.py</code> para habilitar busca ao vivo na Steam.`, 'error');
        return;
    }

    const data = window.__lastParsedSaveData || (typeof currentParsedData !== 'undefined' ? currentParsedData : null);
    if (!data) {
        updateStatus('⚠️ Carregue um save antes de consultar o mercado.', 'warn');
        return;
    }

    const allItems = [...(data.stash || []), ...(data.inventory || []), ...(data.tradeShip || [])];
    const uniqueKeys = new Map();

    allItems.forEach(it => {
        const key = String(it.lookupKey || it.itemKey || '');
        if (key && !uniqueKeys.has(key)) {
            uniqueKeys.set(key, {
                itemKey: key,
                marketHashName: (it.marketHashName || it.name)
            });
        }
    });

    updateStatus(`🚀 Iniciando consulta com rate limit para ${uniqueKeys.size} itens únicos...`, 'info');
    let fetched = 0;

    for (const [key, itemInfo] of uniqueKeys.entries()) {
        try {
            updateStatus(`⏳ Consultando Steam (${fetched + 1}/${uniqueKeys.size}): ${itemInfo.marketHashName}...`, 'info');
            await marketPrice.getPrice(key, itemInfo.marketHashName);
            fetched++;
        } catch (err) {
            console.warn(`[MarketView] Erro ao buscar item ${key}:`, err);
        }
    }

    updateStatus(`✅ Concluído! ${fetched} itens atualizados com a Steam Community Market.`, 'success');
    if (window.__lastParsedSaveData) {
        renderStashValue(window.__lastParsedSaveData);
    }
}

window.TTBH_fetchAllMarketPrices = fetchAllMarketPrices;


export function renderFarmProjections() {
        const farmProjections = statsEngine.calculateFarmEfficiency(1000, 250, 500);
        document.getElementById('bat-proj-exp').textContent = `+${Math.round(farmProjections.batStats.totalExp).toLocaleString()} EXP`;
        document.getElementById('watcher-proj-gold').textContent = `+${Math.round(farmProjections.watcherStats.totalGold).toLocaleString()} Ouro`;

        const inputClearTime = document.getElementById("input-clear-time");
        updateBottleneckView(parseFloat(inputClearTime?.value) || 48);
    }

export function updateBottleneckView(seconds) {
        const bottleneck = statsEngine.analyzeBottleneck("Atual", seconds);
        const alertBox = document.getElementById('bottleneck-alert');
        const title = document.getElementById('bottleneck-title');
        const desc = document.getElementById('bottleneck-desc');

        if (!alertBox || !title || !desc) return;

        if (bottleneck.isOptimal) {
            alertBox.className = "alert-box success";
            title.textContent = "Tempo Otimizado (< 60s)";
            desc.textContent = bottleneck.recommendation;
        } else {
            alertBox.className = "alert-box danger";
            title.textContent = "Gargalo Detectado (> 60s)";
            desc.textContent = bottleneck.recommendation;
        }
    }

