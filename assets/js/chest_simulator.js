/**
 * assets/js/chest_simulator.js
 * ToolTaskBarHero (TTBH) - Fase 10
 * Simulador de abertura de baús (Chest Simulator) com RNG ponderado, probabilidades e EV.
 */

// PRNG determinístico Mulberry32
function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ChestSimulator {
  constructor(tbhDb) {
    this.db = tbhDb || {};
    this.chests = (tbhDb && tbhDb.chests) || {};
  }

  /**
   * Retorna a loot table de um box (dados D6)
   */
  getLootTable(boxId) {
    if (this.chests.lootTables && this.chests.lootTables[boxId]) {
      return this.chests.lootTables[boxId];
    }
    // Fallback genérico para Stage Boss Box 4
    if (this.chests.lootTables && this.chests.lootTables.stageBossBox4) {
      return this.chests.lootTables.stageBossBox4;
    }
    return [];
  }

  /**
   * Retorna drop chance por grade para um box (agrupado em %)
   */
  gradeProbabilities(boxId) {
    const table = this.getLootTable(boxId);
    const totalWeight = table.reduce((acc, cur) => acc + (cur.weight || 0), 0);
    const gradeMap = {};

    for (const item of table) {
      gradeMap[item.grade] = (gradeMap[item.grade] || 0) + item.weight;
    }

    const probabilities = {};
    for (const [grade, weight] of Object.entries(gradeMap)) {
      probabilities[grade] = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
    }

    return probabilities;
  }

  /**
   * Calcula quantas aberturas para 50% de chance de dropar um grade específico
   * Fórmula geométrica: ceil(ln(0.5) / ln(1 - p)) onde p = soma dos pesos do grade / 100
   */
  expectedRunsForGrade(boxId, grade) {
    const probs = this.gradeProbabilities(boxId);
    const pct = probs[grade] || 0;
    const p = pct / 100;

    if (p <= 0) return Infinity;
    if (p >= 1) return 1;

    return Math.ceil(Math.log(0.5) / Math.log(1 - p));
  }

  /**
   * Simula N aberturas de um box específico, retorna distribuição de drops
   */
  simulate(boxId, count = 100, seed = null) {
    const table = this.getLootTable(boxId);
    const rng = seed != null ? mulberry32(seed) : Math.random;

    const totalWeight = table.reduce((sum, entry) => sum + (entry.weight || 0), 0);
    const distribution = {};
    const itemDistribution = {};

    // Inicializar grades conhecidos
    for (const entry of table) {
      if (!distribution[entry.grade]) distribution[entry.grade] = 0;
    }

    for (let i = 0; i < count; i++) {
      let r = rng() * totalWeight;
      let selected = table[0];

      for (const entry of table) {
        if (r < entry.weight) {
          selected = entry;
          break;
        }
        r -= entry.weight;
      }

      distribution[selected.grade] = (distribution[selected.grade] || 0) + 1;
      const itemName = selected.item || `${selected.type} (${selected.grade})`;
      itemDistribution[itemName] = (itemDistribution[itemName] || 0) + 1;
    }

    const expectedProbs = this.gradeProbabilities(boxId);
    const comparison = {};

    for (const [grade, actualCount] of Object.entries(distribution)) {
      const actualPct = (actualCount / count) * 100;
      const expectedPct = expectedProbs[grade] || 0;
      comparison[grade] = {
        count: actualCount,
        actualPct,
        expectedPct,
        diffPct: actualPct - expectedPct
      };
    }

    return {
      boxId,
      totalCount: count,
      distribution,
      comparison,
      topItems: Object.entries(itemDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    };
  }

  /**
   * Compara dois boxes: qual tem melhor EV para um grade alvo
   */
  compareBoxes(boxIdA, boxIdB, targetGrade) {
    const probA = (this.gradeProbabilities(boxIdA)[targetGrade] || 0);
    const probB = (this.gradeProbabilities(boxIdB)[targetGrade] || 0);
    const runsA = this.expectedRunsForGrade(boxIdA, targetGrade);
    const runsB = this.expectedRunsForGrade(boxIdB, targetGrade);

    return {
      targetGrade,
      boxA: { id: boxIdA, probPct: probA, expectedRuns: runsA },
      boxB: { id: boxIdB, probPct: probB, expectedRuns: runsB },
      betterBox: probA >= probB ? boxIdA : boxIdB
    };
  }
}

export const chestSimulator = {
  create: (db) => new ChestSimulator(db)
};
