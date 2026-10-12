import fs from 'fs';
import { SaveParser, safeParseJSON, netTicksToUnixMs, sanitizeInt64V2 } from '../assets/js/save_parser.js';
import { StatisticsEngine } from '../assets/js/statistics_engine.js';
import { stashValueEngine } from '../assets/js/stash_value.js';
import { bisFinder } from '../assets/js/bis_finder.js';
import { runePlanner } from '../assets/js/rune_planner.js';
import { synthesisSimulator } from '../assets/js/synthesis_simulator.js';
import { logParser } from '../assets/js/log_parser.js';
import { backupTimeline } from '../assets/js/backup_timeline.js';
import { farmingCalculator } from '../assets/js/farming_calculator.js';
import { chestSimulator } from '../assets/js/chest_simulator.js';
import { marketPrice } from '../assets/js/market_price.js';
import { chestOptimizer } from '../assets/js/chest_optimizer.js';
import { PlayerTelemetry } from '../assets/js/player_telemetry.js';
import TBH_DB from '../assets/js/gamedata.js';

const results = [];
let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASSED' });
    passed++;
  } catch (err) {
    results.push({ name, status: 'FAILED', error: err.message });
    failed++;
  }
}

// 1. Criação do Save Demo Sintético
const demoSave = {
  account: {
    version: '1.02.01',
    ownerSteamId: '76561198859674725',
    playTimeSeconds: 36000,
    playTimeFormatted: '10h',
    currentStageKey: 1101,
    currentStageFormatted: 'Ato 1 - 1-1 Normal',
    maxCompletedStage: 1105
  },
  currencies: {
    gold: 150000,
    goldFormatted: '150.0K'
  },
  cube: {
    level: 10,
    exp: 250
  },
  heroes: [
    {
      heroKey: 101,
      name: 'Cavaleiro',
      cls: 'Knight',
      level: 15,
      equippedSlots: [
        { itemKey: 300001, name: 'Espada de Ferro', type: 'SWORD', grade: 'COMMON', level: 10, tier: 1 },
        { itemKey: 300002, name: 'Escudo de Madeira', type: 'SHIELD', grade: 'COMMON', level: 10, tier: 1 }
      ]
    }
  ],
  inventory: [
    { itemKey: 301011, uniqueId: '1001', name: 'Espada de Aço', type: 'SWORD', grade: 'RARE', level: 12, tier: 2 },
    { itemKey: 301012, uniqueId: '1002', name: 'Escudo Reforçado', type: 'SHIELD', grade: 'UNCOMMON', level: 11, tier: 1 },
    { itemKey: 920052, uniqueId: '1003', name: 'Baú Raro', type: 'CHEST', grade: 'RARE', level: 1, tier: 2 },
    { itemKey: 300005, uniqueId: '1004', name: 'Elmo de Couro', type: 'HELMET', grade: 'COMMON', level: 8, tier: 1 },
    { itemKey: 300006, uniqueId: '1005', name: 'Armadura Básica', type: 'ARMOR', grade: 'COMMON', level: 9, tier: 1 }
  ],
  stash: [],
  tradeShip: [],
  allStorageItems: [],
  runes: [
    { key: 1, level: 1 },
    { key: 10, level: 2 },
    { key: 415, level: 1 }
  ],
  raw: {
    aggregateSaveDatas: [
      { Type: 0, SubKey: 1, Value: 500, Content: 0 },
      { Type: 1, SubKey: 0, Value: 12, Content: 0 },
      { Type: 13, SubKey: 1101, Value: 25, Content: 1 }
    ]
  }
};

demoSave.allStorageItems = [...demoSave.inventory];

// 2. Testes de Cada Módulo
runTest('SaveParser Schema & Storage Decode', () => {
  const parser = new SaveParser();
  const decoded = parser.decodeItemKey(301011, { uniqueId: '1001' });
  if (decoded.itemKey !== '301011') throw new Error('SaveParser decode failed');
});

runTest('StatisticsEngine & POWER Score', () => {
  const stats = new StatisticsEngine();
  const power = stats.calculatePOWER(demoSave.heroes[0], { runeBonus: 10, petBonus: 5 });
  if (typeof power.score !== 'number' || power.score < 0) throw new Error('Invalid POWER calculation');
});

runTest('Stash Value Engine', () => {
  const val = stashValueEngine.calculateTotalStashValue(demoSave);
  if (!val.totalFormatted) throw new Error('Stash value formatting failed');
});

runTest('BiS Finder Engine', () => {
  const finder = bisFinder.create(demoSave, TBH_DB);
  const heroBis = finder.suggestForHero('101');
  if (!heroBis || !heroBis[0]) throw new Error('BiS finder failed to suggest for slot 0');
  const topUpgrades = finder.findTopUpgrades(5);
  if (!Array.isArray(topUpgrades)) throw new Error('findTopUpgrades returned non-array');
});

runTest('Rune Planner Engine', () => {
  const planner = runePlanner.create(demoSave, TBH_DB);
  const state = planner.treeState();
  if (Object.keys(state.nodes).length !== 248) throw new Error('Rune tree state node count != 248');
  const plan = planner.planNext(3);
  if (!plan.nextRecommended || plan.nextRecommended.length === 0) throw new Error('planNext returned empty recommendation');
});

runTest('Synthesis Simulator with Guardrails', () => {
  const sim = synthesisSimulator.create(demoSave, TBH_DB);
  const res = sim.projectCost(10, 'COMMON', 'UNCOMMON');
  if (res.economicViability === undefined) throw new Error('economicViability is missing');
  if (res.successRateSource !== 'assumed') throw new Error('successRateSource is invalid');
});

runTest('Log Parser Engine', () => {
  const logSample = 'steamID=76561198859674725\n[PERSONAL SEED] 99\n[CoolDown] 10,20';
  const out = logParser.parse(logSample);
  if (out.meta.steamId !== '76561198859674725') throw new Error('Log parser steamId mismatch');
});

runTest('Backup Timeline Engine', () => {
  backupTimeline.clear();
  backupTimeline.addSave({ name: 'snap1.es3', timestamp: 1000, parsedData: demoSave });
  backupTimeline.addSave({ name: 'snap2.es3', timestamp: 2000, parsedData: demoSave });
  const series = backupTimeline.getSeries();
  const diffs = backupTimeline.getDiffs();
  if (series.length !== 2) throw new Error('Timeline series count != 2');
  if (diffs.length !== 1) throw new Error('Timeline diffs count != 1');
});

runTest('Farming Calculator Module', () => {
  const fc = farmingCalculator.create(TBH_DB);
  const ranking = fc.rankStages(15, 'exp');
  if (!Array.isArray(ranking) || ranking.length === 0) throw new Error('Ranking empty');
  const suggest = fc.suggestFarmStage(35, 15, 'exp');
  if (!suggest || !suggest.stage) throw new Error('Suggest stage failed');
});

runTest('Chest Simulator Module', () => {
  const cs = chestSimulator.create(TBH_DB);
  const sim = cs.simulate('stageBossBox4', 100, 42);
  if (!sim.distribution || Object.keys(sim.distribution).length === 0) throw new Error('Sim distribution empty');
  const runs = cs.expectedRunsForGrade('stageBossBox4', 'IMMORTAL');
  if (typeof runs !== 'number' || runs <= 0) throw new Error('Invalid expected runs');
});

runTest('Market Price Service & Fallback', () => {
  marketPrice.setManualPrice('999999', 450, 'manual');
  const meta = marketPrice.getMetadata('999999');
  if (!meta.exists || meta.confidence !== 'verified') throw new Error('Manual price failed');
  const csv = '301011,120,1718000000\n301012,220,1718000000';
  const imp = marketPrice.importPrices(csv, 'csv');
  if (imp.imported !== 2) throw new Error('CSV import count mismatch');
  const val = stashValueEngine.calculateTotalStashValue(demoSave, { priceSource: 'market' });
  if (val.priceSource !== 'market') throw new Error('Stash value priceSource mismatch');
});

runTest('Chest Optimizer & Drop Finder', () => {
  const opt = chestOptimizer;
  const ev = opt.expectedValue('stageBossBox4', 1);
  if (typeof ev.unitEV !== 'number' || ev.unitEV <= 0) throw new Error('Invalid unitEV');
  const suggestions = opt.suggestBestChest(demoSave);
  if (!Array.isArray(suggestions) || suggestions.length === 0) throw new Error('No suggestions returned');
  const drop = opt.findBestSource('301011');
  if (!drop || !drop.bestChestName) throw new Error('findBestSource failed');
});

runTest('PlayerTelemetry Engine & Hardening Asserts', () => {
  const logContent = fs.readFileSync('tests/fixtures/player_real.log', 'utf8');
  const telem = new PlayerTelemetry(logContent);
  const data = telem.extract();

  // 1. Cooldowns com fração e vírgula
  if (data.cooldownsMs.length !== 3) throw new Error(`cooldowns length ${data.cooldownsMs.length} !== 3`);
  if (data.cooldownsMs[0] !== 31252.52) throw new Error(`cooldown[0] ${data.cooldownsMs[0]} !== 31252.52`);
  if (data.cooldownsMs[1] !== 31250.10) throw new Error(`cooldown[1] ${data.cooldownsMs[1]} !== 31250.10`);
  if (data.cooldownsMs[2] !== 31255.80) throw new Error(`cooldown[2] ${data.cooldownsMs[2]} !== 31255.80`);

  // 2. Mediana
  const median = telem.medianCycleMs();
  if (median !== 31252.52) throw new Error(`median ${median} !== 31252.52`);

  // 3. WaitQueue & Countdown
  if (!data.waitQueue || data.waitQueue.steamID !== '76561198859674725') throw new Error('waitQueue steamID mismatch');
  if (data.waitQueue.seed !== 881583204) throw new Error('waitQueue seed mismatch');
  const remaining = telem.waitQueueRemainingMs(new Date('2026-09-08T05:00:00Z').getTime());
  if (remaining !== (18 * 60 + 33) * 1000) throw new Error(`waitQueueRemainingMs ${remaining} unexpected`);

  // 4. Seeds, Build e StuckStage
  if (data.personalSeed !== 6) throw new Error(`personalSeed ${data.personalSeed} !== 6`);
  if (data.clientBuild !== '1.0.4:5031774+') throw new Error(`clientBuild ${data.clientBuild} mismatch`);
  if (data.stuckStageKey !== 4309) throw new Error(`stuckStageKey ${data.stuckStageKey} !== 4309`);
  if (data.saveWriteEvents !== 2) throw new Error(`saveWriteEvents ${data.saveWriteEvents} !== 2`);

  // 5. netTicksToUnixMs BigInt assert
  const ticksMs = netTicksToUnixMs('639272431031232322');
  if (Math.abs(ticksMs - 1791646303123) > 1000) {
    throw new Error(`netTicksToUnixMs mismatch: ${ticksMs}`);
  }

  // 6. Sanitizador V2 em fixture com JSON interno escapado contendo Int64 de 17 dígitos
  const sampleEscaped = '{"AccountSaveData":{"__type":"string","value":"{\\"ownerSteamId\\":76561198859674725,\\"lastExitSteamUnixSecEncrypted\\":-360556046662314160}"}}';
  const parsedEscaped = safeParseJSON(sampleEscaped);
  if (parsedEscaped.strategy !== 'int64v2') {
    throw new Error(`strategy ${parsedEscaped.strategy} !== int64v2`);
  }
  const innerVal = safeParseJSON(parsedEscaped.data.AccountSaveData.value);
  if (innerVal.data.ownerSteamId !== '76561198859674725') {
    throw new Error('Inner ownerSteamId lost precision');
  }

  // 7. Assert de precisão do steamID (Tarefa 1.3)
  const fullSerialized = JSON.stringify(innerVal.data);
  if (!fullSerialized.includes('76561198859674725')) {
    throw new Error('Assert Tarefa 1.3 falhou: steamID arredondado ou corrompido');
  }
});

export const report = { passed, failed, results };
console.log(JSON.stringify(report, null, 2));
