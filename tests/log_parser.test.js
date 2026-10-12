import fs from 'fs';
import { logParser } from '../assets/js/log_parser.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error('Assertion failed: ' + (message || 'unknown error'));
  }
}

const fixture = fs.readFileSync('tests/player_log_fixture.txt', 'utf8');
const out = logParser.parse(fixture);

assert(out.meta.steamId === '76561198859674725', 'steamId check');
assert(out.meta.localUser.username === 'luislror', 'localUser username check');
assert(out.meta.seed === 881583204, 'seed check');
assert(out.progress.currentStageKey === 4309, 'currentStageKey check');
assert(out.inventory.allItemCacheCount === 253, 'allItemCacheCount check');
assert(out.inventory.addedItems.length === 3, 'addedItems length check');
assert(out.talents.maxedAttributes.length === 3, 'maxedAttributes length check');
assert(out.backups.length === 3, 'backups length check');
assert(out.backups.filter(b => b.kind === 'daily').length === 1, 'daily backup check');
assert(out.activities.stageClears === 4, 'stageClears check');
assert(out.activities.syntheses === 2, 'syntheses check');
assert(out.cooldowns.length === 8, 'cooldowns check');
assert(out.errors.serverErrors.length === 2, 'serverErrors check');
assert(out.combat.knightStrongAttacks === 1, 'knightStrongAttacks check');
assert(out.combat.archerProjectiles === 5, 'archerProjectiles check');

export const summary = '15/15 asserts passed successfully';
export default { summary };
