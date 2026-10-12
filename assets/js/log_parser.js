/**
 * log_parser.js - Parser client-side para arquivos Player.log e Player-prev.log do Task Bar Hero
 */

export const LOG_PATTERNS = {
  steamId:          /steamID=(\d{17})/,
  localUser:        /Local User:\s*([^:\s]+):(\d+)/,
  seed:             /seed=(\d+),/,
  personalSeed:     /\[PERSONAL SEED\] (\d+)/,
  appVersion:       /\[APPVERSION\] Backend : ([\d.]+), Client : ([\d.]+)/,
  build:            /\[([\d.]+):(\d+)\+\]/,
  unityVersion:     /Initialize engine version: ([\d.a-z]+)/,
  steamAppId:       /App ID: (\d+)/,
  saveLoaded:       /\[SaveDataManager\].+로드 성공:\s*(.+\.es3)/,
  currentStage:     /next Stage Not found Current Stage Key : (\d+)/,
  allItemCache:     /AllItemCache Item Count : (\d+)/,
  clientItemList:   /Client AllItemList Item Count : (\d+)/,
  inventoryAdd:     /"itemKey":\s*"(\d+)",\s*"itemId":\s*(\d+)/,
  tryAllocate:      /\[TryAllocate\] Attribute (\d+) is already at max level (\d+)/,
  saveBackup:       /\[SaveDataManager\] 백업 생성 완료:\s*(.+?_backup_(\d{8}_\d{6})\.es3)/,
  dailyBackup:      /\[SaveDataManager\] 백업 생성 완료:\s*(.+?Live_daily_(\d{8}_\d{6})\.es3)/,
  boxOpen:          /TaskbarHero\.UI\.<OpenBoxAsync>/g,
  autoChest:        /TaskbarHero\.UI\.<AutoChestOpenAsync>/g,
  openAllBox:       /TaskbarHero\.UI\.<OpenAllBoxAsync>/g,
  exchangeBox:      /TaskbarHero\.UI\.<ExchangeOpenBoxAsync>/g,
  stageClear:       /TaskbarHero\.StageClearFunction:GetParam/g,
  synthesis:        /TrySynthesisAsyncBackend/g,
  corrosion:        /TaskbarHero\.CorrosionFunction:GetParam/g,
  consume:          /TaskbarHero\.InventoryConsume:GetParam/g,
  exchange:         /TaskbarHero\.InventoryExchange:GetParam/g,
  knightBase:       /TaskbarHero\.Combat\.KnightBaseAtk:niw/g,
  knightStrong:     /TaskbarHero\.Combat\.KnightStrongAtk:niw/g,
  archerProjectile: /TaskbarHero\.Combat\.Projectile\.ArcherBaseProjectile/g,
  cooldown:         /\[CoolDown\] ([\d.]+),([\d.]+)/g,
  serverError:      /\[SERVER\] Failed code reason : (.+)/g,
  steamDisconnect:  /\[UI_Popup\] Steam disconnected: True/g,
  exchangePending:  /\[ExchangePending\] .+?source=(\w+), time=([\d\-T:.Z]+)/g,
  backendLogin:     /\[LOGIN\] (\d+) : (\w+)/,
  backendTime:      /\[TIME\] ([\d\-T:.Z]+) : (\w+), (\d+), (\w+)/,
};

export function classifyItemId(itemId) {
  const idStr = String(itemId || '');
  if (/^9[123]0\d{3}$/.test(idStr)) {
    return { category: 'CHEST', tier: idStr[1] };
  }
  if (/^11\d{4}$/.test(idStr)) {
    return { category: 'MATERIAL_RUBY' };
  }
  if (/^14\d{4}$/.test(idStr)) {
    return { category: 'MATERIAL_WOOD' };
  }
  if (/^19\d{4}$/.test(idStr)) {
    return { category: 'SOULSTONE' };
  }
  if (/^[3-8]\d{5}$/.test(idStr)) {
    return { category: 'EQUIPMENT' };
  }
  return { category: 'UNKNOWN' };
}

export class LogParser {
  constructor(logText) {
    this.text = typeof logText === 'string' ? logText : '';
  }

  parse() {
    const text = this.text;

    // 1. Meta
    const mSteamId = text.match(LOG_PATTERNS.steamId);
    const mLocalUser = text.match(LOG_PATTERNS.localUser);
    const mSeed = text.match(LOG_PATTERNS.seed);
    const mPersonalSeed = text.match(LOG_PATTERNS.personalSeed);
    const mAppVersion = text.match(LOG_PATTERNS.appVersion);
    const mBuild = text.match(LOG_PATTERNS.build);
    const mUnity = text.match(LOG_PATTERNS.unityVersion);
    const mSteamAppId = text.match(LOG_PATTERNS.steamAppId);
    const mSaveLoaded = text.match(LOG_PATTERNS.saveLoaded);

    const meta = {
      steamId: mSteamId ? mSteamId[1] : null,
      localUser: mLocalUser ? { username: mLocalUser[1], id: Number(mLocalUser[2]) } : null,
      seed: mSeed ? Number(mSeed[1]) : null,
      personalSeed: mPersonalSeed ? Number(mPersonalSeed[1]) : null,
      appVersion: mAppVersion ? { backend: mAppVersion[1], client: mAppVersion[2] } : null,
      build: mBuild ? `${mBuild[1]}:${mBuild[2]}+` : null,
      unityVersion: mUnity ? mUnity[1] : null,
      steamAppId: mSteamAppId ? mSteamAppId[1] : null,
      saveLoaded: mSaveLoaded ? mSaveLoaded[1] : null,
    };

    // 2. Progress
    const mCurrentStage = text.match(LOG_PATTERNS.currentStage);
    const stageErrorsMatches = text.match(/next Stage Not found/g);
    const progress = {
      currentStageKey: mCurrentStage ? Number(mCurrentStage[1]) : null,
      nextStageNotFound: !!mCurrentStage,
      stageCountErrors: stageErrorsMatches ? stageErrorsMatches.length : 0,
    };

    // 3. Inventory & Items
    const mAllItemCache = text.match(LOG_PATTERNS.allItemCache);
    const mClientItemList = text.match(LOG_PATTERNS.clientItemList);
    const allItemCacheCount = mAllItemCache ? Number(mAllItemCache[1]) : 0;
    const clientItemListCount = mClientItemList ? Number(mClientItemList[1]) : 0;

    const addedItems = [];
    const invMatches = text.matchAll(new RegExp(LOG_PATTERNS.inventoryAdd.source, 'g'));
    for (const match of invMatches) {
      const itemKey = match[1];
      const itemId = match[2];
      addedItems.push({
        itemKey,
        itemId,
        classification: classifyItemId(itemId)
      });
    }

    const inventory = {
      allItemCacheCount,
      clientItemListCount,
      divergence: Math.abs(allItemCacheCount - clientItemListCount),
      addedItems,
    };

    // 4. Talents / Attributes
    const maxedAttributes = [];
    const attrMatches = text.matchAll(new RegExp(LOG_PATTERNS.tryAllocate.source, 'g'));
    for (const match of attrMatches) {
      maxedAttributes.push({
        attributeId: Number(match[1]),
        maxLevel: Number(match[2]),
      });
    }
    const talents = { maxedAttributes };

    // 5. Backups
    const backups = [];
    const backupMatches = text.matchAll(new RegExp(LOG_PATTERNS.saveBackup.source, 'g'));
    for (const match of backupMatches) {
      backups.push({
        path: match[1],
        timestamp: match[2],
        kind: 'periodic'
      });
    }
    const dailyMatches = text.matchAll(new RegExp(LOG_PATTERNS.dailyBackup.source, 'g'));
    for (const match of dailyMatches) {
      backups.push({
        path: match[1],
        timestamp: match[2],
        kind: 'daily'
      });
    }

    // Helper count global regex
    const countMatches = (regex) => {
      const matches = text.match(regex);
      return matches ? matches.length : 0;
    };

    // 6. Activities
    const activities = {
      boxOpens: countMatches(LOG_PATTERNS.boxOpen),
      autoChestOpens: countMatches(LOG_PATTERNS.autoChest),
      allBoxOpens: countMatches(LOG_PATTERNS.openAllBox),
      exchanges: countMatches(LOG_PATTERNS.exchangeBox) + countMatches(LOG_PATTERNS.exchange),
      stageClears: countMatches(LOG_PATTERNS.stageClear),
      syntheses: countMatches(LOG_PATTERNS.synthesis),
      corrosions: countMatches(LOG_PATTERNS.corrosion),
      consumptions: countMatches(LOG_PATTERNS.consume),
    };

    // 7. Combat
    const combat = {
      knightBaseAttacks: countMatches(LOG_PATTERNS.knightBase),
      knightStrongAttacks: countMatches(LOG_PATTERNS.knightStrong),
      archerProjectiles: countMatches(LOG_PATTERNS.archerProjectile),
    };

    // 8. Errors & Disconnects
    const serverErrors = [];
    const srvMatches = text.matchAll(new RegExp(LOG_PATTERNS.serverError.source, 'g'));
    for (const match of srvMatches) {
      serverErrors.push(match[1]);
    }

    const exchangePending = [];
    const exchMatches = text.matchAll(new RegExp(LOG_PATTERNS.exchangePending.source, 'g'));
    for (const match of exchMatches) {
      exchangePending.push({
        source: match[1],
        time: match[2]
      });
    }

    const soundMissing = [];
    const soundMatches = text.matchAll(/Sound not found\s*:\s*(.+)/gi);
    for (const match of soundMatches) {
      soundMissing.push(match[1].trim());
    }

    const errors = {
      serverErrors,
      steamDisconnects: countMatches(LOG_PATTERNS.steamDisconnect),
      exchangePending,
      soundMissing
    };

    // 9. Cooldowns
    const cooldowns = [];
    const cdMatches = text.matchAll(new RegExp(LOG_PATTERNS.cooldown.source, 'g'));
    for (const match of cdMatches) {
      cooldowns.push({
        tick: Number(match[1]),
        value: Number(match[2]),
      });
    }

    return {
      meta,
      progress,
      inventory,
      talents,
      backups,
      activities,
      combat,
      errors,
      cooldowns,
    };
  }
}

export const logParser = {
  parse: (logText) => new LogParser(logText).parse(),
};
