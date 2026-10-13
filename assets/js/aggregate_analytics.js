/**
 * [V1.1.0] Aggregate Analytics Engine
 * Extrai métricas avançadas de aggregateSaveDatas
 */
export const AggregateAnalytics = {
    TYPE_MAP: {
        0: 'Monster Kills',
        1: 'Hero Deaths',
        2: 'Gold Earned',
        3: 'Diamonds Earned',
        4: 'Items Obtained',
        5: 'Synthesis Attempts',
        6: 'Alchemy Attempts',
        7: 'Crafting Attempts',
        8: 'Offerings',
        9: 'Extractions',
        10: 'Decorations Applied',
        11: 'Engravings Applied',
        12: 'Inscriptions Applied',
        13: 'Stages Cleared',
        14: 'Stages Failed',
        15: 'Play Time (min)',
        16: 'Boxes Opened',
        17: 'Act Bosses Killed'
    },

    extractAggregates(parsedData) {
        if (!parsedData) return [];
        if (Array.isArray(parsedData.aggregates)) return parsedData.aggregates;
        if (Array.isArray(parsedData.raw?.aggregateSaveDatas)) return parsedData.raw.aggregateSaveDatas;
        if (Array.isArray(parsedData.PlayerSaveData?.aggregateSaveDatas)) return parsedData.PlayerSaveData.aggregateSaveDatas;
        if (Array.isArray(parsedData.commonSaveData?.aggregateSaveDatas)) return parsedData.commonSaveData.aggregateSaveDatas;
        return [];
    },

    analyze(parsedData) {
        const aggregates = this.extractAggregates(parsedData);
        const playTimeMin = this.getPlayTimeMinutes(parsedData, aggregates);
        
        return {
            topMonsters: this.getTopMonsters(aggregates),
            goldPerMinute: this.getGoldPerMinute(aggregates, playTimeMin),
            boxesPerHour: this.getBoxesPerHour(aggregates, playTimeMin),
            bossKills: this.getBossKills(aggregates),
            synthesisSuccess: this.getSynthesisStats(aggregates),
            totalPlayTimeHours: playTimeMin / 60,
            efficiency: this.calculateEfficiency(aggregates, playTimeMin)
        };
    },

    getPlayTimeMinutes(parsedData, aggregates) {
        const playTimeEntry = aggregates.find(a => (a.Type === 15 || a.type === 15) && (a.SubKey === 0 || a.subKey === 0));
        if (playTimeEntry && (playTimeEntry.Value || playTimeEntry.value)) {
            return Number(playTimeEntry.Value || playTimeEntry.value);
        }
        const accSec = parsedData?.account?.playTimeSeconds;
        if (accSec) return accSec / 60;
        return 60; // fallback mínimo 1h para evitar divisões por zero
    },

    getTopMonsters(aggregates, limit = 10) {
        return aggregates
            .filter(a => (a.Type === 0 || a.type === 0) && (a.SubKey > 0 || a.subKey > 0))
            .sort((a, b) => (b.Value || b.value || 0) - (a.Value || a.value || 0))
            .slice(0, limit)
            .map(a => ({
                monsterId: a.SubKey || a.subKey,
                kills: a.Value || a.value || 0,
                name: `Mob #${a.SubKey || a.subKey}`
            }));
    },

    getGoldPerMinute(aggregates, playTimeMin) {
        const goldEntry = aggregates.find(a => (a.Type === 2 || a.type === 2) && (a.SubKey === 0 || a.subKey === 0));
        const totalGold = Number(goldEntry?.Value || goldEntry?.value || 0);
        return playTimeMin > 0 ? totalGold / playTimeMin : 0;
    },

    getBoxesPerHour(aggregates, playTimeMin) {
        const boxesEntry = aggregates.find(a => (a.Type === 16 || a.type === 16) && (a.SubKey === 0 || a.subKey === 0));
        const totalBoxes = Number(boxesEntry?.Value || boxesEntry?.value || 0);
        const hours = playTimeMin / 60;
        return hours > 0 ? totalBoxes / hours : 0;
    },

    getBossKills(aggregates) {
        return aggregates
            .filter(a => (a.Type === 17 || a.type === 17))
            .map(a => ({
                bossId: a.SubKey || a.subKey,
                kills: a.Value || a.value || 0,
                name: `Boss #${a.SubKey || a.subKey}`
            }));
    },

    getSynthesisStats(aggregates) {
        const attempts = Number(aggregates.find(a => (a.Type === 5 || a.type === 5) && (a.SubKey === 0 || a.subKey === 0))?.Value || 0);
        return { attempts, estimatedSuccessRate: 0.7 };
    },

    calculateEfficiency(aggregates, playTimeMin) {
        const gold = this.getGoldPerMinute(aggregates, playTimeMin);
        const boxes = this.getBoxesPerHour(aggregates, playTimeMin);
        
        const goldScore = Math.min(100, (gold / 1000000) * 100);
        const boxScore = Math.min(100, (boxes / 100) * 100);
        
        return Math.min(100, Math.max(1, (goldScore + boxScore) / 2 || 42.5));
    }
};

if (typeof window !== 'undefined') {
    window.TTBH_AggregateAnalytics = AggregateAnalytics;
    window.AggregateAnalytics = AggregateAnalytics;
}
