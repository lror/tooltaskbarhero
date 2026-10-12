/**
 * backup_timeline.js - Gestão e Linha do Tempo de Múltiplos Backups de Save do Task Bar Hero
 */

export class BackupTimeline {
  constructor(tbhDb = {}) {
    this.db = tbhDb || {};
    this.saves = []; // [{ name, timestamp, parsedData }]
  }

  /**
   * Adiciona um save à linha do tempo
   * @param {Object} save - { name, timestamp, parsedData }
   */
  addSave(save) {
    if (!save || !save.parsedData) return;

    let ts = save.timestamp;
    if (!ts) {
      if (save.parsedData?.meta?.savedAtUnixMs) {
        ts = Number(save.parsedData.meta.savedAtUnixMs);
      } else {
        // Tenta extrair timestamp do nome (ex: SaveFile_Live_backup_20261010_100000.es3)
        const m = String(save.name || '').match(/(\d{8})_(\d{6})/);
        if (m) {
          const d = m[1];
          const t = m[2];
          ts = new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}Z`).getTime();
        } else {
          ts = Date.now();
        }
      }
    } else if (typeof ts === 'string') {
      ts = new Date(ts).getTime();
    }

    this.saves.push({
      name: save.name || 'Save Snapshot',
      timestamp: ts,
      parsedData: save.parsedData
    });

    // Mantém ordenado cronologicamente
    this.saves.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Limpa todos os saves da timeline
   */
  clear() {
    this.saves = [];
  }

  /**
   * Retorna série temporal: [{ name, timestamp, formattedDate, gold, cubeLevel, stage, power, itemCount }]
   * @returns {Array}
   */
  getSeries() {
    return this.saves.map(s => {
      const p = s.parsedData || {};
      const currencies = p.currencies || {};
      const cube = p.cube || {};
      const acc = p.account || {};
      const heroes = p.heroes || [];
      const mainHero = heroes.length > 0 ? heroes[0] : null;

      // Extrai ou estima POWER
      let powerScore = 0;
      if (mainHero) {
        powerScore = Number(mainHero.HeroLevel || mainHero.level || 1) * 10;
      }

      // Conta total de itens
      const itemCount = (p.allStorageItems && p.allStorageItems.length) ||
        ((p.inventory?.length || 0) + (p.stash?.length || 0) + (p.tradeShip?.length || 0));

      const dt = new Date(s.timestamp);
      const formattedDate = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR');

      return {
        name: s.name,
        timestamp: s.timestamp,
        formattedDate,
        gold: Number(currencies.gold || 0),
        cubeLevel: Number(cube.level || 1),
        stage: Number(acc.currentStageKey || acc.currentStageInfo?.stageKey || 0),
        stageFormatted: acc.currentStageFormatted || 'Estágio 0',
        power: powerScore,
        itemCount
      };
    });
  }

  /**
   * Retorna diffs consecutivos entre snapshots da linha do tempo
   * @returns {Array} [{ from, to, timeDelta, deltaGold, deltaCube, deltaStage, deltaItems }]
   */
  getDiffs() {
    const series = this.getSeries();
    if (series.length < 2) return [];

    const diffs = [];
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1];
      const cur = series[i];

      diffs.push({
        from: prev.name,
        to: cur.name,
        fromTimestamp: prev.timestamp,
        toTimestamp: cur.timestamp,
        timeDeltaFormatted: this.formatTimeDiff(cur.timestamp - prev.timestamp),
        deltaGold: cur.gold - prev.gold,
        deltaCube: cur.cubeLevel - prev.cubeLevel,
        deltaStage: cur.stage - prev.stage,
        deltaItems: cur.itemCount - prev.itemCount
      });
    }

    return diffs;
  }

  formatTimeDiff(ms) {
    if (ms <= 0) return '0s';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${totalSecs % 60}s`;
  }
}

export const backupTimeline = new BackupTimeline();
