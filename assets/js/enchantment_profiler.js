/**
 * [V1.1.0] Enchantment Profiler
 * Analisa distribuição de Tiers e detecta "Slots Mortos"
 */
export const EnchantmentProfiler = {
    analyze(parsedData) {
        const items = this.getAllItems(parsedData);
        
        return {
            tierDistribution: this.getTierDistribution(items),
            deadSlots: this.findDeadSlots(items),
            chaoticItems: this.countChaoticItems(items),
            enchantmentValue: this.calculateEnchantmentValue(items),
            recipeTypeDistribution: this.getRecipeTypeDistribution(items)
        };
    },

    getAllItems(parsedData) {
        if (!parsedData) return [];
        const items = [];
        
        // Formato 1: normalizado pelo SaveParser (allStorageItems, inventory, stash)
        const storageItems = parsedData.allStorageItems || parsedData.storage || [];
        storageItems.forEach(item => {
            if (item) items.push(item);
        });

        // Formato 2: heróis equipados
        const heroes = parsedData.heroes || [];
        heroes.forEach(h => {
            (h.equippedSlots || []).forEach(slot => {
                if (slot && !slot.isEmpty) items.push(slot);
            });
        });

        // Formato 3: raw JSON original de SaveFile_Live
        const rawItems = parsedData.PlayerSaveData?.itemSaveDatas || parsedData.raw?.itemSaveDatas || [];
        rawItems.forEach(item => {
            if (item) items.push(item);
        });
        
        return items;
    },

    getTierDistribution(items) {
        const tiers = { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
        
        items.forEach(item => {
            const enchants = item.EnchantData || item.detailedModifiers || item.decorationsList || item.engravingsList || item.inscriptionsList || [];
            enchants.forEach(enchant => {
                const t = enchant.Tier || enchant.tier;
                if (t >= 3 && t <= 8) {
                    tiers[t] = (tiers[t] || 0) + 1;
                }
            });
        });
        
        return tiers;
    },

    findDeadSlots(items) {
        // "Slot Morto" = Item de Tier alto (7-8+) com encantamento de Tier baixo (3-4)
        const deadSlots = [];
        
        items.forEach(item => {
            const itemTier = item.tier || this.extractItemTier(item.ItemKey || item.itemKey || item.id);
            if (itemTier >= 6) {
                const enchants = item.EnchantData || item.detailedModifiers || item.decorationsList || item.engravingsList || item.inscriptionsList || [];
                const lowTierEnchants = enchants.filter(e => {
                    const t = e.Tier || e.tier || 0;
                    return t > 0 && t <= 4;
                });

                if (lowTierEnchants.length > 0) {
                    deadSlots.push({
                        itemId: item.UniqueId || item.uniqueId || item.id,
                        name: item.name || 'Item',
                        itemTier: itemTier,
                        lowTierEnchants: lowTierEnchants.length,
                        wasteScore: lowTierEnchants.length * Math.max(1, itemTier - 4)
                    });
                }
            }
        });
        
        return deadSlots.sort((a, b) => b.wasteScore - a.wasteScore);
    },

    extractItemTier(itemKey) {
        const keyStr = String(itemKey || '');
        if (keyStr.length >= 3) {
            return parseInt(keyStr[2], 10) || 0;
        }
        return 0;
    },

    countChaoticItems(items) {
        return items.filter(item => item.IsChaotic === true || item.isChaotic === true || (item.name && item.name.includes('Caótico'))).length;
    },

    calculateEnchantmentValue(items) {
        let totalValue = 0;
        
        items.forEach(item => {
            const enchants = item.EnchantData || item.decorationsList || item.engravingsList || item.inscriptionsList || [];
            enchants.forEach(enchant => {
                const t = enchant.Tier || enchant.tier || 3;
                const tierValue = Math.pow(2, Math.max(0, t - 3)) * 1000;
                totalValue += tierValue;
            });
        });
        
        return totalValue;
    },

    getRecipeTypeDistribution(items) {
        const types = { 3: 0, 4: 0, 5: 0 };
        
        items.forEach(item => {
            const enchants = item.EnchantData || [];
            enchants.forEach(enchant => {
                const rType = enchant.RecipeType || enchant.recipeType;
                if (rType >= 3 && rType <= 5) {
                    types[rType]++;
                }
            });
            if (item.decorationsList) types[3] += item.decorationsList.length;
            if (item.engravingsList) types[4] += item.engravingsList.length;
            if (item.inscriptionsList) types[5] += item.inscriptionsList.length;
        });
        
        return {
            decorations: types[3],
            engravings: types[4],
            inscriptions: types[5]
        };
    }
};

if (typeof window !== 'undefined') {
    window.TTBH_EnchantmentProfiler = EnchantmentProfiler;
    window.EnchantmentProfiler = EnchantmentProfiler;
}
