/**
 * assets/js/chest_optimizer.js
 * ToolTaskBarHero (TTBH) - Release Candidate v1.0.0
 * Chest Optimizer / Drop Finder: Cálculo de EV (Expected Value) em Ouro,
 * Sugestão do Melhor Baú para o Estado do Jogador, Drop Finder e Simulação Monte Carlo.
 * 100% Client-Side.
 */

import { marketPrice } from './market_price.js';
import { stashValueEngine } from './stash_value.js';

// Multiplicadores base de valor por grade para cálculo de EV de itens
const GRADE_VALUE_ESTIMATES = {
  COMMON: 10,
  UNCOMMON: 30,
  RARE: 120,
  LEGENDARY: 600,
  IMMORTAL: 3500,
  ARCANA: 18000,
  BEYOND: 75000,
  CELESTIAL: 280000,
  DIVINE: 950000,
  COSMIC: 3500000
};

export class ChestOptimizer {
  constructor(tbhDb = {}, priceService = marketPrice, stashService = stashValueEngine) {
    this.db = tbhDb || {};
    this.marketPrice = priceService;
    this.stashValue = stashService;
    this.chests = this._initChestCatalog();
  }

  _initChestCatalog() {
    const defaultCatalog = {
      "stageBossBox4": {
        name: "Stage Boss Box 4 (Lv40+)",
        stage: "1-9 Nightmare+",
        minLevel: 40,
        cost: { gold: 2500, gems: 0 },
        dropTable: [
          { itemKey: "301011", name: "Espada de Aço", grade: "RARE", weight: 0.169, minQty: 1, maxQty: 1 },
          { itemKey: "301012", name: "Elmo de Bronze", grade: "RARE", weight: 0.169, minQty: 1, maxQty: 1 },
          { itemKey: "300001", name: "Espada Básica", grade: "COMMON", weight: 0.300, minQty: 1, maxQty: 1 },
          { itemKey: "301021", name: "Escudo Reforçado", grade: "UNCOMMON", weight: 0.505, minQty: 1, maxQty: 1 },
          { itemKey: "304011", name: "Lâmina Glacial", grade: "LEGENDARY", weight: 0.020, minQty: 1, maxQty: 1 },
          { itemKey: "305041", name: "Alma Ancestral", grade: "IMMORTAL", weight: 0.005, minQty: 1, maxQty: 1 }
        ]
      },
      "stageBossBox3": {
        name: "Stage Boss Box 3 (Lv20+)",
        stage: "2-8 Normal",
        minLevel: 20,
        cost: { gold: 1200, gems: 0 },
        dropTable: [
          { itemKey: "301011", name: "Espada de Aço", grade: "RARE", weight: 0.10, minQty: 1, maxQty: 1 },
          { itemKey: "300001", name: "Espada Básica", grade: "COMMON", weight: 0.45, minQty: 1, maxQty: 1 },
          { itemKey: "301021", name: "Escudo Reforçado", grade: "UNCOMMON", weight: 0.44, minQty: 1, maxQty: 1 },
          { itemKey: "304011", name: "Lâmina Glacial", grade: "LEGENDARY", weight: 0.01, minQty: 1, maxQty: 1 }
        ]
      },
      "stageBossBox2": {
        name: "Stage Boss Box 2 (Lv15+)",
        stage: "2-3 Normal",
        minLevel: 15,
        cost: { gold: 600, gems: 0 },
        dropTable: [
          { itemKey: "300001", name: "Espada Básica", grade: "COMMON", weight: 0.60, minQty: 1, maxQty: 1 },
          { itemKey: "301021", name: "Escudo de Madeira", grade: "UNCOMMON", weight: 0.35, minQty: 1, maxQty: 1 },
          { itemKey: "301011", name: "Espada Rara", grade: "RARE", weight: 0.05, minQty: 1, maxQty: 1 }
        ]
      },
      "stageBossBox1": {
        name: "Stage Boss Box 1 (Lv1+)",
        stage: "1-1 Normal",
        minLevel: 1,
        cost: { gold: 150, gems: 0 },
        dropTable: [
          { itemKey: "300001", name: "Espada Básica", grade: "COMMON", weight: 0.85, minQty: 1, maxQty: 1 },
          { itemKey: "301021", name: "Escudo de Madeira", grade: "UNCOMMON", weight: 0.15, minQty: 1, maxQty: 1 }
        ]
      },
      "normalMonsterBox1": {
        name: "Normal Monster Box 1",
        stage: "1-1 a 1-8 Normal",
        minLevel: 1,
        cost: { gold: 50, gems: 0 },
        dropTable: [
          { itemKey: "300001", name: "Sucata de Ferro", grade: "COMMON", weight: 0.95, minQty: 1, maxQty: 1 },
          { itemKey: "301021", name: "Fragmento", grade: "UNCOMMON", weight: 0.05, minQty: 1, maxQty: 1 }
        ]
      },
      "chest_stage_4309": {
        name: "Stage 4309 Torment Chest",
        stage: "3-9 Torment (Lv 95)",
        minLevel: 80,
        cost: { gold: 5000, gems: 0 },
        dropTable: [
          { itemKey: "305041", name: "Armadura do Abismo", grade: "IMMORTAL", weight: 0.045, minQty: 1, maxQty: 1 },
          { itemKey: "304011", name: "Lâmina Corrompida", grade: "LEGENDARY", weight: 0.185, minQty: 1, maxQty: 1 },
          { itemKey: "301011", name: "Relíquia Sombria", grade: "RARE", weight: 0.350, minQty: 1, maxQty: 2 },
          { itemKey: "301021", name: "Essência Obscura", grade: "UNCOMMON", weight: 0.420, minQty: 2, maxQty: 5 }
        ]
      }
    };

    if (this.db.chests && typeof this.db.chests === 'object') {
      return { ...defaultCatalog, ...this.db.chests };
    }
    return defaultCatalog;
  }

  /**
   * Retorna EV (Expected Value) em ouro de abrir N baús
   * @param {string} chestId
   * @param {number} count
   * @returns {{chestId: string, name: string, count: number, totalExpectedGold: number, unitEV: number, costGold: number, netEV: number}}
   */
  expectedValue(chestId, count = 1) {
    const box = this.chests[chestId] || this.chests["stageBossBox4"];
    if (!box) {
      return { chestId, name: "Desconhecido", count, totalExpectedGold: 0, unitEV: 0, costGold: 0, netEV: 0 };
    }

    let unitEV = 0;
    const table = box.dropTable || [];

    for (const drop of table) {
      const avgQty = ((drop.minQty || 1) + (drop.maxQty || 1)) / 2;
      const weight = drop.weight || 0;
      
      // Checa preço no MarketPrice ou valor por grade
      const cached = this.marketPrice.cache[String(drop.itemKey)];
      let unitGold = cached ? cached.gold : (GRADE_VALUE_ESTIMATES[drop.grade] || 100);

      unitEV += weight * avgQty * unitGold;
    }

    const costPerOpen = (box.cost && box.cost.gold) || 0;
    const totalExpectedGold = Number((unitEV * count).toFixed(2));
    const totalCost = costPerOpen * count;
    const netEV = Number((totalExpectedGold - totalCost).toFixed(2));

    return {
      chestId,
      name: box.name,
      count,
      unitEV: Number(unitEV.toFixed(2)),
      costGold: totalCost,
      totalExpectedGold,
      netEV,
      isProfitable: netEV > 0
    };
  }

  /**
   * Sugere o melhor baú a abrir com base no estado do jogador e BiS
   * @param {Object} playerState - Dados parseados do save
   * @returns {Array<{chestId: string, name: string, ev: number, netEV: number, reason: string, confidence: string}>}
   */
  suggestBestChest(playerState = {}) {
    const ranking = [];
    const heroLevel = (playerState.heroes && playerState.heroes[0]?.level) || 35;
    const currentGold = (playerState.currencies && playerState.currencies.gold) || 0;

    for (const [id, box] of Object.entries(this.chests)) {
      const evData = this.expectedValue(id, 1);
      let reason = 'Alto EV líquido em ouro';
      let confidence = 'high';

      if (box.minLevel && heroLevel < box.minLevel) {
        reason = `Requer nível ${box.minLevel} (Herói atual: Lv ${heroLevel})`;
        confidence = 'low';
      } else if (evData.costGold > currentGold) {
        reason = `Custo (${evData.costGold} G) excede reserva disponível (${currentGold} G)`;
        confidence = 'medium';
      } else if (id.includes('4309') || id.includes('Box4')) {
        reason = 'Maior densidade de drops Rare/Immortal para upgrades BiS';
      }

      ranking.push({
        chestId: id,
        name: box.name,
        ev: evData.unitEV,
        netEV: evData.netEV,
        cost: evData.costGold,
        reason,
        confidence
      });
    }

    return ranking.sort((a, b) => b.netEV - a.netEV);
  }

  /**
   * Drop Finder: dado um item alvo, indica o melhor baú para obtê-lo
   * @param {string|number} targetItemKey
   * @returns {{found: boolean, targetItemKey: string, bestChestId: string, bestChestName: string, dropChancePct: number, reason: string}}
   */
  findBestSource(targetItemKey) {
    const target = String(targetItemKey || '');
    let best = null;
    let maxWeight = 0;

    for (const [id, box] of Object.entries(this.chests)) {
      const drop = (box.dropTable || []).find(d => String(d.itemKey) === target);
      if (drop && drop.weight > maxWeight) {
        maxWeight = drop.weight;
        best = {
          chestId: id,
          chestName: box.name,
          weight: drop.weight,
          grade: drop.grade
        };
      }
    }

    if (best) {
      return {
        found: true,
        targetItemKey: target,
        bestChestId: best.chestId,
        bestChestName: best.chestName,
        dropChancePct: Number((best.weight * 100).toFixed(2)),
        reason: `${(best.weight * 100).toFixed(1)}% de chance em ${best.chestName}`
      };
    }

    // Fallback heurístico por Stage-Tier
    return {
      found: false,
      targetItemKey: target,
      bestChestId: "stageBossBox4",
      bestChestName: "Stage Boss Box 4 (Lv40+)",
      dropChancePct: 2.5,
      reason: "⚠ AMBÍGUO — Heurística Stage Boss Box 4 (~2.5% de chance estimada)"
    };
  }

  /**
   * Simulação Monte Carlo para N aberturas de um baú
   * @param {string} chestId
   * @param {number} runs
   */
  simulateMonteCarlo(chestId, runs = 100) {
    const box = this.chests[chestId] || this.chests["stageBossBox4"];
    const table = (box && box.dropTable) || [];
    const totalWeight = table.reduce((sum, d) => sum + (d.weight || 0), 0);
    const dropCounts = {};
    let totalSimulatedGold = 0;

    for (let i = 0; i < runs; i++) {
      let r = Math.random() * (totalWeight || 1);
      let selected = table[0];
      for (const drop of table) {
        if (r < drop.weight) {
          selected = drop;
          break;
        }
        r -= drop.weight;
      }

      if (selected) {
        dropCounts[selected.name] = (dropCounts[selected.name] || 0) + 1;
        const cached = this.marketPrice.cache[String(selected.itemKey)];
        const gold = cached ? cached.gold : (GRADE_VALUE_ESTIMATES[selected.grade] || 100);
        totalSimulatedGold += gold;
      }
    }

    const cost = (box && box.cost && box.cost.gold ? box.cost.gold : 0) * runs;
    return {
      chestId,
      chestName: box.name,
      runs,
      totalCost: cost,
      totalSimulatedGold,
      netGold: totalSimulatedGold - cost,
      distribution: dropCounts
    };
  }
}

export const chestOptimizer = new ChestOptimizer();
