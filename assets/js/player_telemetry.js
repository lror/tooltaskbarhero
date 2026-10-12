/**
 * player_telemetry.js - Telemetria V2 e extração avançada de eventos do Player.log do Task Bar Hero
 */

export class PlayerTelemetry {
  constructor(logText) {
    this.logText = String(logText || '');
    this.extracted = null;
  }

  extract() {
    if (this.extracted) return this.extracted;

    const text = this.logText;

    // 1. Cooldowns: /\[CoolDown\]\s*(\d+(?:[.,]\d+)?)/g → normaliza ',' → '.'
    const cooldownsMs = [];
    const cdRegex = /\[CoolDown\]\s*(\d+(?:[.,]\d+)?)/g;
    let cdMatch;
    while ((cdMatch = cdRegex.exec(text)) !== null) {
      const numStr = cdMatch[1].replace(',', '.');
      const val = parseFloat(numStr);
      if (!Number.isNaN(val)) {
        cooldownsMs.push(val);
      }
    }

    // 2. WaitQueue: /\[WaitQueue\]\s*steamID=(\d+),\s*seed=(\d+),\s*waitMinutes=(\d+),\s*waitSeconds=(\d+),\s*endTime=([^\r\n\[]+)/
    let waitQueue = null;
    const wqRegex = /\[WaitQueue\]\s*steamID=(\d+),\s*seed=(\d+),\s*waitMinutes=(\d+),\s*waitSeconds=(\d+),\s*endTime=([^\r\n\[]+)/;
    const wqMatch = wqRegex.exec(text);
    if (wqMatch) {
      waitQueue = {
        steamID: wqMatch[1],
        seed: Number(wqMatch[2]),
        waitMinutes: Number(wqMatch[3]),
        waitSeconds: Number(wqMatch[4]),
        endTime: wqMatch[5].trim()
      };
    }

    // 3. Personal Seed: /\[PERSONAL SEED\]\s*(\d+)/
    let personalSeed = null;
    const psRegex = /\[PERSONAL SEED\]\s*(\d+)/;
    const psMatch = psRegex.exec(text);
    if (psMatch) {
      personalSeed = Number(psMatch[1]);
    }

    // 4. Client Build: /\[(\d+\.\d+\.\d+:\d+\+?)\]/
    let clientBuild = null;
    const cbRegex = /\[(\d+\.\d+\.\d+:[0-9+]+)\]/;
    const cbMatch = cbRegex.exec(text);
    if (cbMatch) {
      clientBuild = cbMatch[1];
    }

    // 5. Stuck Stage Key: /\[IsCanTryNormalBoss\] next Stage Not found Current Stage Key : (\d+)/
    let stuckStageKey = null;
    const stkRegex = /\[IsCanTryNormalBoss\] next Stage Not found Current Stage Key\s*:\s*(\d+)/;
    const stkMatch = stkRegex.exec(text);
    if (stkMatch) {
      stuckStageKey = Number(stkMatch[1]);
    }

    // 6. Save Write Events: contagem de 'bck:nez(String, String, ES3Settings'
    // Obs: toleramos variações de espaçamento ou bde:nnz
    const saveWriteRegex = /(?:bck:nez|bde:nnz)\s*\(\s*String,\s*String,\s*ES3Settings/g;
    const saveWriteMatches = text.match(saveWriteRegex);
    const saveWriteEvents = saveWriteMatches ? saveWriteMatches.length : 0;

    this.extracted = {
      cooldownsMs,
      waitQueue,
      personalSeed,
      clientBuild,
      stuckStageKey,
      saveWriteEvents
    };

    return this.extracted;
  }

  /**
   * Mediana dos ciclos de combate (ms)
   */
  medianCycleMs() {
    const data = this.extract();
    const arr = [...data.cooldownsMs];
    if (arr.length === 0) return 0;
    arr.sort((a, b) => a - b);
    const mid = Math.floor(arr.length / 2);
    if (arr.length % 2 === 0) {
      return (arr[mid - 1] + arr[mid]) / 2;
    }
    return arr[mid];
  }

  /**
   * Tempo restante da WaitQueue em ms (endTime formato 'YYYY-MM-DD HH:MM:SSZ' ou ISO → UTC)
   */
  waitQueueRemainingMs(now = Date.now()) {
    const data = this.extract();
    if (!data.waitQueue || !data.waitQueue.endTime) return 0;

    const rawEnd = data.waitQueue.endTime;
    // Substitui espaço por T se necessário para parse ISO confiável
    const isoString = rawEnd.includes('T') ? rawEnd : rawEnd.replace(' ', 'T');
    const endMs = new Date(isoString).getTime();
    if (Number.isNaN(endMs)) return 0;

    return Math.max(0, endMs - now);
  }

  /**
   * Sugestão de tempo de clear em segundos para a calculadora de farming
   */
  suggestClearTimeSec() {
    const median = this.medianCycleMs();
    return median > 0 ? median / 1000 : 0;
  }
}
