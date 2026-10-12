/**
 * TTBH - ToolTaskBarHero
 * Stash Value Calculator Engine (Fórmula Oficial)
 * 
 * Calcula o valor de mercado estimado do Stash do jogador com suporte a:
 * - Fontes de itens: Stash (Mochila) + Inventário (Bolsa) + Trade Ship (Navio de Troca)
 * - Toggle de modo de preço: Preço Atual de Mercado vs. Preço Pré-Fechamento
 * - Descarte / Liquidação zero para itens Common / Uncommon
 * - Multiplicador de quantidade por pilha (UniqueId / Quantity)
 */

import { marketPrice } from './market_price.js';

export class StashValueEngine {
    constructor() {
        // Tabela base de valores estimados de mercado (BRL) para itens negociáveis na Steam (Rare+)
        // Itens Common e Uncommon possuem valor de liquidação descartável / 0
        this.MARKET_PRICE_TABLE = {
            // Tiers de Equipamentos (Valores médios observados no mercado comunitário)
            tierPrices: {
                COMMON: { current: 0.00, preClose: 0.00 },
                UNCOMMON: { current: 0.00, preClose: 0.00 },
                RARE: { current: 0.15, preClose: 0.25 },
                LEGENDARY: { current: 0.85, preClose: 1.50 },
                IMMORTAL: { current: 3.50, preClose: 5.80 },
                ARCANA: { current: 15.00, preClose: 24.50 },
                BEYOND: { current: 48.00, preClose: 75.00 },
                CELESTIAL: { current: 180.00, preClose: 290.00 },
                DIVINE: { current: 650.00, preClose: 980.00 },
                COSMIC: { current: 2400.00, preClose: 3500.00 }
            },
            // Caixas de Recompensa
            boxPrices: {
                "910011": { current: 0.10, preClose: 0.15 }, // Normal Stage Box
                "920011": { current: 0.45, preClose: 0.80 }, // Boss Stage Box
                "930011": { current: 1.80, preClose: 3.20 }  // Act Boss Box
            }
        };

        this.priceMode = "current"; // "current" | "preClose"
    }

    /**
     * Alterna o modo de cotação de mercado
     * @param {"current"|"preClose"} mode
     */
    setPriceMode(mode) {
        this.priceMode = mode === "preClose" ? "preClose" : "current";
    }

    /**
     * Retorna o preço unitário de um item conforme seu tipo, tier e modo de preço
     * @param {Object} item - Objeto do item formatado
     * @returns {number} Preço unitário em BRL
     */
    getItemUnitPrice(item) {
        if (!item) return 0;

        const gradeKey = (item.grade || "COMMON").toUpperCase();
        
        // Itens Common / Uncommon têm valor de liquidação nulo
        if (gradeKey === "COMMON" || gradeKey === "UNCOMMON") {
            return 0;
        }

        const lookupKey = String(item.lookupKey || item.itemKey || "");
        if (this.MARKET_PRICE_TABLE.boxPrices[lookupKey]) {
            return this.MARKET_PRICE_TABLE.boxPrices[lookupKey][this.priceMode] || 0;
        }

        const tierPrices = this.MARKET_PRICE_TABLE.tierPrices[gradeKey];
        if (tierPrices) {
            let basePrice = tierPrices[this.priceMode] || 0;
            // Se for Chaotic, possui multiplicador de raridade de 1.25x
            if (item.isChaotic) {
                basePrice *= 1.25;
            }
            return Number(basePrice.toFixed(2));
        }

        return 0;
    }

    /**
     * Retorna a string formatada para exibição em tabelas
     * @param {Object} item
     * @returns {string} '—' ou 'R$ X,XX'
     */
    getItemPriceForTable(item) {
        const price = this.getItemUnitPrice(item);
        if (!price || price <= 0) return "—";
        return `R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    /**
     * Calcula o Stash Value completo cruzando todas as localizações de itens
     * @param {Object} parsedSaveData - Dados retornados pelo save_parser
     * @param {Object} [options] - Opções { priceSource: 'static' | 'market' | 'manual' }
     * @returns {Object} Resumo com valor total, contagens e divisão por local
     */
    calculateTotalStashValue(parsedSaveData, options = {}) {
        const priceSource = options.priceSource || "static";
        if (!parsedSaveData) {
            return {
                totalValue: 0,
                totalFormatted: "R$ 0,00",
                itemCount: 0,
                byLocation: { stash: 0, inventory: 0, tradeShip: 0 },
                byGrade: {},
                priceSource,
                fallbackCount: 0
            };
        }

        const stashItems = parsedSaveData.stash || [];
        const inventoryItems = parsedSaveData.inventory || [];
        const tradeShipItems = parsedSaveData.tradeShip || [];

        let totalValue = 0;
        let totalItems = 0;
        let fallbackCount = 0;
        const byLocation = { stash: 0, inventory: 0, tradeShip: 0 };
        const byGrade = {};

        const processList = (items, locKey) => {
            for (const it of items) {
                const qty = Number(it.quantity || it.count || 1);
                let unitPrice = 0;
                let usedFallback = false;

                if (priceSource === "market" || priceSource === "manual") {
                    const key = it.lookupKey || it.itemKey;
                    const meta = marketPrice.getMetadata(key);
                    if (meta.exists) {
                        const entry = marketPrice.cache[String(key)];
                        unitPrice = entry ? entry.gold : 0;
                    } else {
                        unitPrice = this.getItemUnitPrice(it);
                        usedFallback = true;
                        fallbackCount++;
                    }
                } else {
                    unitPrice = this.getItemUnitPrice(it);
                }

                const itemTotal = unitPrice * qty;

                totalValue += itemTotal;
                totalItems += qty;
                byLocation[locKey] += itemTotal;

                const gr = it.grade || "Common";
                byGrade[gr] = (byGrade[gr] || 0) + itemTotal;
            }
        };

        processList(stashItems, "stash");
        processList(inventoryItems, "inventory");
        processList(tradeShipItems, "tradeShip");

        return {
            totalValue: Number(totalValue.toFixed(2)),
            totalFormatted: `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            priceMode: this.priceMode,
            priceSource,
            fallbackCount,
            hasFallback: fallbackCount > 0,
            itemCount: totalItems,
            byLocation: {
                stash: Number(byLocation.stash.toFixed(2)),
                inventory: Number(byLocation.inventory.toFixed(2)),
                tradeShip: Number(byLocation.tradeShip.toFixed(2))
            },
            byGrade
        };
    }
}

export const stashValueEngine = new StashValueEngine();
export default stashValueEngine;
