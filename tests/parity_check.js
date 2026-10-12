/**
 * tests/parity_check.js
 * Teste de Verificação de Paridade Competitiva - TTBH vs TBH Index vs TBH Helper
 */

export function runParityCheck() {
  const features = [
    { name: 'Save Inspector', ttbh: true, tbhIndex: true, helper: true },
    { name: '248 Runas + pt-BR', ttbh: true, tbhIndex: true, helper: '⚠' },
    { name: 'POWER 0-100', ttbh: true, tbhIndex: false, helper: true },
    { name: 'Stash Value', ttbh: true, tbhIndex: true, helper: true },
    { name: 'Aggregates (17)', ttbh: true, tbhIndex: false, helper: true },
    { name: 'Log Parser', ttbh: true, tbhIndex: false, helper: false },
    { name: 'Synthesis Simulator', ttbh: true, tbhIndex: '⚠', helper: false },
    { name: 'BiS Finder + Drop Source', ttbh: true, tbhIndex: true, helper: true },
    { name: 'Rune Planner', ttbh: true, tbhIndex: true, helper: true },
    { name: 'Backup Timeline', ttbh: true, tbhIndex: '⚠', helper: true },
    { name: 'Market Price API', ttbh: true, tbhIndex: true, helper: true },
    { name: 'Chest Optimizer', ttbh: true, tbhIndex: '⚠', helper: true }
  ];

  const ttbhScore = features.filter(f => f.ttbh === true).length;
  const indexScore = features.filter(f => f.tbhIndex === true).length;
  const helperScore = features.filter(f => f.helper === true).length;

  return {
    scores: { ttbh: ttbhScore, tbhIndex: indexScore, helper: helperScore },
    winner: (ttbhScore >= indexScore && ttbhScore >= helperScore) ? 'TTBH' : 'concorrente',
    differentiators: features.filter(f => f.ttbh === true && f.tbhIndex !== true && f.helper !== true).map(f => f.name)
  };
}

const res = runParityCheck();
console.log(JSON.stringify(res, null, 2));
