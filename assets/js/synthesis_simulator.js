/**
 * synthesis_simulator.js - Simulador de Síntese e Projeção de Custo para Task Bar Hero
 * Atualizado na Fase 10 com Cube EXP real por Grade (D1), Progressão de Nível de Cubo (D2),
 * e Projeção de Alquimia (D3).
 */

// D1 - Cube EXP por Grade oficial
const CUBE_EXP_PER_GRADE = {
  COMMON: 2,
  UNCOMMON: 6,
  RARE: 18,
  LEGENDARY: 54,
  IMMORTAL: 162,
  ARCANA: 518,
  BEYOND: 1658,
  CELESTIAL: 5803,
  DIVINE: 20311,
  COSMIC: 71089
};

// D2 - Checkpoints cumulativos de EXP do Cubo
const CUBE_EXP_CHECKPOINTS = [
  { level: 1, exp: 0 },
  { level: 5, exp: 405 },
  { level: 8, exp: 2255 },
  { level: 10, exp: 4955 },
  { level: 15, exp: 26805 },
  { level: 20, exp: 106055 },
  { level: 25, exp: 306305 },
  { level: 50, exp: 8832555 },
  { level: 75, exp: 61983805 },
  { level: 100, exp: 234760055 }
];

export class SynthesisSimulator {
  constructor(parsedData = {}, tbhDb = {}) {
    this.data = parsedData || {};
    this.db = tbhDb || {};
    this.synthesisTable = this.db.synthesis || {};
    this.multipliers = this.db.gradeMultipliers || {};
    this.cubeExpPerGrade = CUBE_EXP_PER_GRADE;
    this.cubeCheckpoints = CUBE_EXP_CHECKPOINTS;
    this.grades = this.db.grades || [
      'COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY',
      'IMMORTAL', 'ARCANA', 'BEYOND', 'CELESTIAL', 'DIVINE', 'COSMIC'
    ];
  }

  /**
   * Simula a síntese de um lote de itens ou chaves de itens
   * @param {Array} itemKeys - Lista de itens ou chaves a sintetizar
   * @param {string|null} targetGrade - Grade desejada (opcional)
   * @returns {Object}
   */
  simulateBatch(itemKeys = [], targetGrade = null) {
    const count = Array.isArray(itemKeys) ? itemKeys.length : (Number(itemKeys) || 0);
    let sampleGrade = 'COMMON';

    // Descobre a grade dos itens de entrada se forem objetos ou procura no inventário
    if (Array.isArray(itemKeys) && itemKeys.length > 0) {
      const first = itemKeys[0];
      if (typeof first === 'object' && first?.grade) {
        sampleGrade = String(first.grade).toUpperCase();
      } else if (this.data.inventory && Array.isArray(this.data.inventory)) {
        const found = this.data.inventory.find(it => it.itemKey == first || it.uniqueId == first);
        if (found && found.grade) sampleGrade = String(found.grade).toUpperCase();
      }
    }

    const fromGrade = sampleGrade;
    const fromIdx = this.grades.indexOf(fromGrade);
    const toGrade = targetGrade
      ? String(targetGrade).toUpperCase()
      : (fromIdx >= 0 && fromIdx < this.grades.length - 1 ? this.grades[fromIdx + 1] : fromGrade);

    return this.projectCost(count, fromGrade, toGrade);
  }

  /**
   * Retorna a melhor combinação ótima de itens do inventário para atingir targetGrade
   * @param {string} targetGrade - Grade alvo
   * @returns {Object}
   */
  optimizePath(targetGrade) {
    const target = String(targetGrade || 'UNCOMMON').toUpperCase();
    const inventory = (this.data && Array.isArray(this.data.inventory)) ? this.data.inventory : [];
    
    // Agrupa itens do inventário por grade
    const itemsByGrade = {};
    inventory.forEach(it => {
      const g = (it.grade || 'COMMON').toUpperCase();
      if (!itemsByGrade[g]) itemsByGrade[g] = [];
      itemsByGrade[g].push(it);
    });

    const targetIdx = this.grades.indexOf(target);
    const availableSteps = [];

    for (let i = 0; i < targetIdx; i++) {
      const currentG = this.grades[i];
      const nextG = this.grades[i + 1];
      const items = itemsByGrade[currentG] || [];
      const requiredPerBatch = (this.synthesisTable[currentG]?.amount) || 9;
      const possibleBatches = Math.floor(items.length / requiredPerBatch);

      availableSteps.push({
        fromGrade: currentG,
        toGrade: nextG,
        availableItems: items.length,
        requiredPerBatch,
        possibleBatches,
        expectedOutputs: possibleBatches,
      });
    }

    return {
      targetGrade: target,
      totalInventoryItems: inventory.length,
      steps: availableSteps,
      canReachDirectly: (itemsByGrade[target] || []).length > 0,
      existingInTarget: (itemsByGrade[target] || []).length
    };
  }

  /**
   * Retorna projeção matemática de custo, ganho de EXP do Cubo baseado no INPUT, e EV
   * @param {number} n - Quantidade de itens de entrada
   * @param {string} fromGrade - Grade de origem (input)
   * @param {string} toGrade - Grade alvo (output)
   * @returns {Object}
   */
  projectCost(n = 10, fromGrade = 'COMMON', toGrade = 'UNCOMMON') {
    const inputCount = Math.max(0, Number(n) || 0);
    const fromG = String(fromGrade || 'COMMON').toUpperCase();
    const toG = String(toGrade || 'UNCOMMON').toUpperCase();

    const fromIdx = this.grades.indexOf(fromG);
    const toIdx = this.grades.indexOf(toG);

    // Razão de síntese por estágio (padrão canônico 9 para 1 conforme TBH_DB.synthesis)
    let ratio = 1;
    if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx) {
      for (let i = fromIdx; i < toIdx; i++) {
        const stageG = this.grades[i];
        const req = (this.synthesisTable[stageG]?.amount) || 9;
        ratio *= req;
      }
    } else {
      ratio = (this.synthesisTable[fromG]?.amount) || 9;
    }

    const outputCount = ratio > 0 ? Number((inputCount / ratio).toFixed(2)) : 0;
    const successRate = 1.0;
    const successRateSource = 'assumed';

    // D1 - EXP de Cubo baseado no GRADE DO INPUT
    const inputUnitExp = this.cubeExpPerGrade[fromG] ?? (this.multipliers[fromG]?.cubeXp || 2);
    const cubeExpGained = inputCount * inputUnitExp;
    const expectedXp = cubeExpGained; // mantido por compatibilidade

    // Custo/Receita de ouro: valor de reciclagem/alquimia dos insumos vs produto
    const fromMult = this.multipliers[fromG] || { alchemyGold: 10 };
    const toMult = this.multipliers[toG] || { alchemyGold: 30 };

    const inputGoldValue = inputCount * (fromMult.alchemyGold || 10);
    const expectedOutputGold = Math.floor(outputCount * (toMult.alchemyGold || 30));
    const expectedGold = expectedOutputGold - inputGoldValue;

    // EV (Expected Value)
    const toUnitExp = this.cubeExpPerGrade[toG] ?? (toMult.cubeXp || 6);
    const ev = Number((outputCount * toUnitExp - cubeExpGained).toFixed(1));

    const netGold = expectedGold;
    const isViable = netGold >= 0;
    const absLoss = Math.abs(netGold).toLocaleString('pt-BR');
    const warning = !isViable
      ? `Síntese economicamente inviável: perde ${absLoss} G a cada ${inputCount} itens sintetizados.`
      : null;

    const economicViability = {
      netGold,
      isViable,
      warning
    };

    return {
      inputGrade: fromG,
      inputCount,
      outputGrade: toG,
      outputCount,
      cubeExpGained,
      expectedXp,
      expectedGold,
      successRate,
      successRateSource,
      ev,
      economicViability
    };
  }

  /**
   * 3.2 - Interpola nível de Cubo e progresso a partir do EXP total acumulado
   * @param {number} currentCubeExp
   * @returns {Object} { currentLevel, nextLevelExp, progressPct, levelsFromMax }
   */
  cubeLevelProgression(currentCubeExp = 0) {
    const exp = Math.max(0, Number(currentCubeExp) || 0);
    const checkpoints = this.cubeCheckpoints;

    // Se menor ou igual a 0
    if (exp <= 0) {
      return {
        currentLevel: 1,
        nextLevelExp: checkpoints[1].exp,
        progressPct: 0,
        levelsFromMax: 99
      };
    }

    // Se maior ou igual ao nível 100
    const maxCheckpoint = checkpoints[checkpoints.length - 1];
    if (exp >= maxCheckpoint.exp) {
      return {
        currentLevel: 100,
        nextLevelExp: maxCheckpoint.exp,
        progressPct: 100,
        levelsFromMax: 0
      };
    }

    // Localizar segmento nos checkpoints
    let low = checkpoints[0];
    let high = checkpoints[1];

    for (let i = 0; i < checkpoints.length - 1; i++) {
      if (exp >= checkpoints[i].exp && exp < checkpoints[i + 1].exp) {
        low = checkpoints[i];
        high = checkpoints[i + 1];
        break;
      }
    }

    // Interpolação linear entre checkpoints
    const levelRange = high.level - low.level;
    const expRange = high.exp - low.exp;
    const expIntoRange = exp - low.exp;
    const fraction = expRange > 0 ? (expIntoRange / expRange) : 0;

    const interpolatedLevel = Math.min(100, Math.floor(low.level + fraction * levelRange));
    const progressPct = Number((fraction * 100).toFixed(2));

    return {
      currentLevel: interpolatedLevel,
      nextLevelExp: high.exp,
      progressPct,
      levelsFromMax: Math.max(0, 100 - interpolatedLevel)
    };
  }

  /**
   * 3.3 - Projeção de alquimia para um conjunto de itens
   * @param {Array<{grade: string, count: number}>} items
   * @returns {Object} { totalGold, totalCubeExp, estimatedCubeLevels }
   */
  alchemyProjection(items = []) {
    let totalGold = 0;
    let totalCubeExp = 0;

    for (const entry of items) {
      const g = String(entry.grade || 'COMMON').toUpperCase();
      const count = Math.max(0, Number(entry.count) || 0);

      const gradeInfo = this.db.grades && this.db.grades[g];
      const goldPerItem = (gradeInfo && gradeInfo.alchemyGold)
        ?? (this.multipliers[g]?.alchemyGold)
        ?? (this.grades.indexOf(g) >= 0 ? this.grades.indexOf(g) * 50 : 50);

      const expPerItem = this.cubeExpPerGrade[g] || 2;

      totalGold += count * goldPerItem;
      totalCubeExp += count * expPerItem;
    }

    const progression = this.cubeLevelProgression(totalCubeExp);

    return {
      totalGold,
      totalCubeExp,
      estimatedCubeLevels: progression.currentLevel,
      progression
    };
  }
}

export const synthesisSimulator = {
  create: (data, db) => new SynthesisSimulator(data, db),
};
