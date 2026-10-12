/**
 * rune_planner.js - Planejador de Evolução e Otimizador da Árvore de Runas para Task Bar Hero
 */

export class RunePlanner {
  constructor(parsedData = {}, tbhDb = {}) {
    this.data = parsedData || {};
    this.db = tbhDb || {};
    this.allRunes = this.db.runes || {};
    this.runeLevels = this.db.runeLevels || {};
    this.runeNodes = this.db.runeNodes || {};

    // Mapeia runas do jogador vindo de RuneSaveData: { [id]: level }
    this.playerRunes = new Map();
    const rawList = Array.isArray(this.data.runes)
      ? this.data.runes
      : (this.data.raw?.RuneSaveData || this.data.raw?.runeSaveDatas || []);

    if (Array.isArray(rawList)) {
      rawList.forEach(r => {
        const id = String(r.Key !== undefined ? r.Key : (r.key !== undefined ? r.key : (r.Id || r.id)));
        const lvl = Number(r.Level !== undefined ? r.Level : (r.level !== undefined ? r.level : (r.Value || 1)));
        this.playerRunes.set(id, lvl);
      });
    }
  }

  /**
   * Custo para evoluir um nível específico de uma runa.
   * Utiliza exclusivamente a tabela catalogada TBH_DB.runeLevels[runeId][lvl].
   * @param {string|number} runeId
   * @param {number} level
   * @returns {number} custo em ouro
   */
  getLevelCost(runeId, level) {
    const rId = String(runeId);
    const lvlKey = String(level);

    if (this.runeLevels[rId] && this.runeLevels[rId][lvlKey]) {
      return Number(this.runeLevels[rId][lvlKey].cost || 0);
    }

    return 0;
  }

  /**
   * Para uma runa específica, retorna o custo total para atingir maxLevel
   * @param {string|number} runeId
   * @returns {Object} { runeId, name, currentLevel, maxLevel, remainingLevels, totalCost, isMaxed }
   */
  costToMax(runeId) {
    const id = String(runeId);
    const runeDef = this.allRunes[id];
    if (!runeDef) {
      return { runeId: id, name: 'Desconhecido', currentLevel: 0, maxLevel: 0, remainingLevels: 0, totalCost: 0, isMaxed: true };
    }

    const currentLevel = this.playerRunes.get(id) || 0;
    const maxLevel = Number(runeDef.max || 1);
    const remainingLevels = Math.max(0, maxLevel - currentLevel);
    let totalCost = 0;

    for (let l = currentLevel + 1; l <= maxLevel; l++) {
      totalCost += this.getLevelCost(id, l);
    }

    return {
      runeId: id,
      name: runeDef.name?.['pt-BR'] || runeDef.name?.['en-US'] || `Runa ${id}`,
      currentLevel,
      maxLevel,
      remainingLevels,
      totalCost,
      isMaxed: remainingLevels === 0
    };
  }

  /**
   * Retorna a árvore inteira com estados de cada nó: { unlocked, inProgress, locked }
   * @returns {Object} { totalRunes, unlockedCount, maxedCount, nodes: { [id]: nodeState } }
   */
  treeState() {
    const nodes = {};
    let unlockedCount = 0;
    let maxedCount = 0;
    const totalRunes = Object.keys(this.allRunes).length;

    for (const [id, def] of Object.entries(this.allRunes)) {
      const curLevel = this.playerRunes.get(id) || 0;
      const maxLevel = Number(def.max || 1);
      const prevReq = def.prevReq;

      // Verifica se o pré-requisito está cumprido
      let isParentSatisfied = true;
      if (prevReq !== null && prevReq !== undefined && Number(prevReq) !== 0) {
        const parentLevel = this.playerRunes.get(String(prevReq)) || 0;
        isParentSatisfied = parentLevel > 0;
      }

      let status = 'locked';
      if (curLevel >= maxLevel) {
        status = 'maxed';
        maxedCount++;
        unlockedCount++;
      } else if (curLevel > 0) {
        status = 'inProgress';
        unlockedCount++;
      } else if (isParentSatisfied) {
        status = 'available';
      }

      // Posição de renderização
      const nodePos = this.runeNodes[id] || { x: 0, y: 0 };

      nodes[id] = {
        id,
        name: def.name?.['pt-BR'] || def.name?.['en-US'] || `Runa ${id}`,
        icon: def.icon,
        currentLevel: curLevel,
        maxLevel,
        status,
        costNext: this.getLevelCost(id, curLevel + 1),
        costToMax: this.costToMax(id).totalCost,
        x: nodePos.x,
        y: nodePos.y,
        prevReq: def.prevReq,
        next: def.next
      };
    }

    return {
      totalRunes,
      unlockedCount,
      maxedCount,
      nodes
    };
  }

  /**
   * Recomenda os próximos N passos de upgrade da árvore
   * @param {number} steps
   * @returns {Object} { currentRunes, nextRecommended, costGold, costFragments, path }
   */
  planNext(steps = 5) {
    const state = this.treeState();
    const candidates = [];

    for (const [id, node] of Object.entries(state.nodes)) {
      if (node.status === 'inProgress' || node.status === 'available') {
        candidates.push({
          runeId: id,
          name: node.name,
          currentLevel: node.currentLevel,
          maxLevel: node.maxLevel,
          costGold: node.costNext,
          status: node.status,
          priority: node.status === 'inProgress' ? 2 : 1 // prioriza terminar nós em progresso
        });
      }
    }

    // Ordena por prioridade e menor custo em ouro
    candidates.sort((a, b) => b.priority - a.priority || a.costGold - b.costGold);
    const nextRecommended = candidates.slice(0, steps);
    const costGold = nextRecommended.reduce((acc, c) => acc + c.costGold, 0);

    return {
      currentRunes: state.unlockedCount,
      totalRunes: state.totalRunes,
      nextRecommended,
      costGold,
      costFragments: 0, // Fragmentos de runa reservados para futuras expansões
      path: nextRecommended.map(r => r.name)
    };
  }
}

export const runePlanner = {
  create: (data, db) => new RunePlanner(data, db),
};
