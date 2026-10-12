/**
 * assets/js/farming_calculator.js
 * ToolTaskBarHero (TTBH) - Fase 10
 * Calculadora de farming (EXP/h, Gold/h, sugestão de stage por nível e runs necessárias).
 */

export class FarmingCalculator {
  constructor(tbhDb) {
    this.db = tbhDb || {};
    this.stages = (tbhDb && tbhDb.farmingStages) || (tbhDb && tbhDb.stages) || [];
  }

  /**
   * Helper para parsing de dificuldade e ordem
   */
  _diffWeight(diff) {
    const weights = { 'Normal': 1, 'Nightmare': 2, 'Hell': 3, 'Torment': 4 };
    return weights[diff] || 0;
  }

  _parseStageId(str) {
    if (!str) return null;
    const parts = str.trim().split(/\s+/);
    return {
      stage: parts[0],
      diff: parts[1] || 'Normal'
    };
  }

  _isHigherStage(stageObj, maxStageStr) {
    if (!maxStageStr) return false;
    const max = this._parseStageId(maxStageStr);
    if (!max) return false;

    const [actA, stgA] = (stageObj.stage || '1-1').split('-').map(Number);
    const [actM, stgM] = (max.stage || '1-1').split('-').map(Number);
    const diffA = this._diffWeight(stageObj.diff);
    const diffM = this._diffWeight(max.diff);

    if (diffA > diffM) return true;
    if (diffA < diffM) return false;
    if (actA > actM) return true;
    if (actA < actM) return false;
    return stgA > stgM;
  }

  /**
   * Retorna taxa horária para uma stage específica
   */
  hourlyRate(stageId, difficulty, clearTimeSec) {
    const stage = this.stages.find(s => s.stage === stageId && s.diff === difficulty);
    if (!stage) return null;

    if (!clearTimeSec || clearTimeSec <= 0) {
      return {
        stageId,
        difficulty,
        expPerHour: 0,
        goldPerHour: 0,
        expPerHP: stage.expPerHP || 0,
        status: 'OK'
      };
    }

    const runsPerHour = 3600 / clearTimeSec;
    const expPerHour = stage.expClear * runsPerHour;
    const goldPerHour = stage.goldClear * runsPerHour;

    return {
      stageId,
      difficulty,
      expClear: stage.expClear,
      goldClear: stage.goldClear,
      expPerHour,
      goldPerHour,
      expPerHP: stage.expPerHP,
      status: 'OK'
    };
  }

  /**
   * Retorna ranking de stages por EXP/hora ou Gold/hora
   * Se clearTimeSec não fornecido, usa densidade bruta (expPerHP) como proxy
   */
  rankStages(clearTimeSec, optimize = 'exp', maxStage = null, heroLevel = null) {
    const list = this.stages.filter(s => !this._isHigherStage(s, maxStage));

    return list.map(s => {
      let status = 'OK';
      let penaltyFactor = 1.0;

      if (heroLevel != null && heroLevel > 0) {
        if (heroLevel < s.lv - 10) {
          status = '⚠ PENALTY';
          penaltyFactor = 0.5; // EXP reduzido ~50%
        } else if (heroLevel > s.lv + 15) {
          status = '⚠ OVERLEVELED';
          penaltyFactor = 0.2; // EXP reduzido ~80%
        }
      }

      let expPerHour = 0;
      let goldPerHour = 0;
      let score = 0;

      if (clearTimeSec && clearTimeSec > 0) {
        const runsPerHour = 3600 / clearTimeSec;
        expPerHour = s.expClear * runsPerHour * (status !== 'OK' ? penaltyFactor : 1.0);
        goldPerHour = s.goldClear * runsPerHour;
        score = optimize === 'gold' ? goldPerHour : expPerHour;
      } else {
        // Sem tempo de clear informado, proxy por expPerHP
        score = (s.expPerHP || 0) * (status !== 'OK' ? penaltyFactor : 1.0);
      }

      return {
        stage: s.stage,
        diff: s.diff,
        name: s.name,
        lv: s.lv,
        expClear: s.expClear,
        goldClear: s.goldClear,
        expPerHour,
        goldPerHour,
        expPerHP: s.expPerHP,
        status,
        score
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Sugere a melhor stage dado o nível do herói e clear time
   */
  suggestFarmStage(heroLevel, clearTimeSec = 15, goal = 'exp') {
    const ranked = this.rankStages(clearTimeSec, goal, null, heroLevel);
    // Prioriza primeira sem penalidade, ou a melhor pontuação global
    const bestWithoutPenalty = ranked.find(r => r.status === 'OK');
    return bestWithoutPenalty || ranked[0] || null;
  }

  /**
   * Calcula quantas runs necessárias para X de EXP/Gold
   */
  runsToTarget(stageId, difficulty, targetExp = 0, targetGold = 0) {
    const stage = this.stages.find(s => s.stage === stageId && s.diff === difficulty);
    if (!stage) return null;

    const runsForExp = targetExp > 0 ? Math.ceil(targetExp / stage.expClear) : 0;
    const runsForGold = targetGold > 0 ? Math.ceil(targetGold / stage.goldClear) : 0;

    return {
      stageId,
      difficulty,
      targetExp,
      targetGold,
      runsForExp,
      runsForGold,
      maxRunsNeeded: Math.max(runsForExp, runsForGold)
    };
  }
}

export const farmingCalculator = {
  create: (db) => new FarmingCalculator(db)
};
