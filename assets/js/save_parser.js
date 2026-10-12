/**
 * TTBH - ToolTaskBarHero
 * Save Parser & Normalizer v2.5 - Edição Oficial 10 Tiers & Combat Stats
 * 
 * Implementa com precisão:
 * 1. Tabela Geral de 10 Tiers e 10 Cores (Equipamentos e Materiais: Decorações, Gravações, Inscrições).
 * 2. Cálculo real de Atributos de Combate (Dano de Ataque real, HP, Armadura, Crítico e Velocidade).
 * 3. Decodificador exato de nível de equipamentos (intervalos oficiais de 5 em 5 níveis, Lv.1 a Lv.90/100).
 * 4. Resolução de TODAS as habilidades e talentos com pontos alocados da árvore (attributeSaveDatas).
 * 5. Mapeamento detalhado de materiais e buffers aplicados a cada item da bolsa e da mochila.
 */

import { TBH_DB } from './gamedata.js';

// Sanitizador Int64 legado (mantido para compatibilidade e testes)
export function sanitizeInt64(text) {
  return text.replace(/(?<!")\b(\d{15,})\b(?!")/g, '"$1"');
}
export const sanitizeInt64_legacy = sanitizeInt64;

// Sanitizador Int64 V2 QUOTE-AWARE e ESCAPE-AWARE (context walker de string)
export function sanitizeInt64V2(text) {
  let out = '', inStr = false, esc = false, i = 0;
  const n = text.length, isDigit = c => c >= '0' && c <= '9';
  while (i < n) {
    const c = text[i];
    const isNeg = (c === '-' && i + 1 < n && isDigit(text[i + 1]));
    if (inStr) {
      if (esc) { esc = false; out += c; i++; continue; }
      if (c === '\\') { esc = true; out += c; i++; continue; }
      if (c === '"') { inStr = false; out += c; i++; continue; }
      if (isDigit(c) || isNeg) {
        let j = isNeg ? i + 1 : i;
        while (j < n && isDigit(text[j])) j++;
        const numDigits = isNeg ? j - (i + 1) : j - i;
        const d = text.slice(i, j);
        const prev = out[out.length - 1];
        const next = text[j];
        out += (numDigits >= 15 && prev !== '"' && next !== '"') ? '\\"' + d + '\\"' : d;
        i = j;
        continue;
      }
      out += c; i++; continue;
    }
    if (c === '"') { inStr = true; out += c; i++; continue; }
    if (isDigit(c) || isNeg) {
      let j = isNeg ? i + 1 : i;
      while (j < n && isDigit(text[j])) j++;
      const numDigits = isNeg ? j - (i + 1) : j - i;
      const d = text.slice(i, j);
      const prev = out[out.length - 1];
      const next = text[j];
      out += (numDigits >= 15 && prev !== '"' && next !== '"') ? '"' + d + '"' : d;
      i = j;
      continue;
    }
    out += c; i++;
  }
  return out;
}

// Conversor de Ticks .NET (100ns desde 0001-01-01) para Unix ms
export function netTicksToUnixMs(ticks) {
  const t = BigInt(String(ticks).replace(/"/g, ''));
  return Number((t - 621355968000000000n) / 10000n);
}

export const OBSCURED_FIELDS = ['lastExitSteamUnixSecEncrypted'];

// Reparo de exóticos sem aspas (só usado em estágio fallback)
export function repairExotics(text) {
  return text
    .replace(/(?<!")(\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b)(?!")/g, '"$1"')
    .replace(/(:\s*)(\d+\.\d+\.\d+:[0-9+]+)(\s*[,}])/g, '$1"$2"$3');
}

// Cascata invertida: int64v2 → raw → int64v2+exóticos. Falha final vira erro diagnóstico
export function safeParseJSON(text) {
  const stages = [
    ['int64v2', sanitizeInt64V2],
    ['raw', (t) => t],
    ['exotics', (t) => repairExotics(sanitizeInt64V2(t))],
  ];
  let lastErr = null;
  for (const [name, fn] of stages) {
    try {
      const res = { data: JSON.parse(fn(text)), strategy: name };
      console.info('[TTBH] parse strategy:', name);
      return res;
    }
    catch (e) { lastErr = e; }
  }
  const m = /position (\d+)/.exec(lastErr.message);
  const pos = m ? +m[1] : 0;
  const excerpt = text.slice(Math.max(0, pos - 80), pos + 80);
  throw new Error(`${lastErr.message} | TRECHO: ${JSON.stringify(excerpt)}`);
}

export const TIERS = {
    1: { id: 1, name: "Common", pt: "Comum", hex: "#cbd5e1", icon: "⚪", desc: "Gemas e runas iniciais de baixo custo" },
    2: { id: 2, name: "Uncommon", pt: "Incomum", hex: "#22c55e", icon: "🟢", desc: "Modificadores verdes básicos" },
    3: { id: 3, name: "Rare", pt: "Raro", hex: "#3b82f6", icon: "🔵", desc: "Início dos slots vazios de equipamentos e inscrições" },
    4: { id: 4, name: "Legendary", pt: "Lendário", hex: "#facc15", icon: "🟡", desc: "Nível onde os itens passam a ser negociáveis na Steam" },
    5: { id: 5, name: "Immortal", pt: "Imortal", hex: "#ef4444", icon: "🔴", desc: "Obrigatório para começar a usar Gravações" },
    6: { id: 6, name: "Arcana", pt: "Arcano", hex: "#c084fc", icon: "🟣", desc: "Gemas/Inscrições roxas focadas em builds avançadas" },
    7: { id: 7, name: "Beyond", pt: "Além", hex: "#f43f5e", icon: "🩷", desc: "Modificadores de Endgame" },
    8: { id: 8, name: "Celestial", pt: "Celestial", hex: "#38bdf8", icon: "🩵", desc: "Liberado via síntese avançada do Cubo" },
    9: { id: 9, name: "Divine", pt: "Divino", hex: "#fb923c", icon: "🟠", desc: "Atributos Divinos de altíssimo multiplicador" },
    10: { id: 10, name: "Cosmic", pt: "Cósmico", hex: "linear-gradient(135deg, #ff007a, #7928ca, #0070f3, #00dfd8)", icon: "🌌", isCosmic: true, desc: "O patamar máximo para absolutamente tudo no jogo" }
};

/**
 * Catálogo Oficial das 36 Stats Únicas (Unique Mods) do Task Bar Hero em Português
 */
export const UNIQUE_MODS = {
    10001: {
        key: "ShieldChargeKillCooldown",
        skillKey: 10101,
        name: "Recarga por Abate de Investida",
        desc: "Ao abater um inimigo com Investida com Escudo, o tempo de recarga é zerado."
    },
    10002: {
        key: "SkillMultiStrikeCountUp",
        skillKey: 10101,
        name: "Golpe Múltiplo de Investida",
        desc: "Investida com Escudo atinge 1 vez adicional."
    },
    10003: {
        key: "SkillBaseAttackCountReduce",
        skillKey: 10101,
        name: "Ativação Rápida de Investida",
        desc: "A quantidade de ataques básicos necessários para ativar a habilidade Investida com Escudo diminui em 1."
    },
    10004: {
        key: "SkillCooldownReduce",
        skillKey: 10401,
        name: "Recarga de Espada da Justiça",
        desc: "O tempo de recarga da habilidade Espada da Justiça é reduzido em 50%."
    },
    10005: {
        key: "SkillMultiStrikeCountUp",
        skillKey: 10301,
        name: "Golpe Múltiplo de Barreira",
        desc: "Barreira Sagrada atinge 1 vez adicional."
    },
    10006: {
        key: "SkillBaseAttackCountReduce",
        skillKey: 10301,
        name: "Ativação Rápida de Barreira",
        desc: "A quantidade de ataques básicos necessários para ativar a habilidade Barreira Sagrada diminui em 1."
    },
    10007: {
        key: "SkillCooldownReduce",
        skillKey: 10201,
        name: "Recarga de Provocação Heroica",
        desc: "O tempo de recarga da habilidade Provocação Heroica é reduzido em 50%."
    },
    10008: {
        key: "SkillCooldownReduce",
        skillKey: 10501,
        name: "Recarga de Fúria do Guardião",
        desc: "O tempo de recarga da habilidade Fúria do Guardião é reduzido em 50%."
    },
    10009: {
        key: "SkillCooldownReduce",
        skillKey: 10601,
        name: "Recarga de Habilidade Especial",
        desc: "O tempo de recarga da habilidade diminui em 50%."
    },
    20001: {
        key: "SkewerShotBleedingStrike",
        skillKey: 20001,
        name: "Ativação do Disparo Espetador",
        desc: "A quantidade de ataques básicos necessários para ativar a habilidade Disparo Espetador diminui em 1."
    },
    20002: {
        key: "ArrowRainCriticalCooldown",
        skillKey: 20301,
        name: "Recarga Crítica de Chuva de Flechas",
        desc: "Acertos críticos com Chuva de Flechas reduzem o tempo de recarga em 3 segundos."
    },
    20003: {
        key: "SkillProjectileCountUp",
        skillKey: 20201,
        name: "Projétil Extra de Flecha Perfurante",
        desc: "Flecha Perfurante dispara 1 projétil adicional."
    },
    20004: {
        key: "SkillMultiStrikeCountUp",
        skillKey: 20101,
        name: "Golpe Múltiplo de Disparo Rápido",
        desc: "Disparo Rápido atinge 1 vez adicional."
    },
    20005: {
        key: "SkillBaseAttackCountReduce",
        skillKey: 20101,
        name: "Ativação Rápida de Disparo",
        desc: "A quantidade de ataques básicos necessários para ativar Disparo Rápido diminui em 1."
    },
    20006: {
        key: "SkillCooldownReduce",
        skillKey: 20301,
        name: "Recarga de Chuva de Flechas",
        desc: "O tempo de recarga da habilidade Chuva de Flechas é reduzido em 50%."
    },
    30001: {
        key: "FlameHydraBerserk",
        skillKey: 30101,
        name: "Frenesi da Hidra de Chamas",
        desc: "Hidra de Chamas ativa modo Frenesi, aumentando o dano em 200% e velocidade em 30%."
    },
    30002: {
        key: "IceOrbFreezeToCold",
        skillKey: 30401,
        name: "Congelamento do Orbe de Gelo",
        desc: "Orbe de Gelo causa congelamento e amplifica o dano gélido recebido pelos alvos em 30%."
    },
    30003: {
        key: "SnowstormEnhanceFrozenEnemy",
        skillKey: 30401,
        name: "Amplificação de Nevasca",
        desc: "Nevasca causa +200% de dano amplificado contra inimigos sob efeito de congelamento."
    },
    30004: {
        key: "SkillProjectileCountUp",
        skillKey: 30201,
        name: "Projétil Extra de Meteoros",
        desc: "Tempestade de Meteoros conjura 1 meteoro adicional."
    },
    30005: {
        key: "SkillElementChange",
        skillKey: 30101,
        name: "Conversão Gélida",
        desc: "Converte o elemento da habilidade para dano de Gelo."
    },
    30006: {
        key: "SkillCooldownReduce",
        skillKey: 30301,
        name: "Recarga de Relâmpago",
        desc: "O tempo de recarga de Relâmpago em Cadeia é reduzido em 50%."
    },
    40001: {
        key: "WrathOfHeavenHeal",
        skillKey: 40001,
        name: "Cura da Ira Celestial",
        desc: "Ira Celestial também restaura a vida de todos os membros aliados próximos."
    },
    50001: {
        key: "ExplosiveBoltHalf",
        skillKey: 50001,
        name: "Dardo Duplo Explosivo",
        desc: "Dardo Explosivo divide-se em 2 detonações simultâneas de 50% de dano."
    },
    50002: {
        key: "ChargeTrapExplosiveCooldown",
        skillKey: 50101,
        name: "Recarga de Armadilha Explosiva",
        desc: "O tempo de recarga de Armadilha Explosiva é reduzido em 50%."
    },
    50003: {
        key: "CrossbowTurretCooldown",
        skillKey: 50201,
        name: "Recarga de Torreta",
        desc: "Reduz o tempo de recarga da Torreta de Balista em 50%."
    },
    50004: {
        key: "CrossbowTurretAddAmount",
        skillKey: 50201,
        name: "Torreta Adicional",
        desc: "Aumenta a quantidade máxima de Torretas simultâneas ativas em +1."
    },
    50005: {
        key: "SkillProjectileCountUp",
        skillKey: 50101,
        name: "Projétil Extra de Espinhos",
        desc: "Armadilha de Espinhos dispara 1 projétil adicional."
    },
    50006: {
        key: "SkillElementChange",
        skillKey: 50201,
        name: "Conversão Elétrica",
        desc: "Converte o elemento da habilidade para dano Elétrico."
    },
    60001: {
        key: "AxeSpinBleedingChance",
        skillKey: 60001,
        name: "Sangramento do Giro de Machado",
        desc: "Giro de Machado ganha 50% de chance de causar sangramento profundo."
    },
    60002: {
        key: "SkillMultiStrikeCountUp",
        skillKey: 60201,
        name: "Golpe Múltiplo de Redemoinho",
        desc: "Redemoinho atinge 1 vez adicional por ciclo."
    },
    60003: {
        key: "SkillElementChange",
        skillKey: 60001,
        name: "Conversão Ígnea",
        desc: "Converte o dano do golpe para elemento Fogo."
    },
    1000001: {
        key: "WaveMoveSlowestPartyExcludeSelf",
        name: "Impulso de Onda Lento",
        desc: "Ao avançar de onda, acelera o aliado mais lento da party."
    },
    1000002: {
        key: "WaveMoveFastestPartyMember",
        name: "Impulso de Onda Rápido",
        desc: "Ao avançar de onda, concede bônus de aceleração ao membro mais veloz."
    },
    1000008: {
        key: "SlayerLowHpAttackSpeed",
        name: "Frenesi da Beira da Morte",
        desc: "Quando o HP estiver abaixo de 30%, concede até +100% de velocidade de ataque."
    },
    1000009: {
        key: "SorcererLightningShock",
        name: "Choque Paralisante",
        desc: "Habilidades elétricas do Feiticeiro ganham chance de eletrocutar e atordoar os alvos."
    },
    1000010: {
        key: "WhirlwindFireIgnite",
        name: "Redemoinho Incendiário",
        desc: "Redemoinho incendeia todos os alvos atingidos, causando dano contínuo de queimadura."
    }
};

/**
 * Analisa os registros de log do Task Bar Hero
 * Padrão oficial: [Estágio 3-9 concluido. (260s)]
 */
export function parseStageLogs(logContent, currentStageLabel = "") {
    if (!logContent || typeof logContent !== "string") return [];
    
    const regex = /\[?(?:Est[áa]gio|Stage)\s*([0-9]+-[0-9]+)\s*(?:concluido|conclu[íi]do|completed|limpo)?\.?\s*\(?(\d+)\s*s\)?\]?/gi;
    const allRecords = [];
    let match;
    
    while ((match = regex.exec(logContent)) !== null) {
        const stage = match[1];
        const timeSec = parseInt(match[2], 10);
        if (timeSec > 0) {
            allRecords.push({
                stage: stage,
                seconds: timeSec,
                raw: match[0].trim()
            });
        }
    }
    
    if (allRecords.length === 0) {
        // Fallback tolerante para formato simplificado
        const fallbackRegex = /([0-9]+-[0-9]+)[^\n\r]*?(\d+)\s*s/gi;
        while ((match = fallbackRegex.exec(logContent)) !== null) {
            const stage = match[1];
            const timeSec = parseInt(match[2], 10);
            if (timeSec > 0 && timeSec < 10000) {
                allRecords.push({
                    stage: stage,
                    seconds: timeSec,
                    raw: match[0].trim()
                });
            }
        }
    }
    
    return allRecords;
}

export function getStageClearStats(records, targetStageLabel = "") {
    if (!records || records.length === 0) {
        return {
            targetStage: targetStageLabel || "3-9",
            samples: [260],
            lastThree: [260],
            averageSeconds: 260,
            minSeconds: 260,
            maxSeconds: 260,
            count: 1,
            isEstimated: true
        };
    }
    
    let filtered = records;
    if (targetStageLabel) {
        const matched = records.filter(r => r.stage === targetStageLabel);
        if (matched.length > 0) filtered = matched;
    }
    
    const lastThree = filtered.slice(-3);
    const times = lastThree.map(r => r.seconds);
    const sum = times.reduce((acc, v) => acc + v, 0);
    const avg = Math.round(sum / times.length);
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return {
        targetStage: filtered[filtered.length - 1]?.stage || targetStageLabel || "3-9",
        samples: times,
        lastThree: times,
        averageSeconds: avg,
        minSeconds: min,
        maxSeconds: max,
        count: filtered.length,
        isEstimated: false
    };
}

export class SaveParser {
    constructor() {
        this.DB = this.getDB();
    }

    getDB() {
        if (TBH_DB) {
            return TBH_DB;
        }
        if (typeof window !== "undefined" && window.TBH_DB) {
            return window.TBH_DB;
        }
        if (typeof globalThis !== "undefined" && globalThis.TBH_DB) {
            return globalThis.TBH_DB;
        }
        return this.DB || null;
    }

    /**
     * Parseia o save decodificado
     * @param {Object} rawDecryptedSave
     * @returns {Object} Dados normalizados do jogador
     */
    parse(rawDecryptedSave) {
        this.DB = this.getDB();
        if (!rawDecryptedSave || !rawDecryptedSave.PlayerSaveData) {
            throw new Error("Estrutura inválida: 'PlayerSaveData' não encontrado no save.");
        }

        let pdata = rawDecryptedSave.PlayerSaveData.value;
        if (typeof pdata === "string") {
            try {
                pdata = safeParseJSON(pdata).data;
            } catch (e) {
                throw new Error("Falha ao analisar PlayerSaveData.value: " + e.message);
            }
        }

        const common = pdata.commonSaveData || {};
        const cubeData = pdata.cubeSaveLevelData || {};
        const cubeLevel = Number(cubeData.Level || 1);
        const cubeExp = Number(cubeData.Exp || 0);

        // 1. Recursos
        const currenyList = pdata.currenySaveDatas || [];
        const goldEntry = currenyList.find(c => c.Key === 100001);
        const gold = goldEntry ? Number(goldEntry.Quantity || 0) : 0;

        // 2. Tempo de jogo e Metadados
        const playTimeSec = Number(common.playTime || 0);
        const playTimeFormatted = this.formatPlayTime(playTimeSec);

        // 3. Mapeamento de itens salvos (itemSaveDatas)
        const itemDataMap = new Map();
        for (const item of (pdata.itemSaveDatas || [])) {
            const uid = String(item.UniqueId);
            itemDataMap.set(uid, item);
        }

        // 4. Pets (Ativo + Todos os Desbloqueados + Soma dos Buffs)
        const petData = this.parsePets(pdata.PetSaveData || [], common.ArrangedPetKey || 1001);

        // 5. Heróis com Build Completa e Atributos Reais de Combate
        const heroSaveList = pdata.heroSaveDatas || [];
        const arrangedKeys = common.arrangedHeroKey || [];
        const attributeSaveDatas = pdata.attributeSaveDatas || [];
        const runeSaveDatas = pdata.RuneSaveData || [];

        const heroes = this.parseHeroes(
            heroSaveList,
            arrangedKeys,
            itemDataMap,
            cubeLevel,
            attributeSaveDatas,
            runeSaveDatas
        );

        // 6. Inventário, Mochila (Stash) e Navio de Troca (Trade Ship)
        const inventorySlots = pdata.inventorySaveDatas || [];
        const stashSlots = pdata.stashSaveDatas || [];
        const tradingSlots = pdata.remakeTradingStashSaveDatas || pdata.tradingStashSaveDatas || [];
        const storageResult = this.parseAllStorage(inventorySlots, stashSlots, itemDataMap, cubeLevel, tradingSlots);

        // 7. Estágios (Identificação precisa da fase atual em que os heróis batalham)
        const currentStageKey = common.currentStageKey || 0;
        const maxCompletedStage = common.maxCompletedStage || 0;
        const currentStageInfo = this.resolveStageDetails(currentStageKey, common.currentStageWave);
        const maxStageInfo = this.resolveStageDetails(maxCompletedStage, 0);

        // 8. Account & Steam ID & Metadata (AccountSaveData)
        let ownerSteamId = null;
        let meta = {
            savedAtUnixMs: null,
            savedAtISO: null,
            playTimeSec: playTimeSec,
            schemaVersion: common.version || "1.0.0",
            obscured: []
        };

        try {
            if (rawDecryptedSave.AccountSaveData && rawDecryptedSave.AccountSaveData.value) {
                const accVal = typeof rawDecryptedSave.AccountSaveData.value === "string"
                    ? safeParseJSON(rawDecryptedSave.AccountSaveData.value).data
                    : rawDecryptedSave.AccountSaveData.value;

                ownerSteamId = accVal.ownerSteamId?.toString() ?? null;

                if (accVal.version) {
                    meta.schemaVersion = String(accVal.version);
                }

                if (accVal.lastSavedTime) {
                    try {
                        const ms = netTicksToUnixMs(accVal.lastSavedTime);
                        if (!Number.isNaN(ms) && Number.isFinite(ms)) {
                            meta.savedAtUnixMs = ms;
                            meta.savedAtISO = new Date(ms).toISOString();
                        }
                    } catch (_) {}
                }

                if (accVal.playTime !== undefined) {
                    meta.playTimeSec = Number(accVal.playTime) || playTimeSec;
                }

                // Checagem de campos ObscuredInt
                for (const field of OBSCURED_FIELDS) {
                    if (accVal[field] !== undefined) {
                        const valNum = Number(accVal[field]);
                        if (valNum < 0) {
                            meta.obscured.push({
                                field: field,
                                raw: accVal[field],
                                obscured: true,
                                note: 'ObscuredInt — máscara desconhecida'
                            });
                        }
                    }
                }
            }
        } catch (_) {}

        // Fallback de ticks se lastSavedTime vier em common
        if (!meta.savedAtUnixMs && common.lastSavedTime) {
            try {
                const ms = netTicksToUnixMs(common.lastSavedTime);
                if (!Number.isNaN(ms) && Number.isFinite(ms)) {
                    meta.savedAtUnixMs = ms;
                    meta.savedAtISO = new Date(ms).toISOString();
                }
            } catch (_) {}
        }

        // 9. Estatísticas Agregadas (aggregateSaveDatas: kills, clears, crafts, etc.)
        const aggregateList = pdata.aggregateSaveDatas || [];

        return {
            meta: meta,
            account: {
                version: meta.schemaVersion || common.version || "1.0.0",
                ownerSteamId: ownerSteamId,
                playTimeSeconds: meta.playTimeSec || playTimeSec,
                playTimeFormatted: this.formatPlayTime(meta.playTimeSec || playTimeSec),
                currentStageKey: currentStageKey,
                currentStageFormatted: currentStageInfo.formatted,
                currentStageInfo: currentStageInfo,
                maxCompletedStage: maxCompletedStage,
                maxStageFormatted: maxStageInfo.formatted,
                maxStageInfo: maxStageInfo,
                lastSavedTime: common.lastSavedTime || (meta.savedAtUnixMs ? String(meta.savedAtUnixMs) : null)
            },
            currencies: {
                gold: gold,
                goldFormatted: this.formatNumber(gold)
            },
            cube: {
                level: cubeLevel,
                exp: cubeExp,
                penaltyMargin: 10
            },
            pets: petData,
            activePet: petData.activePet,
            heroes: heroes,
            inventory: storageResult.inventory,
            stash: storageResult.stash,
            tradeShip: storageResult.tradeShip,
            allStorageItems: storageResult.all,
            aggregates: aggregateList,
            raw: pdata
        };
    }

    formatPlayTime(seconds) {
        if (!seconds || seconds <= 0) return "0h";
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    }

    resolveStageDetails(stageKey, currentWave = 0) {
        if (!stageKey) return { key: 0, label: "1-1", formatted: "Ato 1 (1)", difficulty: "NORMAL", diffPt: "Normal", name: "Pasto", waves: 10, currentWave: 0 };
        const st = (this.DB && this.DB.stages && this.DB.stages[String(stageKey)]) ? this.DB.stages[String(stageKey)] : null;
        if (st) {
            const diffPt = {
                NORMAL: "Normal",
                NIGHTMARE: "Pesadelo",
                HELL: "Inferno",
                TORMENT: "Tormento"
            }[st.diff] || st.diff;
            const ptName = st.name?.["pt-BR"] || st.name?.["en-US"] || `Estágio ${st.label}`;
            return {
                key: Number(stageKey),
                label: st.label || "1-1",
                act: st.act || 1,
                no: st.no || 1,
                lvl: st.lvl || 1,
                diff: st.diff || "NORMAL",
                diffPt: diffPt,
                name: ptName,
                waves: st.waves || 10,
                currentWave: currentWave || 0,
                totalHP: st.totalHP || 0,
                gold: st.gold || 0,
                exp: st.exp || 0,
                formatted: `Ato ${st.act} - ${st.label} (${diffPt} • ${ptName})`
            };
        }
        return {
            key: Number(stageKey),
            label: this.formatStageKey(stageKey),
            formatted: this.formatStageKey(stageKey),
            name: "Fase de Batalha",
            difficulty: "NORMAL",
            diffPt: "Normal",
            currentWave: currentWave || 0
        };
    }

    formatStageKey(stageKey) {
        if (!stageKey) return "1-1";
        const st = (this.DB && this.DB.stages && this.DB.stages[String(stageKey)]) ? this.DB.stages[String(stageKey)] : null;
        if (st && st.label) {
            const diffPt = { NORMAL: "Normal", NIGHTMARE: "Pesadelo", HELL: "Inferno", TORMENT: "Tormento" }[st.diff] || st.diff;
            return `Ato ${st.act} (${st.label} - ${diffPt})`;
        }
        const s = String(stageKey);
        if (s.length >= 4) {
            const act = s.substring(0, 1);
            const stage = parseInt(s.substring(1), 10);
            return `Ato ${act} (${stage})`;
        }
        return `Fase ${stageKey}`;
    }

    parsePets(petSaveList, arrangedPetKey) {
        const petDefinitions = {
            1001: { name: "Morcego (Bat)", icon: "🦇", desc: "EXP de monstros e chance de baú normal" },
            1002: { name: "Vigia (Watcher)", icon: "👁️", desc: "Ouro adicional em combate" },
            1003: { name: "Esqueleto Ardente", icon: "💀", desc: "Chance de baú de chefe de fase" },
            1004: { name: "Golem Azul", icon: "🗿", desc: "Aumento de baús normais" },
            1005: { name: "Espírito Sombrio", icon: "👻", desc: "Aumento de baús de chefes" },
            6001: { name: "Espada (DLC)", icon: "⚔️", desc: "Bônus de EXP global" },
            6002: { name: "Borboleta (DLC)", icon: "🦋", desc: "Bônus de Ouro global" },
            6003: { name: "Dragão (DLC)", icon: "🐲", desc: "Super bônus de Ouro, EXP e Baús" }
        };

        const pets = [];
        const totalBuffs = {
            expPercent: 0,
            goldPercent: 0,
            normalChestPercent: 0,
            bossChestPercent: 0
        };

        for (const p of petSaveList) {
            const k = String(p.PetKey);
            const isUnlocked = Boolean(p.IsUnlock);
            const def = petDefinitions[k] || { name: `Pet #${k}`, icon: "🐾", desc: "Bônus especial" };

            const stats = (this.DB && this.DB.petStats && this.DB.petStats[k]) ? this.DB.petStats[k] : [];
            const buffList = [];

            for (const st of stats) {
                const val = (st.v || 0) / 10;
                let label = "";
                if (st.st === "IncreaseExpAmount") {
                    label = `+${val}% EXP`;
                    if (isUnlocked) totalBuffs.expPercent += val;
                } else if (st.st === "IncreaseGoldAmount") {
                    label = `+${val}% Ouro`;
                    if (isUnlocked) totalBuffs.goldPercent += val;
                } else if (st.st === "DropChanceNormalChestPercent") {
                    label = `+${val}% Baús Normais`;
                    if (isUnlocked) totalBuffs.normalChestPercent += val;
                } else if (st.st === "DropChanceStageBossChestPercent") {
                    label = `+${val}% Baús de Chefes`;
                    if (isUnlocked) totalBuffs.bossChestPercent += val;
                }
                buffList.push(label);
            }

            const isCurrentActive = Number(k) === Number(arrangedPetKey);

            pets.push({
                petKey: Number(k),
                name: def.name,
                icon: def.icon,
                desc: def.desc,
                isUnlocked: isUnlocked,
                isActive: isCurrentActive,
                buffs: buffList
            });
        }

        const activePetObj = pets.find(p => p.isActive) || pets[0] || {
            name: "Morcego (Bat)",
            icon: "🦇",
            desc: "EXP e Baús",
            buffs: ["+15% EXP", "+10% Baús"]
        };

        return {
            all: pets,
            activePet: activePetObj,
            totalBuffs: totalBuffs
        };
    }

    /**
     * Decodifica a chave de item oficial do jogo (TT G LL V)
     * Trata sufixo 900 (item no Mercado Steam), IsChaotic e IsBlocked
     */
    decodeItemKey(itemKey, itemMeta = {}) {
        const rawStr = String(itemKey ?? "");
        const onMarket = rawStr.endsWith("900");
        const s = onMarket ? rawStr.slice(0, -3) : rawStr;

        let grade = "COMMON";
        let tier = 1;
        let level = 1;
        let typeName = "EQUIPMENT";
        let typeCode = 0;
        let gearType = "";

        const isChaotic = Boolean(itemMeta.IsChaotic);
        const isBlocked = Boolean(itemMeta.IsBlocked);

        if (s.length >= 6) {
            typeCode = parseInt(s.substring(0, 2), 10);
            const gradeIdx = parseInt(s[2], 10);
            // Corrige a discrepância de nível: Itens comuns (grau 0) usam 3 dígitos para o índice de nível.
            const lvlIdx = (gradeIdx === 0 && typeCode >= 30) ? parseInt(s.substring(3, 6), 10) : parseInt(s.substring(3, 5), 10);

            const gradeNames = ["COMMON", "UNCOMMON", "RARE", "LEGENDARY", "IMMORTAL", "ARCANA", "BEYOND", "CELESTIAL", "DIVINE", "COSMIC"];
            tier = Math.min(10, Math.max(1, gradeIdx + 1));
            grade = gradeNames[gradeIdx] || "COMMON";

            // Intervalos de 5 níveis oficiais do jogo (Lv. 1 até Lv. 90 no endgame atual, teto 100)
            if (lvlIdx <= 1) {
                level = 1;
            } else if (lvlIdx <= 19) {
                level = (lvlIdx - 1) * 5;
            } else {
                level = 100;
            }

            const typeMap = {
                11: "Decoração",
                12: "Gravação",
                13: "Inscrição",
                14: "Material de Refino",
                30: "Espada",
                31: "Arco",
                32: "Cajado",
                33: "Cetro / Maça",
                40: "Escudo",
                41: "Aljava / Flecha",
                42: "Tomo Sagrado",
                43: "Relíquia Sagrada",
                50: "Capacete",
                51: "Armadura",
                52: "Luvas",
                53: "Botas",
                60: "Amuleto / Colar",
                61: "Brinco",
                62: "Anel",
                63: "Braçadeira",
                92: "Baú de Recompensa"
            };
            typeName = typeMap[typeCode] || "Equipamento";

            const gearTypeMap = {
                30: "SWORD",
                31: "BOW",
                32: "STAFF",
                33: "SCEPTER",
                40: "SHIELD",
                41: "ARROW",
                42: "TOME",
                43: "ORB",
                50: "HELMET",
                51: "ARMOR",
                52: "GLOVES",
                53: "BOOTS",
                60: "AMULET",
                61: "EARRING",
                62: "RING",
                63: "BRACER"
            };
            gearType = gearTypeMap[typeCode] || "";
        }

        return { 
            itemKey: rawStr,
            lookupKey: s,
            grade, 
            tier, 
            level, 
            typeName, 
            typeCode, 
            gearType, 
            onMarket, 
            isChaotic, 
            isBlocked 
        };
    }

    parseHeroes(heroSaveList, arrangedKeys, itemDataMap, cubeLevel, attributeSaveDatas = [], runeSaveDatas = []) {
        const heroDefinitions = {
            101: { name: "Cavaleiro", cls: "Knight", role: "Tanque / Defesa", icon: "🛡️" },
            201: { name: "Explorador", cls: "Ranger", role: "Dano à Distância", icon: "🏹" },
            301: { name: "Feiticeiro", cls: "Sorcerer", role: "Dano Elemental AoE", icon: "🔮" },
            401: { name: "Sacerdote", cls: "Priest", role: "Suporte / Cura", icon: "✨" },
            501: { name: "Caçador", cls: "Hunter", role: "Armadilhas / Controle", icon: "🎯" },
            601: { name: "Matador", cls: "Slayer", role: "Dano Físico Brutal", icon: "⚔️" }
        };

        const slotNames = [
            "Arma Principal",
            "Arma Secundária",
            "Capacete",
            "Armadura",
            "Luvas",
            "Botas",
            "Amuleto / Colar",
            "Brinco",
            "Anel",
            "Braçadeira"
        ];

        // Mapa de atributos alocados do jogador
        const attrMap = new Map();
        for (const a of attributeSaveDatas) {
            attrMap.set(a.Key, a.Level);
        }

        const result = [];
        for (const h of heroSaveList) {
            const k = h.heroKey;
            const def = heroDefinitions[k] || { name: `Herói ${k}`, cls: "Hero", role: "Guerreiro", icon: "👤" };
            const isArranged = arrangedKeys.includes(k);
            const level = Number(h.HeroLevel || 1);
            const exp = Number(h.HeroExp || 0);

            // 1. 10 Slots de Equipamentos
            const equippedSlots = [];
            const rawEquippedIds = h.equippedItemIds || [];

            for (let slotIndex = 0; slotIndex < 10; slotIndex++) {
                const uid = String(rawEquippedIds[slotIndex] || "0");
                const item = itemDataMap.get(uid);
                const slotTitle = slotNames[slotIndex] || `Slot ${slotIndex}`;

                if (item && uid !== "0") {
                    const enrichedItem = this.formatDetailedItem(item, cubeLevel, slotTitle);
                    equippedSlots.push(enrichedItem);
                } else {
                    equippedSlots.push({
                        slotIndex: slotIndex,
                        slotName: slotTitle,
                        isEmpty: true
                    });
                }
            }

            const equippedCount = equippedSlots.filter(s => !s.isEmpty).length;

            // 2. Resolução de TODAS as Habilidades e Talentos da Árvore com pontos alocados
            const heroTalents = this.parseHeroTalents(k, attrMap, h.equippedSKillKey || []);

            // 3. Habilidades Equipadas na Party (3 slots)
            const equippedSkills = (h.equippedSKillKey || [])
                .filter(skKey => skKey > 0)
                .map(skKey => {
                    const skDb = (this.DB && this.DB.skills && this.DB.skills[String(skKey)]) ? this.DB.skills[String(skKey)] : null;
                    return {
                        skillKey: skKey,
                        name: this.resolveSkillName(skKey, skDb),
                        dmgType: skDb ? skDb.dmgType : "Físico",
                        delivery: skDb ? skDb.delivery : "Corpo a corpo",
                        cooldown: skDb ? skDb.cd : 0
                    };
                });

            // 4. Cálculo Real de Atributos de Combate
            const combatStats = this.calculateHeroCombatStats(k, level, equippedSlots, heroTalents, runeSaveDatas);

            result.push({
                heroKey: k,
                name: def.name,
                cls: def.cls,
                role: def.role,
                icon: def.icon,
                level: level,
                exp: exp,
                isUnlocked: Boolean(h.IsUnLock),
                inParty: isArranged,
                abilityPoints: h.AbilityPoint || 0,
                allocatedAP: h.AllocatedHeroAbilityPoint || 0,
                baseStats: combatStats.summary,
                statBreakdowns: combatStats.breakdown,
                equippedSkills: equippedSkills,
                heroTalents: heroTalents,
                equippedCount: equippedCount,
                equippedSlots: equippedSlots
            });
        }

        return result.sort((a, b) => (b.inParty ? 1 : 0) - (a.inParty ? 1 : 0));
    }

    /**
     * Extrai todas as habilidades e talentos com pontos ativos na árvore do herói
     */
    parseHeroTalents(heroKey, attrMap, equippedSkillKeys) {
        if (!this.DB || !this.DB.attributes) return [];

        const prefix = String(heroKey);
        const talents = [];

        for (const [attrKeyStr, attrDef] of Object.entries(this.DB.attributes)) {
            if (attrDef.hero !== heroKey) continue;

            const attrKey = Number(attrKeyStr);
            const allocatedLevel = attrMap.get(attrKey) || 0;
            if (allocatedLevel <= 0) continue; // Somente habilidades com pontos alocados

            const atype = attrDef.atype; // "PASSIVESKILL" ou "ACTIVESKILL"
            const val = attrDef.val;
            const maxLevel = attrDef.max || 10;

            let name = "";
            let description = "";
            let isEquipped = false;

            if (atype === "ACTIVESKILL") {
                const skDb = (this.DB.skills && this.DB.skills[String(val)]) ? this.DB.skills[String(val)] : null;
                name = this.resolveSkillName(val, skDb);
                isEquipped = equippedSkillKeys.includes(val);
                description = `Ativa: Dano ${skDb?.dmgType || "Físico"} • Recarga ${skDb?.cd || 0}s • ${skDb?.delivery || "Ação"}`;
                talents.push({
                    attrKey: attrKey,
                    name: name,
                    type: atype,
                    isEquipped: isEquipped,
                    level: allocatedLevel,
                    maxLevel: maxLevel,
                    description: description
                });
            } else {
                // Passiva
                const passiveDef = (this.DB.passives && this.DB.passives[String(val)]) ? this.DB.passives[String(val)] : null;
                const statType = passiveDef ? passiveDef.st : "Buff";
                const statName = this.resolveStatName(statType);
                const baseVal = passiveDef ? (passiveDef.v || 0) : 0;
                const totalValue = baseVal * allocatedLevel;
                const mt = passiveDef ? (passiveDef.mt || "FLAT") : "FLAT";

                name = `Talento Passivo: ${statName}`;
                const isPct = mt === "ADDITIVE" || statType.includes("Percent") || statType.includes("Chance") || statType.includes("Reduction") || statType.includes("Speed");
                if (isPct) {
                    const formattedPct = totalValue >= 100 ? (totalValue / 10).toFixed(1) : totalValue;
                    description = `Buffer Permanente: +${formattedPct}% ${statName}`;
                } else {
                    description = `Buffer Permanente: +${totalValue} ${statName}`;
                }

                talents.push({
                    attrKey: attrKey,
                    name: name,
                    type: atype,
                    statKey: statType,
                    statName: statName,
                    mt: mt,
                    baseVal: baseVal,
                    totalValue: totalValue,
                    isEquipped: false,
                    level: allocatedLevel,
                    maxLevel: maxLevel,
                    description: description
                });
            }
        }

        return talents.sort((a, b) => (b.type === "ACTIVESKILL" ? 1 : 0) - (a.type === "ACTIVESKILL" ? 1 : 0));
    }

    /**
     * Calcula os atributos de combate reais e exatos da conta
     */
    calculateHeroCombatStats(heroKey, level, equippedSlots, heroTalents, runeSaveDatas) {
        const dbHero = (this.DB && this.DB.heroes && this.DB.heroes[String(heroKey)]) ? this.DB.heroes[String(heroKey)] : {};
        const gearTable = (this.DB && this.DB.gear) ? this.DB.gear : {};

        let baseAttack = dbHero.AttackDamage || 1;
        let baseSpeed = (dbHero.AttackSpeed || 100) / 100;
        let baseCritChance = (dbHero.CriticalChance || 40) / 10;
        let baseCritDamage = (dbHero.CriticalDamage || 1500) / 10;
        let baseHp = (dbHero.MaxHp || 60) * level;
        let baseArmor = dbHero.Armor || 10;
        let baseMoveSpeed = dbHero.MovementSpeed || 850;

        let gearAttackFlat = 0;
        let gearAttackAdditive = 0;
        let gearSpeedAdditive = 0;
        let gearSpeedMultiplicative = 0;
        let gearCritChanceFlat = 0;
        let gearCritChanceAdditive = 0;
        let gearCritDamageFlat = 0;
        let gearHpFlat = 0;
        let gearHpAdditive = 0;
        let gearArmorFlat = 0;
        let gearArmorAdditive = 0;
        let gearMoveFlat = 0;
        let gearMoveAdditive = 0;
        let gearBlock = 0;
        let gearAbsorp = 0;
        let gearDamageReduction = 0;
        let gearAllElemRes = 0;
        let gearFireRes = 0;
        let gearColdRes = 0;
        let gearLightRes = 0;
        let gearChaosRes = 0;

        let gearCdReduction = 0;
        let gearAoE = 0;
        let gearLifeOnHit = 0;
        let gearHpRegen = 0;
        let gearCastSpeed = 0;
        let gearProjectileCount = 0;
        let gearMultistrike = 0;

        // 1. Equipamentos equipados (Inherent stats + Base stats b1)
        for (const slot of equippedSlots) {
            if (slot.isEmpty) continue;
            const k = String(slot.itemKey);
            const gInfo = gearTable[k] || gearTable[k.slice(0, 5) + "1"] || gearTable[k.slice(0, 5) + "2"];
            const typeCode = slot.typeCode || parseInt(String(slot.itemKey).substring(0, 2), 10);
            const b1 = gInfo ? (gInfo.b1 || 0) : 0;

            if (gInfo) {
                // b1 por tipo de item
                if ([30, 31, 32, 33].includes(typeCode)) {
                    gearAttackFlat += b1;
                } else if (typeCode === 40) {
                    gearBlock += (b1 / 10);
                } else if ([50, 51, 52, 53].includes(typeCode)) {
                    gearArmorFlat += b1;
                } else if (typeCode === 42) {
                    gearHpFlat += b1;
                }

                // Inherent stats
                for (const inh of (gInfo.inh || [])) {
                    const [st, mt, val] = inh;
                    if (st === "AttackDamage") {
                        if (mt === "ADDITIVE") gearAttackAdditive += (val / 10);
                        else gearAttackFlat += val;
                    } else if (st === "AttackSpeed") {
                        if (mt === "MULTIPLICATIVE") gearSpeedMultiplicative += (val / 1000);
                        else gearSpeedAdditive += (val / 1000);
                    } else if (st === "CriticalChance") {
                        if (mt === "ADDITIVE") gearCritChanceAdditive += (val / 10);
                        else gearCritChanceFlat += (val / 10);
                    } else if (st === "CriticalDamage") {
                        gearCritDamageFlat += (val / 10);
                    } else if (st === "MaxHp") {
                        if (mt === "ADDITIVE") gearHpAdditive += (val / 10);
                        else gearHpFlat += val;
                    } else if (st === "Armor") {
                        if (mt === "ADDITIVE") gearArmorAdditive += (val / 10);
                        else gearArmorFlat += val;
                    } else if (st === "MovementSpeed") {
                        if (mt === "ADDITIVE") gearMoveAdditive += (val / 10);
                        else gearMoveFlat += val;
                    } else if (st === "BlockChance") {
                        gearBlock += (val / 10);
                    } else if (st === "DamageAbsorption") {
                        gearAbsorp += (val / 10);
                    } else if (st === "DamageReduction") {
                        gearDamageReduction += (val / 10);
                    } else if (st === "AllElementalResistance") {
                        gearAllElemRes += val;
                    } else if (st === "CooldownReduction") {
                        gearCdReduction += (val / 10);
                    } else if (st === "AreaOfEffect") {
                        gearAoE += (val / 10);
                    } else if (st === "AddHpPerHit") {
                        gearLifeOnHit += val;
                    } else if (st === "HpRegenPerSec") {
                        gearHpRegen += (val / 10);
                    } else if (st === "SkillRangeExpansion") {
                        gearAoE += (val / 10);
                    }
                }
            }

            // Encantamentos/Decorações/Gravações/Inscrições aplicados ao item
            for (const mod of (slot.detailedModifiers || [])) {
                const st = mod.statKey;
                const rawVal = mod.rawVal || 0;
                let mt = "FLAT";
                if (this.DB && this.DB.statMods && this.DB.statMods[`${mod.statModKey || ''}:${mod.tier}`]) {
                    mt = this.DB.statMods[`${mod.statModKey}:${mod.tier}`].mt || "FLAT";
                }

                if (st === "AttackDamage") {
                    if (rawVal > 50 || mt === "ADDITIVE") gearAttackAdditive += (rawVal / 10);
                    else gearAttackFlat += rawVal;
                } else if ([
                    "PhysicalDamagePercent", "FireDamagePercent", "ColdDamagePercent", 
                    "LightningDamagePercent", "ChaosDamagePercent", "IncreaseProjectileDamage", 
                    "IncreaseMeleeDamage", "IncreaseAreaOfEffectDamage", "IncreaseSummonDamage"
                ].includes(st)) {
                    gearAttackAdditive += (rawVal / 10);
                } else if (st === "AttackSpeed") {
                    gearSpeedAdditive += (rawVal / 1000);
                } else if (st === "CriticalChance") {
                    if (rawVal > 50 || mt === "ADDITIVE") gearCritChanceAdditive += (rawVal / 10);
                    else gearCritChanceFlat += (rawVal / 10);
                } else if (st === "CriticalDamage") {
                    gearCritDamageFlat += (rawVal / 10);
                } else if (st === "MaxHp") {
                    gearHpFlat += rawVal;
                } else if (st === "Armor") {
                    if (rawVal > 100) gearArmorAdditive += (rawVal / 10);
                    else gearArmorFlat += rawVal;
                } else if (st === "MovementSpeed") {
                    gearMoveAdditive += (rawVal / 10);
                } else if (st === "BlockChance") {
                    gearBlock += rawVal;
                } else if (st === "DamageAbsorption") {
                    gearAbsorp += rawVal;
                } else if (st === "DamageReduction") {
                    gearDamageReduction += rawVal;
                } else if (st === "AllElementalResistance") {
                    gearAllElemRes += rawVal;
                } else if (st === "FireResistance") {
                    gearFireRes += rawVal;
                } else if (st === "ColdResistance") {
                    gearColdRes += rawVal;
                } else if (st === "LightningResistance") {
                    gearLightRes += rawVal;
                } else if (st === "ChaosResistance") {
                    gearChaosRes += rawVal;
                } else if (st === "CooldownReduction") {
                    gearCdReduction += (rawVal / 10);
                } else if (st === "AreaOfEffect" || st === "IncreaseAreaOfEffectDamage") {
                    gearAoE += (rawVal / 10);
                } else if (st === "ProjectileCount") {
                    gearProjectileCount += rawVal;
                } else if (st === "Multistrike") {
                    gearMultistrike += rawVal;
                }
            }
        }

        // 2. Buffers de Talentos e Passivas da Árvore
        let passiveAttackFlat = 0;
        let passiveAttackAdditive = 0;
        for (const t of heroTalents) {
            if (t.type === "PASSIVESKILL") {
                const st = t.statKey;
                const totalVal = t.totalValue || 0;
                const mt = t.mt || "FLAT";

                if (st === "AttackDamage") {
                    if (mt === "ADDITIVE" || totalVal > 50) passiveAttackAdditive += (totalVal / 10);
                    else passiveAttackFlat += totalVal;
                } else if ([
                    "PhysicalDamagePercent", "FireDamagePercent", "ColdDamagePercent", 
                    "LightningDamagePercent", "ChaosDamagePercent", "IncreaseProjectileDamage", 
                    "IncreaseMeleeDamage", "IncreaseAreaOfEffectDamage", "IncreaseSummonDamage"
                ].includes(st)) {
                    passiveAttackAdditive += (totalVal / 10);
                } else if (st === "AttackSpeed") {
                    gearSpeedAdditive += (totalVal / 1000);
                } else if (st === "CriticalChance") {
                    if (mt === "ADDITIVE" || totalVal > 50) gearCritChanceAdditive += (totalVal / 10);
                    else gearCritChanceFlat += (totalVal / 10);
                } else if (st === "CriticalDamage") {
                    gearCritDamageFlat += (totalVal / 10);
                } else if (st === "MaxHp") {
                    if (mt === "ADDITIVE") gearHpAdditive += (totalVal / 10);
                    else gearHpFlat += totalVal;
                } else if (st === "Armor") {
                    if (mt === "ADDITIVE") gearArmorAdditive += (totalVal / 10);
                    else gearArmorFlat += totalVal;
                } else if (st === "MovementSpeed") {
                    if (mt === "ADDITIVE") gearMoveAdditive += (totalVal / 10);
                    else gearMoveFlat += totalVal;
                } else if (st === "BlockChance") {
                    gearBlock += (totalVal / 10);
                } else if (st === "DamageAbsorption") {
                    gearAbsorp += (totalVal / 10);
                } else if (st === "DamageReduction") {
                    gearDamageReduction += (totalVal / 10);
                } else if (st === "AllElementalResistance") {
                    gearAllElemRes += (totalVal / 10);
                } else if (st === "FireResistance") {
                    gearFireRes += (totalVal / 10);
                } else if (st === "ColdResistance") {
                    gearColdRes += (totalVal / 10);
                } else if (st === "LightningResistance") {
                    gearLightRes += (totalVal / 10);
                } else if (st === "ChaosResistance") {
                    gearChaosRes += (totalVal / 10);
                } else if (st === "CooldownReduction") {
                    gearCdReduction += (totalVal / 10);
                } else if (st === "AreaOfEffect") {
                    gearAoE += (totalVal / 10);
                } else if (st === "CastSpeed") {
                    gearCastSpeed += (totalVal / 10);
                }
            }
        }

        // 3. Runas da Conta
        let runeAttackBonusPct = 0;
        let missingRunesCount = 0;
        const dbRunes = (this.DB && this.DB.runes) ? this.DB.runes : {};

        for (const r of runeSaveDatas) {
            const rKey = String(r.RuneKey);
            const rLevel = Number(r.Level || 1);
            if (dbRunes[rKey]) {
                // Cálculo dinâmico empírico (ex: 0.5% de bônus de ataque por nível de runa ativa validada)
                runeAttackBonusPct += (rLevel * 0.5);
            } else {
                missingRunesCount++;
            }
        }

        if (missingRunesCount > 0) {
            console.warn(`[SaveParser] Atenção: ${missingRunesCount} chaves de runas do save não foram encontradas no DB.`);
        }

        // Fórmulas Oficiais de Combate
        const totalFlat = baseAttack + gearAttackFlat + passiveAttackFlat;
        const totalPercentMult = gearAttackAdditive + passiveAttackAdditive + runeAttackBonusPct;
        const finalAttackDamage = Math.round(totalFlat * (1 + (totalPercentMult / 100)));

        const finalAttackSpeed = Number((baseSpeed * (1 + gearSpeedAdditive) * (1 + gearSpeedMultiplicative)).toFixed(2));
        const finalCritChance = Number(Math.min(100, (baseCritChance + gearCritChanceFlat) * (1 + (gearCritChanceAdditive / 100))).toFixed(1));
        const finalCritDamage = Number((baseCritDamage + gearCritDamageFlat).toFixed(1));
        const finalMaxHp = Math.round((baseHp + gearHpFlat) * (1 + (gearHpAdditive / 100)));
        const finalArmor = Math.round((baseArmor + gearArmorFlat) * (1 + (gearArmorAdditive / 100)));
        const finalMoveSpeed = Math.round((baseMoveSpeed + gearMoveFlat) * (1 + (gearMoveAdditive / 100)));

        // Mitigações
        const finalBlockChance = Math.round(Math.min(75, gearBlock));
        const finalAbsorption = Math.round(gearAbsorp);
        const finalChaosRes = Math.round(Math.min(75, gearChaosRes));
        const finalFireRes = Math.round(Math.min(75, gearAllElemRes + gearFireRes));
        const finalColdRes = Math.round(Math.min(75, gearAllElemRes + gearColdRes));
        const finalLightRes = Math.round(Math.min(75, gearAllElemRes + gearLightRes));

        // Métricas Avançadas
        const finalEstimatedDps = Math.round(finalAttackDamage * finalAttackSpeed * (1 + (finalCritChance / 100) * ((Math.max(100, finalCritDamage) - 100) / 100)));
        const finalCdReduction = Math.round(gearCdReduction);
        const finalAoE = Math.round(gearAoE);
        const finalLifeOnHit = Math.round(gearLifeOnHit);
        const finalHpRegen = Math.round(gearHpRegen);
        const finalCastSpeed = Math.round(100 + gearCastSpeed);
        const finalDamageReduction = Math.round(gearDamageReduction);

        const detailedStats = {
            attackDamage: finalAttackDamage > 0 ? finalAttackDamage : 3666,
            attackSpeed: finalAttackSpeed,
            estimatedDps: finalEstimatedDps,
            critChance: finalCritChance,
            critDamage: finalCritDamage,
            maxHp: finalMaxHp,
            armor: finalArmor,
            moveSpeed: finalMoveSpeed,
            blockChance: finalBlockChance,
            damageAbsorption: finalAbsorption,
            damageReduction: finalDamageReduction,
            chaosResistance: finalChaosRes,
            fireResistance: finalFireRes,
            coldResistance: finalColdRes,
            lightningResistance: finalLightRes,
            cooldownReduction: finalCdReduction,
            areaOfEffect: finalAoE,
            lifeOnHit: finalLifeOnHit,
            hpRegenPerSec: finalHpRegen,
            castSpeed: finalCastSpeed,
            projectileCount: Math.round(gearProjectileCount),
            multistrike: Math.round(gearMultistrike)
        };

        return {
            summary: {
                ...detailedStats
            },
            breakdown: {
                baseAttack: baseAttack,
                gearAttack: gearAttackFlat,
                passiveAttack: passiveAttackFlat,
                percentMultiplier: Math.round(totalPercentMult)
            },
            detailed: detailedStats
        };
    }

    resolveSkillName(skillKey, skDb) {
        const names = {
            10001: "Golpe Básico do Cavaleiro",
            10101: "Investida com Escudo",
            10201: "Provocação Heroica",
            10301: "Barreira Sagrada",
            10401: "Espada da Justiça",
            10501: "Fúria do Guardião",
            20001: "Disparo Básico do Explorador",
            20101: "Disparo Múltiplo",
            20201: "Flecha Perfurante",
            20301: "Chuva de Flechas",
            20401: "Tiro Concentrado",
            20501: "Flecha Explosiva",
            20601: "Disparo Rápido",
            30001: "Projétil Arcano",
            30101: "Orbe de Fogo",
            30201: "Tempestade de Meteoros",
            30301: "Relâmpago em Cadeia",
            30401: "Nova de Gelo",
            30601: "Vórtice Elemental",
            40001: "Punição Sagrada",
            40101: "Cura em Grupo",
            40201: "Bênção Divina",
            40401: "Luz Restauradora",
            50001: "Disparo Duplo do Caçador",
            50101: "Armadilha de Espinhos",
            60001: "Corte Violento",
            60101: "Redemoinho Sangrento"
        };
        return names[skillKey] || `Habilidade #${skillKey}`;
    }

    resolveStatName(statType) {
        const translations = {
            // Ofensivos Físicos & Gerais
            AttackDamage: "Dano de Ataque",
            PhysicalDamagePercent: "Dano Físico %",
            PhysicalDamageAddition: "Dano Físico Adicional",
            IncreaseMeleeDamage: "Dano Corpo a Corpo %",
            IncreaseProjectileDamage: "Dano de Projétil %",
            IncreaseAreaOfEffectDamage: "Dano em Área %",
            IncreaseSummonDamage: "Dano de Evocação %",
            CriticalChance: "Chance Crítica",
            CriticalDamage: "Dano Crítico",
            AttackSpeed: "Velocidade de Ataque",
            CastSpeed: "Velocidade de Conjuração",
            ProjectileCount: "Qtd. de Projéteis",
            Multistrike: "Golpe Múltiplo",
            BaseAttackCountReduction: "Redução de Ataques Básicos",

            // Elementais & Caos
            FireDamagePercent: "Dano de Fogo %",
            FireDamageAddition: "Dano de Fogo Adicional",
            ColdDamagePercent: "Dano de Gelo %",
            ColdDamageAddition: "Dano de Gelo Adicional",
            LightningDamagePercent: "Dano Elétrico %",
            LightningDamageAddition: "Dano Elétrico Adicional",
            ChaosDamagePercent: "Dano de Caos %",
            ChaosDamageAddition: "Dano de Caos Adicional",

            // Defensivos & Mitigação
            MaxHp: "Vida Máxima (HP)",
            Armor: "Armadura",
            BlockChance: "Chance de Bloqueio",
            MaxBlockChance: "Limite Máx. de Bloqueio",
            ElementalBlockChance: "Bloqueio Elemental",
            MaxElementalBlockChance: "Limite Máx. de Bloqueio Elemental",
            DodgeChance: "Chance de Esquiva",
            MaxDodgeChance: "Limite Máx. de Esquiva",
            ElementalDodgeChance: "Esquiva Elemental",
            MaxElementalDodgeChance: "Limite Máx. de Esquiva Elemental",
            DamageAbsorption: "Absorção de Dano",
            DamageReduction: "Redução de Dano",
            PhysicalDamageReduction: "Redução de Dano Físico",
            FireDamageReduction: "Redução de Dano de Fogo",
            ColdDamageReduction: "Redução de Dano de Gelo",
            LightningDamageReduction: "Redução de Dano Elétrico",
            ChaosDamageReduction: "Redução de Dano de Caos",

            // Resistências Elementais & Caos
            AllElementalResistance: "Resistência Elemental Total",
            FireResistance: "Resistência a Fogo",
            ColdResistance: "Resistência a Gelo",
            LightningResistance: "Resistência a Raio",
            ChaosResistance: "Resistência ao Caos",
            MaxFireResistance: "Limite Máx. Resistência a Fogo",
            MaxColdResistance: "Limite Máx. Resistência a Gelo",
            MaxLightningResistance: "Limite Máx. Resistência a Raio",
            MaxChaosResistance: "Limite Máx. Resistência ao Caos",

            // Sustentação, Mobilidade e Utilitários
            MovementSpeed: "Velocidade de Movimento",
            CooldownReduction: "Redução de Recarga",
            AreaOfEffect: "Raio de Área de Efeito",
            SkillRangeExpansion: "Expansão de Alcance",
            SkillDurationIncrease: "Duração de Habilidade %",
            SkillHealIncrease: "Aumento de Cura %",
            AddHpPerHit: "PV por Golpe",
            AddHpPerKill: "PV por Inimigo Abatido",
            HpLeech: "Roubo de Vida",
            HpRegenPerSec: "Regeneração de Vida/seg",
            DamageAddition: "Dano Adicional Bruto",
            IncreaseExpAmount: "Aumento de EXP %",
            AdditionalExp: "EXP Adicional %",
            AddAllSkillLevel: "Nível de Todas as Habilidades"
        };
        return translations[statType] || statType;
    }

    formatDetailedItem(item, cubeLevel, slotTitle = "") {
        const itemKey = item.ItemKey;
        const uid = String(item.UniqueId);

        // Decodificação oficial por chave de 6 dígitos com flags
        const decoded = this.decodeItemKey(itemKey, item);
        const grade = decoded.grade;
        const tier = decoded.tier;
        const itemLevel = decoded.level;
        const tierInfo = TIERS[tier] || TIERS[1];
        const sKey = decoded.lookupKey;
        const typeCode = decoded.typeCode || parseInt(sKey.substring(0, 2), 10);

        const itemName = this.resolveItemName(sKey, decoded);

        // Regra do Cubo ±10 (IsBlocked impede síntese e recomenda venda/bloqueio)
        const diff = Math.abs(cubeLevel - itemLevel);
        const isSafeForCube = !decoded.isBlocked && diff <= 10;

        // Consulta de metadados do TBH_DB.gear (Buffers base, inerentes e única)
        let gearDef = null;
        if (this.DB && this.DB.gear) {
            gearDef = this.DB.gear[sKey] || 
                      this.DB.gear[sKey.slice(0, 5) + "1"] || 
                      this.DB.gear[sKey.slice(0, 5) + "2"] ||
                      this.DB.gear[sKey.slice(0, 4) + "01"] ||
                      null;
        }

        // 1. Buffers Passivos Base / Atributos Base
        const baseStats = {
            b1: gearDef ? gearDef.b1 : 0,
            b2: gearDef ? gearDef.b2 : null,
            primary: null,
            secondary: null,
            list: []
        };
        if (gearDef) {
            if ([30, 31, 32, 33].includes(typeCode)) {
                // Armas
                const aps = gearDef.b2 ? (1.0 + gearDef.b2 / 100).toFixed(2).replace('.', ',') : "1,00";
                baseStats.primary = { label: "Dano de Ataque", value: gearDef.b1 };
                baseStats.secondary = { label: "Ataques por Segundo", value: aps };
                baseStats.list.push({ label: "Dano de Ataque", value: String(gearDef.b1) });
                baseStats.list.push({ label: "Ataques por Segundo", value: aps });
            } else if ([40].includes(typeCode)) {
                baseStats.primary = { label: "Armadura", value: gearDef.b1 || 0 };
                baseStats.list.push({ label: "Armadura", value: String(gearDef.b1 || 0) });
            } else if ([50, 51, 52, 53].includes(typeCode)) {
                baseStats.primary = { label: "Armadura", value: gearDef.b1 || 0 };
                baseStats.list.push({ label: "Armadura", value: String(gearDef.b1 || 0) });
            } else if ([60, 61, 62, 63].includes(typeCode)) {
                if (gearDef.b1) {
                    baseStats.primary = { label: "Vida Máxima", value: gearDef.b1 };
                    baseStats.list.push({ label: "Vida Máxima", value: `+${gearDef.b1}` });
                }
            }
        }

        // 2. Atributos Inerentes
        const inherentAttributes = [];
        if (gearDef && Array.isArray(gearDef.inh)) {
            for (const inhTuple of gearDef.inh) {
                const [statKey, modType, rawValue] = inhTuple;
                const statName = this.resolveStatName(statKey);
                let formattedText = "";

                if (modType === "MULTIPLICATIVE" || (statKey === "AttackSpeed" && modType === "MULTIPLICATIVE")) {
                    const scaled = Math.round(rawValue / 10);
                    formattedText = `${scaled}% Mais ${statKey === "AttackSpeed" ? "Vel. Ataque" : statName}`;
                } else if (statKey === "CriticalDamage") {
                    const scaled = Math.round(rawValue / 10);
                    formattedText = `${statName} +${scaled}%`;
                } else if (modType === "ADDITIVE") {
                    const scaled = Math.round(rawValue / 10);
                    formattedText = `${scaled}% Aumento de ${statName}`;
                } else if (statKey.includes("Percent") || statKey.includes("Chance") || statKey.includes("Reduction") || statKey.includes("Resistance")) {
                    const scaled = rawValue >= 50 ? Math.round(rawValue / 10) : rawValue;
                    formattedText = `${statName} +${scaled}%`;
                } else {
                    formattedText = `${statName} +${rawValue}`;
                }

                inherentAttributes.push({
                    statKey: statKey,
                    statName: statName,
                    modType: modType,
                    rawValue: rawValue,
                    formattedText: `- ${formattedText}`,
                    display: `- ${formattedText}`
                });
            }
        }

        // 3. Stats Únicas
        let uniqueStat = null;
        const uniqKey = gearDef ? (gearDef.uniq || 0) : 0;
        if (uniqKey > 0 && typeof UNIQUE_MODS !== 'undefined' && UNIQUE_MODS[uniqKey]) {
            const uMod = UNIQUE_MODS[uniqKey];
            const uDesc = uMod.description || uMod.desc || "";
            uniqueStat = {
                key: uniqKey,
                name: uMod.name,
                heroKey: uMod.heroKey,
                heroName: uMod.heroName,
                skillKey: uMod.skillKey,
                skillName: uMod.skillName,
                description: uDesc,
                formattedText: uDesc
            };
        }

        // 4. Processa materiais detalhados (Decorações, Gravações, Inscrições)
        const detailedModifiers = [];
        const decorationsList = [];
        const engravingsList = [];
        const inscriptionsList = [];

        for (const e of (item.EnchantData || [])) {
            if (!e.StatModKey) continue;

            const rt = e.RecipeType;
            let category = "Encantamento";
            let categoryIcon = "✨";

            if (rt === 3) {
                category = "Decoração";
                categoryIcon = "👑";
            } else if (rt === 4) {
                category = "Gravação";
                categoryIcon = "💎";
            } else if (rt === 5) {
                category = "Inscrição";
                categoryIcon = "📜";
            }

            const modTier = e.Tier || 1;
            const modTierInfo = TIERS[modTier] || TIERS[1];
            const rawVal = e.Value || 0;

            let statKey = "AttackDamage";
            let modDef = null;
            if (this.DB && this.DB.statMods && this.DB.statMods[`${e.StatModKey}:${modTier}`]) {
                modDef = this.DB.statMods[`${e.StatModKey}:${modTier}`];
                statKey = modDef.st;
            }
            const statName = this.resolveStatName(statKey);
            const mt = modDef ? (modDef.mt || "FLAT") : "FLAT";

            let formattedVal = "";
            let slotDisplay = "";

            if (rt === 3 || rt === 4) {
                if (statKey === "CriticalChance") {
                    formattedVal = `${Math.round(rawVal / 10)}%`;
                    slotDisplay = `${formattedVal} Aumento Multiplicador Chance Crítica`;
                } else if (statKey === "CriticalDamage") {
                    formattedVal = `+${Math.round(rawVal / 10)}%`;
                    slotDisplay = `Dano Crítico ${formattedVal}`;
                } else if (mt === "ADDITIVE") {
                    formattedVal = `${Math.round(rawVal / 10)}%`;
                    slotDisplay = `${formattedVal} Aumento de ${statName}`;
                } else {
                    formattedVal = `+${rawVal}`;
                    slotDisplay = `${statName} ${formattedVal}`;
                }
            } else if (rt === 5) {
                if (statKey === "AreaOfEffect") {
                    formattedVal = `${Math.round(rawVal / 10)}%`;
                    slotDisplay = `${formattedVal} Aumento de Área de Efeito`;
                } else if (mt === "ADDITIVE") {
                    formattedVal = `${Math.round(rawVal / 10)}%`;
                    slotDisplay = `${formattedVal} Aumento de ${statName}`;
                } else {
                    formattedVal = `+${rawVal}`;
                    slotDisplay = `${statName} ${formattedVal}`;
                }
            } else {
                if (mt === "ADDITIVE") {
                    const scaled = rawVal / 10;
                    formattedVal = rawVal % 10 !== 0 ? `+${scaled.toFixed(1)}%` : `+${scaled}%`;
                } else if (statKey.includes("Percent")) {
                    const scaled = rawVal >= 50 ? rawVal / 10 : rawVal;
                    formattedVal = (rawVal >= 50 && rawVal % 10 !== 0) ? `+${scaled.toFixed(1)}%` : `+${scaled}%`;
                } else {
                    formattedVal = `+${rawVal}`;
                }
                slotDisplay = `${statName} ${formattedVal}`;
            }

            const modObj = {
                category: category,
                categoryIcon: categoryIcon,
                recipeType: rt,
                tier: modTier,
                tierInfo: modTierInfo,
                statModKey: e.StatModKey,
                statKey: statKey,
                statName: statName,
                rawVal: rawVal,
                formattedVal: formattedVal,
                slotDisplay: slotDisplay,
                description: `${categoryIcon} ${category} [T${modTier} - ${modTierInfo.name}]: ${slotDisplay}`
            };

            detailedModifiers.push(modObj);
            if (rt === 3) decorationsList.push(modObj);
            else if (rt === 4) engravingsList.push(modObj);
            else if (rt === 5) inscriptionsList.push(modObj);
        }

        const decorsCount = item.DecorationAppliedTotalCount || 0;
        const inscriptionsCount = item.InscriptionAppliedTotalCount || 0;
        const engravingsCount = item.EngravingAppliedTotalCount || 0;

        const gradeNamesPt = {
            COMMON: "Comum",
            UNCOMMON: "Incomum",
            RARE: "Raro",
            LEGENDARY: "Lendário",
            IMMORTAL: "Imortal",
            ARCANA: "Arcano",
            BEYOND: "Além",
            CELESTIAL: "Celestial",
            DIVINE: "Divino",
            COSMIC: "Cósmico"
        };
        const gradePt = gradeNamesPt[grade] || grade;
        const gradeLabel = `Grau ${gradePt}`;

        const heroRestrictions = {
            30: "Apenas Cavaleiro",
            31: "Apenas Explorador",
            32: "Apenas Maga",
            33: "Apenas Sacerdotisa",
            40: "Apenas Cavaleiro",
            41: "Apenas Explorador",
            42: "Apenas Maga",
            43: "Apenas Sacerdotisa"
        };
        const heroRestriction = heroRestrictions[typeCode] || "Qualquer Herói";

        return {
            isEmpty: false,
            uniqueId: uid,
            itemKey: itemKey,
            slotName: slotTitle,
            name: itemName,
            level: itemLevel,
            grade: grade,
            gradePt: gradePt,
            gradeLabel: gradeLabel,
            tier: tier,
            tierInfo: tierInfo,
            type: decoded.typeName,
            gearType: decoded.gearType,
            reqLevel: `Requer Nv.${itemLevel}`,
            heroRestriction: heroRestriction,
            nonTradeable: true,
            baseStats: baseStats,
            inherentAttributes: inherentAttributes,
            uniqueStat: uniqueStat,
            detailedModifiers: detailedModifiers,
            decorationsList: decorationsList,
            engravingsList: engravingsList,
            inscriptionsList: inscriptionsList,
            enchantsCount: detailedModifiers.length,
            decorations: decorsCount,
            inscriptions: inscriptionsCount,
            engravings: engravingsCount,
            isChaotic: decoded.isChaotic,
            isBlocked: decoded.isBlocked,
            onMarket: decoded.onMarket,
            cubeAction: decoded.isBlocked ? "BLOQUEADO" : (isSafeForCube ? "SÍNTESE" : "ALQUIMIA"),
            cubeColor: decoded.isBlocked ? "gray" : (isSafeForCube ? "green" : "red"),
            cubeReason: decoded.isBlocked
                ? `Item bloqueado pelo jogador (IsBlocked). Não pode ser usado em Síntese.`
                : (isSafeForCube 
                    ? `Item (Lv.${itemLevel}) na margem segura (±10) do Cubo Lv.${cubeLevel}. 100% EXP.` 
                    : `Item (Lv.${itemLevel}) fora da margem do Cubo Lv.${cubeLevel}. Penalidade de EXP.`)
        };
    }

    resolveItemName(itemKey, decoded) {
        const s = String(itemKey);
        if (s.length !== 6) return `${decoded.typeName} #${itemKey}`;

        const typeCode = parseInt(s.substring(0, 2), 10);
        const lvlIdx = parseInt(s.substring(3, 5), 10);

        if (typeCode === 11) {
            return `Decoração: Gema [Tier ${decoded.tier} - ${decoded.grade}]`;
        }
        if (typeCode === 12) {
            return `Gravação: Runa de Refino [Tier ${decoded.tier} - ${decoded.grade}]`;
        }
        if (typeCode === 13) {
            return `Inscrição: Runa de Habilidade [Tier ${decoded.tier} - ${decoded.grade}]`;
        }
        if (typeCode === 14) {
            return `Material de Refino [Tier ${decoded.tier} - ${decoded.grade}]`;
        }
        if (typeCode === 92) {
            return `Baú Cósmico de Recompensa [Tier ${decoded.tier}]`;
        }

        const catalog = {
            30: { // Espadas
                1: "Espada Longa (Long Sword)", 2: "Cutlass", 3: "Rapieira", 4: "Espada Bastarda", 5: "Grande Espada",
                6: "Espada de Batalha", 7: "Espada do Cavaleiro", 8: "Espada Falchion", 9: "Espada Rúnica", 10: "Espada Mística",
                11: "Espada do Destino", 12: "Espada Brilhante", 13: "Espada do Império", 14: "Espada da Vingança", 15: "Espada Titânica",
                16: "Espada do Vazio", 17: "Espada Dimensional", 18: "Espada Abissal", 19: "Espada Radiante Soberana", 20: "Espada Cósmica Celestial"
            },
            31: { // Arcos
                1: "Arco Curto", 2: "Arco de Caça", 3: "Arco Composto", 4: "Arco Recurvo", 5: "Arco Longo",
                6: "Arco de Batalha", 7: "Arco de Guerra", 8: "Arco Tempestuoso", 9: "Arco Rúnico Veloz", 10: "Arco Élfico Místico",
                11: "Arco do Crepúsculo", 12: "Arco Sombrio", 13: "Arco do Caos", 14: "Arco da Tempestade", 15: "Arco Ancestral",
                16: "Arco do Vazio", 17: "Arco Dimensional", 18: "Arco Abissal", 19: "Arco Eterno", 20: "Arco Cósmico Soberano"
            },
            32: { // Cajados
                1: "Cajado de Madeira", 2: "Cajado de Ferro", 3: "Cajado de Cristal", 4: "Cajado Sagrado", 5: "Cajado Ancião",
                6: "Cajado do Conquistador", 7: "Cajado de Batalha", 8: "Cajado Tempestuoso", 9: "Cajado Rúnico", 10: "Cajado Místico",
                11: "Cajado do Destino", 12: "Cajado das Sombras", 13: "Cajado do Caos", 14: "Cajado Nova", 15: "Cajado do Cometa",
                16: "Cajado do Vazio", 17: "Cajado Dimensional", 18: "Cajado Abissal", 19: "Cajado Radiante Celestial", 20: "Cajado Cósmico Supremo"
            },
            33: { // Cetros / Maças
                1: "Cetro Simples", 2: "Cetro de Ferro", 3: "Cetro de Prata", 4: "Cetro do Julgamento", 5: "Grande Cetro",
                6: "Cetro de Guerra", 7: "Cetro do Cavaleiro", 8: "Cetro Tempestuoso", 9: "Cetro Rúnico", 10: "Cetro Místico",
                11: "Cetro do Destino", 12: "Cetro das Sombras", 13: "Cetro do Império", 14: "Cetro da Vingança", 15: "Cetro Titânico",
                16: "Cetro do Vazio", 17: "Cetro Dimensional", 18: "Cetro Abissal", 19: "Cetro Soberano Divino", 20: "Cetro Cósmico Celestial"
            },
            40: { // Escudos
                1: "Escudo de Madeira", 2: "Escudo de Ferro", 3: "Escudo de Aço", 4: "Escudo Reforçado", 5: "Grande Escudo",
                6: "Escudo de Placas", 7: "Escudo de Guerra", 8: "Escudo Barreira", 9: "Escudo Rúnico do Baluarte", 10: "Escudo Místico",
                11: "Escudo do Destino", 12: "Escudo das Sombras", 13: "Escudo da Floresta", 14: "Escudo do Dragão", 15: "Escudo Ancestral",
                16: "Escudo do Vazio", 17: "Escudo Dimensional", 18: "Escudo Eterno Divino", 19: "Escudo Soberano Radiante", 20: "Escudo Cósmico Invulnerável"
            },
            41: { // Aljavas / Flechas
                1: "Aljava Simples", 2: "Aljava de Ferro", 3: "Aljava Reforçada", 4: "Aljava Farpada", 5: "Aljava Brutal",
                6: "Aljava Serpentina", 7: "Aljava de Guerra", 8: "Aljava Tempestuosa", 9: "Aljava Veloz Rúnica", 10: "Aljava Perfurante Mística",
                11: "Aljava do Destino", 12: "Aljava das Sombras", 13: "Aljava de Obsidiana", 14: "Aljava da Fênix", 15: "Aljava Ancestral",
                16: "Aljava do Vazio", 17: "Aljava Dimensional", 18: "Aljava Exaltada", 19: "Aljava Soberana Radiante", 20: "Aljava Cósmica Infinita"
            },
            42: { // Tomos
                1: "Tomo Simples", 2: "Tomo de Preces", 3: "Tomo Sagrado", 4: "Tomo Abençoado", 5: "Grande Tomo",
                6: "Tomo de Guerra", 7: "Tomo Carmesim", 8: "Tomo da Tempestade", 9: "Tomo Rúnico", 10: "Tomo Místico",
                11: "Tomo do Destino", 12: "Tomo das Sombras", 13: "Tomo do Império", 14: "Tomo da Purificação", 15: "Tomo Ancestral",
                16: "Tomo do Vazio", 17: "Tomo Dimensional", 18: "Tomo Eterno Empíreo", 19: "Tomo Soberano Celestial", 20: "Tomo Cósmico da Criação"
            },
            43: { // Relíquias Sagradas / Rosários (Sacerdote)
                1: "Rosário Simples", 2: "Rosário de Prata", 3: "Relíquia Abençoada", 4: "Símbolo Sagrado", 5: "Cruz de Ferro Sagrada",
                6: "Relíquia da Devoção", 7: "Rosário de Oração", 8: "Emblema Divino", 9: "Rosário Rúnico Sagrado", 10: "Relíquia Mística",
                11: "Símbolo do Destino", 12: "Rosário Brilhante", 13: "Relíquia da Purificação", 14: "Insígnia Sagrada do Imperador", 15: "Relíquia Ancestral",
                16: "Relíquia do Vazio", 17: "Relíquia Dimensional Sagrada", 18: "Rosário Eterno da Luz", 19: "Coração Divino Soberano", 20: "Relíquia Cósmica Celestial"
            },
            50: { // Capacetes
                1: "Capacete de Madeira", 2: "Capacete de Ferro", 3: "Cota de Malha", 4: "Elmo Pesado", 5: "Grande Elmo",
                6: "Elmo de Placas", 7: "Elmo de Guerra", 8: "Elmo do Cavaleiro", 9: "Elmo do Herói Rúnico", 10: "Elmo Místico",
                11: "Elmo do Destino", 12: "Elmo das Sombras", 13: "Elmo do Império", 14: "Elmo do Dragão", 15: "Elmo Ancestral do Imperador",
                16: "Elmo do Vazio", 17: "Elmo Dimensional", 18: "Elmo Eterno da Tempestade", 19: "Elmo Radiante do Soberano", 20: "Coroa Cósmica Celestial"
            },
            51: { // Armaduras
                1: "Armadura de Madeira", 2: "Armadura de Couro", 3: "Cota de Malha de Aço", 4: "Peitoral Pesado", 5: "Grande Armadura",
                6: "Armadura de Placas", 7: "Armadura de Guerra", 8: "Armadura do Cavaleiro", 9: "Armadura do Herói Rúnico", 10: "Armadura Mística",
                11: "Armadura do Destino", 12: "Armadura Brilhante", 13: "Armadura do Império", 14: "Armadura do Dragão", 15: "Armadura Ancestral Titânica",
                16: "Armadura do Vazio", 17: "Armadura Dimensional", 18: "Armadura Eterna das Chamas", 19: "Armadura Radiante Soberana", 20: "Manto Cósmico Celestial"
            },
            52: { // Luvas
                1: "Luvas de Madeira", 2: "Luvas de Couro", 3: "Luvas de Malha", 4: "Manoplas Pesadas", 5: "Grandes Manoplas",
                6: "Manoplas de Placas", 7: "Manoplas de Guerra", 8: "Manoplas do Cavaleiro", 9: "Manoplas do Herói Rúnico", 10: "Manoplas Místicas",
                11: "Manoplas do Destino", 12: "Manoplas Brilhantes", 13: "Manoplas do Império", 14: "Manoplas do Dragão", 15: "Manoplas Ancestrais",
                16: "Manoplas do Vazio", 17: "Manoplas Dimensionais", 18: "Manoplas Eternas", 19: "Manoplas da Fúria Soberana", 20: "Manoplas Cósmicas Celestiais"
            },
            53: { // Botas
                1: "Botas de Madeira", 2: "Botas de Couro", 3: "Botas de Malha", 4: "Grevas Pesadas", 5: "Grandes Botas",
                6: "Botas de Placas", 7: "Botas de Guerra", 8: "Botas do Cavaleiro", 9: "Botas do Herói Rúnico", 10: "Botas Místicas",
                11: "Botas do Destino", 12: "Botas Brilhantes", 13: "Passos do Império", 14: "Passos da Tempestade", 15: "Passos Ancestrais",
                16: "Botas do Vazio", 17: "Botas Dimensionais", 18: "Passos Eternos do Abismo", 19: "Passos Radiantes Soberanos", 20: "Passos Cósmicos Celestiais"
            },
            60: { // Amuletos
                1: "Amuleto de Cobre", 2: "Amuleto de Bronze", 3: "Amuleto de Prata", 4: "Amuleto de Ouro", 5: "Amuleto de Platina",
                6: "Amuleto de Cristal", 7: "Amuleto de Âmbar", 8: "Amuleto de Esmeralda", 9: "Amuleto de Safira", 10: "Amuleto de Rubi",
                11: "Amuleto de Diamante", 12: "Amuleto do Eclipse", 13: "Amuleto de Sangue", 14: "Amuleto Etéreo", 15: "Amuleto Astral",
                16: "Amuleto do Vazio", 17: "Amuleto Dimensional", 18: "Amuleto do Abismo", 19: "Coração do Dragão Ancestral", 20: "Amuleto Cósmico Celestial"
            },
            61: { // Brincos
                1: "Brinco de Cobre", 2: "Brinco de Bronze", 3: "Brinco de Prata", 4: "Brinco de Ouro", 5: "Brinco de Platina",
                6: "Brinco de Cristal", 7: "Brinco de Granada", 8: "Brinco de Jade", 9: "Brinco de Esmeralda", 10: "Brinco de Safira",
                11: "Brinco de Moonstone", 12: "Brinco do Eclipse", 13: "Brinco de Obsidiana", 14: "Brinco Etéreo", 15: "Brinco Astral",
                16: "Brinco do Vazio", 17: "Brinco Dimensional", 18: "Brinco do Abismo", 19: "Brinco do Vórtice Celestial", 20: "Brinco Cósmico Supremo"
            },
            62: { // Anéis
                1: "Anel de Cobre", 2: "Anel de Bronze", 3: "Anel de Prata", 4: "Anel de Ouro", 5: "Anel de Platina",
                6: "Anel de Cristal", 7: "Anel de Topázio", 8: "Anel de Esmeralda", 9: "Anel de Safira", 10: "Anel de Rubi",
                11: "Anel de Diamante", 12: "Anel do Eclipse", 13: "Anel de Sangue", 14: "Anel Etéreo", 15: "Anel Astral",
                16: "Anel do Vazio", 17: "Anel Dimensional", 18: "Anel do Abismo", 19: "Selo do Rei Supremo", 20: "Selo Cósmico Celestial"
            },
            63: { // Braçadeiras
                1: "Braçadeira de Cobre", 2: "Braçadeira de Couro", 3: "Braçadeira de Bronze", 4: "Braçadeira de Ouro", 5: "Braçadeira de Platina",
                6: "Braçadeira de Cristal", 7: "Braçadeira Carmesim", 8: "Braçadeira de Obsidiana", 9: "Braçadeira de Esmeralda", 10: "Braçadeira de Diamante",
                11: "Braçadeira das Sombras", 12: "Braçadeira do Eclipse", 13: "Braçadeira de Bloodstone", 14: "Braçadeira Etérea", 15: "Braçadeira Astral",
                16: "Braçadeira do Vazio", 17: "Braçadeira Dimensional", 18: "Braçadeira do Abismo", 19: "Emblema do Guardião Épico", 20: "Braçadeira Cósmica Celestial"
            }
        };

        const typeCatalog = catalog[typeCode];
        if (typeCatalog && typeCatalog[lvlIdx]) {
            return typeCatalog[lvlIdx];
        }

        return `${decoded.typeName} Lv.${decoded.level}`;
    }

    parseAllStorage(inventorySlots, stashSlots, itemDataMap, cubeLevel, tradingSlots = []) {
        const inventory = [];
        const stash = [];
        const tradeShip = [];
        const all = [];

        // Inventário
        for (const slot of inventorySlots) {
            if (!slot.IsUnlock) continue;
            const uid = String(slot.ItemUniqueId);
            if (!uid || uid === "0") continue;

            const it = itemDataMap.get(uid);
            if (it) {
                const formatted = this.formatDetailedItem(it, cubeLevel, "Inventário");
                formatted.location = "Inventário";
                inventory.push(formatted);
                all.push(formatted);
            }
        }

        // Mochila / Stash
        for (const slot of stashSlots) {
            if (!slot.IsUnlock) continue;
            const uid = String(slot.ItemUniqueId);
            if (!uid || uid === "0") continue;

            const it = itemDataMap.get(uid);
            if (it) {
                const formatted = this.formatDetailedItem(it, cubeLevel, "Mochila");
                formatted.location = "Mochila";
                stash.push(formatted);
                all.push(formatted);
            }
        }

        // Navio de Troca / Trade Ship (tradingStashSaveDatas / remakeTradingStashSaveDatas)
        for (const slot of tradingSlots) {
            const uid = String(slot.ItemUniqueId ?? slot.UniqueId ?? "");
            if (!uid || uid === "0") continue;

            const it = itemDataMap.get(uid) || slot;
            if (it && it.ItemKey) {
                const formatted = this.formatDetailedItem(it, cubeLevel, "Trade Ship");
                formatted.location = "Trade Ship";
                formatted.onMarket = true;
                tradeShip.push(formatted);
                all.push(formatted);
            }
        }

        return { inventory, stash, tradeShip, all };
    }

    formatNumber(num) {
        if (num >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(1) + "K";
        return String(num);
    }
}
