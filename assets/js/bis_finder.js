/**
 * bis_finder.js - Best-in-Slot Finder para os 6 Heróis do Task Bar Hero
 */

import { chestOptimizer } from './chest_optimizer.js';

export class BiSFinder {
  constructor(parsedData = {}, tbhDb = {}) {
    this.data = parsedData || {};
    this.db = tbhDb || {};
    this.heroes = this.data.heroes || [];
    this.cubeLevel = this.data.cube?.level || 1;
    this.gradeMultipliers = this.db.gradeMultipliers || {};
    this.gearTypes = this.db.gearTypes || {};
    this.dbHeroes = this.db.heroes || {};

    // Coleta todos os itens do jogador (inventário, stash e tradeShip)
    this.pool = [
      ...(this.data.inventory || []),
      ...(this.data.stash || []),
      ...(this.data.tradeShip || []),
      ...(this.data.allStorageItems || [])
    ];

    // Remove duplicatas por uniqueId
    const seen = new Set();
    this.allItems = [];
    for (const it of this.pool) {
      const uid = it.uniqueId ? String(it.uniqueId) : String(it.itemKey);
      if (!seen.has(uid)) {
        seen.add(uid);
        this.allItems.push(it);
      }
    }
  }

  /**
   * Mapeia os slots de 0 a 9 para os tipos de gear esperados por herói
   */
  getSlotGearType(heroKey, slotIndex) {
    const heroDef = this.dbHeroes[String(heroKey)] || {};
    switch (slotIndex) {
      case 0: return heroDef.mainW || 'SWORD';
      case 1: return heroDef.subW || 'SHIELD';
      case 2: return 'HELMET';
      case 3: return 'ARMOR';
      case 4: return 'GLOVES';
      case 5: return 'BOOTS';
      case 6: return 'AMULET';
      case 7: return 'EARRING';
      case 8: return 'RING';
      case 9: return 'BRACELET';
      default: return 'UNKNOWN';
    }
  }

  /**
   * Lógica de scoring por slot
   * - gradeMultipliers[grade] (peso 40%)
   * - Nível do item × pesos de atributo do slot (peso 30%)
   * - isChaotic (peso 15%) — Chaotic × 1.25 no score
   * - Matching de tipo (peso 15%)
   */
  calculateItemScore(item, expectedType) {
    if (!item) return 0;

    // 1. Excluir se bloqueado
    if (item.isBlocked) return 0;

    // 2. Excluir se nível > cubeLevel + 10 (candidato à Alquimia)
    const itemLevel = Number(item.level) || 1;
    if (itemLevel > this.cubeLevel + 10) return 0;

    // 3. Matching de tipo (peso 15%)
    const rawType = (item.type || '').toUpperCase();
    const expType = (expectedType || '').toUpperCase();
    const isMatching = rawType === expType || rawType.includes(expType) || expType.includes(rawType);
    const typeMatchScore = isMatching ? 100 : 0;

    // 4. Grade Multiplier (peso 40%)
    const grade = (item.grade || 'COMMON').toUpperCase();
    const gMult = this.gradeMultipliers[grade];
    // Base pontuação por grade (COMMON=10, COSMIC=1000)
    const gradeScore = gMult ? (Math.log10(gMult.alchemyGold || 10) * 35) : 20;

    // 5. Nível × atributos (peso 30%)
    const levelScore = Math.min(100, itemLevel * 1.5);

    // 6. Chaotic (peso 15%)
    const isChaotic = !!(item.isChaotic || item.IsChaotic);
    const chaoticScore = isChaotic ? 100 : 30;

    // Pontuação ponderada base
    let totalScore = (gradeScore * 0.40) + (levelScore * 0.30) + (chaoticScore * 0.15) + (typeMatchScore * 0.15);

    // Bônus multiplicador caótico
    if (isChaotic) {
      totalScore *= 1.25;
    }

    return Number(totalScore.toFixed(2));
  }

  /**
   * Para um herói específico, retorna os melhores itens por slot
   * @param {number|string} heroId
   * @returns {Object} { [slotId]: { slotName, currentItem, bestItem, upgradeValue, reason } }
   */
  suggestForHero(heroId) {
    const heroKey = String(heroId);
    const hero = this.heroes.find(h => String(h.heroKey) === heroKey || String(h.id) === heroKey) || (this.heroes[0] || null);
    const result = {};

    const slotNames = [
      'Arma Principal', 'Arma Secundária', 'Capacete', 'Armadura',
      'Luvas', 'Botas', 'Amuleto', 'Brinco', 'Anel', 'Braçadeira'
    ];

    for (let slotIdx = 0; slotIdx < 10; slotIdx++) {
      const slotName = slotNames[slotIdx];
      const expectedType = this.getSlotGearType(heroKey, slotIdx);

      // Item atualmente equipado
      const currentEquipped = (hero && hero.equippedSlots) ? hero.equippedSlots[slotIdx] : null;
      const currentScore = currentEquipped ? this.calculateItemScore(currentEquipped, expectedType) : 0;

      // Busca o melhor item no pool elegível
      let bestItem = currentEquipped;
      let bestScore = currentScore;

      for (const cand of this.allItems) {
        // Verifica se o item é do tipo compatível
        const candType = (cand.type || '').toUpperCase();
        const expType = expectedType.toUpperCase();
        if (candType !== expType && !candType.includes(expType) && !expType.includes(candType)) {
          continue;
        }

        const score = this.calculateItemScore(cand, expectedType);
        if (score > bestScore) {
          bestScore = score;
          bestItem = cand;
        }
      }

      const upgradeValue = Number((bestScore - currentScore).toFixed(2));
      let reason = 'Slot ótimo';
      if (upgradeValue > 0) {
        reason = `+${upgradeValue} pts de poder (${bestItem.grade || 'Item'} Lv.${bestItem.level})`;
      } else if (!currentEquipped) {
        reason = 'Slot vazio';
      }

      // Cruzamento com Chest Optimizer (Drop Finder) para sugerir melhor fonte
      const targetItemKey = bestItem ? (bestItem.lookupKey || bestItem.itemKey) : (currentEquipped ? (currentEquipped.lookupKey || currentEquipped.itemKey) : null);
      const dropSource = targetItemKey ? chestOptimizer.findBestSource(targetItemKey) : { found: false, reason: 'Sem item alvo' };

      result[slotIdx] = {
        slotIndex: slotIdx,
        slotName,
        expectedType,
        currentScore,
        bestScore,
        currentItem: currentEquipped,
        bestItem,
        upgradeValue,
        reason,
        dropSource: dropSource.reason || 'Desconhecido',
        dropSourceDetail: dropSource
      };
    }

    return result;
  }

  /**
   * Para todos os 6 heróis, retorna um mapa consolidado
   * @returns {Object} { [heroKey]: { heroName, slots: { ... } } }
   */
  suggestAllHeroes() {
    const consolidated = {};
    const heroKeys = ['101', '201', '301', '401', '501', '601'];

    for (const key of heroKeys) {
      const heroDef = this.dbHeroes[key] || {};
      consolidated[key] = {
        heroKey: key,
        heroName: heroDef.name?.['pt-BR'] || heroDef.name?.['en-US'] || `Herói ${key}`,
        slots: this.suggestForHero(key)
      };
    }

    return consolidated;
  }

  /**
   * Retorna top-N itens do inventário que NÃO estão equipados e dão o maior ganho de POWER
   * @param {number} n
   * @returns {Array}
   */
  findTopUpgrades(n = 10) {
    const allSuggestions = this.suggestAllHeroes();
    const upgrades = [];

    for (const [heroKey, data] of Object.entries(allSuggestions)) {
      for (const [slotId, slotData] of Object.entries(data.slots)) {
        if (slotData.upgradeValue > 0 && slotData.bestItem) {
          upgrades.push({
            heroKey,
            heroName: data.heroName,
            slotIndex: slotData.slotIndex,
            slotName: slotData.slotName,
            bestItem: slotData.bestItem,
            currentItem: slotData.currentItem,
            upgradeValue: slotData.upgradeValue,
            reason: slotData.reason
          });
        }
      }
    }

    return upgrades
      .sort((a, b) => b.upgradeValue - a.upgradeValue)
      .slice(0, n);
  }
}

export const bisFinder = {
  create: (data, db) => new BiSFinder(data, db),
};
