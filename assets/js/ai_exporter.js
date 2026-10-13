/**
 * AI Exporter v3.0 (END GAME & DEEP COMBAT AUDIT SPEC)
 * Unifica a profundidade cirúrgica da v2.7 com as regras de End Game v3.0:
 * - Hard Caps explícitos (Chance Crítica 100%, Bloqueio 75%, Resistências 75%)
 * - Penalidade de Tormento (-60% em resistências elementais e caos)
 * - Auditoria Completa de 4 Pilares de Combate (Falso Dano, Mitigação, Sinergia e Economia)
 * - Telemetria de Estágio, Cronometria e Contaminação (Peste)
 * - Folha Técnica Completa de Atributos Detalhados por Herói
 * - Mapa de Forja Completo dos 10 Slots de Equipamento (com Detecção de Slots Mortos e Avisos de Regra)
 * - Árvore de Habilidades & Talentos Ativos e Passivos
 * - Estoque e Inventário Filtrados e Roteados (Síntese vs Alquimia vs Corrosão)
 * - Diretrizes Estratégicas para IA
 * - [RSK-SEC-004] Sanitização de PII
 */

import { parseStageLogs, getStageClearStats } from './save_parser.js';

const HARD_CAPS = {
    critChance: 100,        // 100%
    blockChance: 75,        // 75%
    maxResist: 75,          // 75%
    evasion: 75             // 75%
};

const TORMENT_PENALTY = 60; // -60% resistências no Tormento

/**
 * [RSK-SEC-004] Sanitização de PII para exportação
 */
export function sanitizePII(data) {
    if (typeof window !== 'undefined' && window.TTBH_CONFIG && window.TTBH_CONFIG.anonimizePII === false) {
        return data;
    }
    if (!data) return data;
    
    const sanitized = JSON.parse(JSON.stringify(data));
    
    if (sanitized.account) {
        if (sanitized.account.ownerSteamId) sanitized.account.ownerSteamId = '[STEAM_ID_ANONIMIZADO]';
        if (sanitized.account.username) sanitized.account.username = '[USUARIO_ANONIMIZADO]';
    }
    if (sanitized.ownerSteamId) sanitized.ownerSteamId = '[STEAM_ID_ANONIMIZADO]';
    if (sanitized.username) sanitized.username = '[USUARIO_ANONIMIZADO]';
    
    const keysToCheck = ['heroes', 'items', 'inventory', 'stash', 'characters', 'allStorageItems'];
    keysToCheck.forEach(key => {
        if (Array.isArray(sanitized[key])) {
            sanitized[key].forEach(item => {
                if (item && item.ownerSteamId) item.ownerSteamId = '[STEAM_ID_ANONIMIZADO]';
                if (item && item.username) item.username = '[USUARIO_ANONIMIZADO]';
            });
        }
    });
    
    return sanitized;
}

/**
 * Calcula diagnóstico de atributo com Hard Cap
 */
function diagnoseStat(value, cap, label, isResist = false) {
    const val = Number(value) || 0;
    const effectiveValue = isResist ? (val - TORMENT_PENALTY) : val;
    const percentage = effectiveValue.toFixed(1);
    const capPercentage = cap.toFixed(0);
    
    let diagnosis = '✅ OK';
    if (effectiveValue < cap * 0.9) {
        diagnosis = `⚠️ Falta ${(cap - effectiveValue).toFixed(1)}%`;
    } else if (effectiveValue > cap) {
        diagnosis = `❌ Excesso ${(effectiveValue - cap).toFixed(1)}%`;
    }
    
    const baseNote = isResist ? ` (Base: ${val.toFixed(1)}% - ${TORMENT_PENALTY}% Tormento)` : '';
    return `| **${label}** | ${percentage}% | ${capPercentage}% | ${diagnosis}${baseNote} |`;
}

/**
 * Gera aviso de regra para equipamento
 */
function getGearWarning(slotName, item) {
    if (!item || item.isEmpty) return '⚠️ Slot Vazio / Morto';
    const warnings = [];
    const slotType = String(slotName || '').toLowerCase();
    
    const decors = item.decorationsList || [];
    const engravings = item.engravingsList || [];
    const inscriptions = item.inscriptionsList || [];
    const detailed = item.detailedModifiers || [];
    const allGems = [...(item.gems || []), ...decors, ...engravings, ...inscriptions, ...detailed];
    
    allGems.forEach(gem => {
        if (!gem) return;
        const gemName = gem.name || gem.slotDisplay || gem.statName || '';
        
        if (slotType.includes('arma') && (gemName.includes('Defesa') || gemName.includes('Bloqueio'))) {
            warnings.push('Inconsistência: Defesa na Arma');
        }
        
        if ((slotType.includes('armadura') || slotType.includes('capacete') || slotType.includes('peitoral')) && gemName.includes('Dano')) {
            warnings.push('Inconsistência: Dano na Armadura');
        }
        
        const tier = gem.tier || gem.Tier || 0;
        if (tier > 0 && tier <= 4 && (item.tier || 0) >= 6) {
            warnings.push(`Slot Morto: Mod T${tier} em Item T${item.tier}`);
        }
    });
    
    return warnings.length > 0 ? warnings.join(', ') : 'OK';
}

/**
 * Motor de Auditoria Cirúrgica de Combate
 */
export class CombatAuditor {
    static runAudit(data) {
        const heroes = data.heroes || [];
        const common = (data.raw && data.raw.commonSaveData) ? data.raw.commonSaveData : {};
        const arrangedKeys = common.arrangedHeroKey || [];
        const partyHeroes = heroes.filter(h => h.inParty || arrangedKeys.includes(h.heroKey));
        const activePet = data.activePet || {};
        const currentStageKey = Number(data.account?.currentStageKey || common.currentStageKey || 0);
        const cubeLevel = Number(data.cube?.level || 1);
        const allStorage = data.allStorageItems || [];

        // -------------------------------------------------------------
        // A. Eficiência de DPS Bruto (O "Falso Dano")
        // -------------------------------------------------------------
        const dpsAudits = [];

        partyHeroes.forEach(h => {
            const st = h.baseStats || {};
            const bd = h.statBreakdowns || {};
            const critDamage = Number(st.critDamage) || 0;
            const critChance = Number(st.critChance) || 0;
            const attackSpeed = Number(st.attackSpeed) || 1;
            const attackDamage = Number(st.attackDamage) || 0;

            // 1. Taxa de Conversão Crítica
            if (critDamage >= 800 && critChance < 75) {
                dpsAudits.push({
                    type: "ENDGAME_CRIT_CONVERSION",
                    severity: "CRITICAL",
                    hero: h.name,
                    title: `🚨 Falso Dano em High-Tier: ${h.name}`,
                    diagnostic: `No End Game, o Dano Crítico massivo de ${critDamage}% é "Falso Dano" porque a Chance Crítica (${critChance}%) está abaixo do limiar de consistência de 75%. Substitua inscrições secundárias por Chance Crítica T8+ imediatamente.`
                });
            } else if (critDamage > 200 && critChance < 50) {
                dpsAudits.push({
                    type: "CRIT_CONVERSION",
                    severity: "CRITICAL",
                    hero: h.name,
                    title: `🚨 Alerta Crítico: Falso Dano no Herói ${h.name}`,
                    diagnostic: `Aviso de Falso Dano. O Dano Crítico de ${critDamage}% está ocioso porque a Chance Crítica é de apenas ${critChance}%. Priorize decorações T5+ de Chance Crítica nos Acessórios para estabilizar o DPS.`
                });
            } else if (critChance < 35 && critDamage >= 150) {
                dpsAudits.push({
                    type: "CRIT_CONVERSION_WARN",
                    severity: "WARNING",
                    hero: h.name,
                    title: `⚠️ Aviso de Conversão Crítica: ${h.name}`,
                    diagnostic: `Chance Crítica em ${critChance}% (Dano Crítico: ${critDamage}%). O DPS oscila demasiadamente contra chefes de fase. Recomenda-se elevar a Chance Crítica acima de 50%.`
                });
            }

            // 2. Frequência vs Impacto
            if ((h.cls === "Ranger" || h.cls === "Slayer" || h.heroKey === 201) && attackSpeed >= 2.5) {
                if (attackDamage < 500000 || (bd.baseAttack && bd.baseAttack < 300)) {
                    dpsAudits.push({
                        type: "ENDGAME_ATTACK_SPEED_DILUTION",
                        severity: "CRITICAL",
                        hero: h.name,
                        title: `🚨 Dano Pulverizado em High-Tier: ${h.name}`,
                        diagnostic: `O herói alcançou hiper-velocidade (${attackSpeed}x), mas sofre de Dano Pulverizado (Hit Kill: ${attackDamage.toLocaleString()}). Em chefes com alta armadura, ataques fracos rápidos não superam a regeneração inimiga. Troque velocidade por Dano Físico % Base.`
                    });
                }
            } else if ((h.cls === "Ranger" || h.cls === "Slayer" || h.heroKey === 201) && attackSpeed >= 1.8) {
                if (attackDamage < 100000 || (bd.baseAttack && bd.baseAttack < 120)) {
                    dpsAudits.push({
                        type: "ATTACK_SPEED_DILUTION",
                        severity: "WARNING",
                        hero: h.name,
                        title: `⚠️ Aviso de Dano Pulverizado: ${h.name}`,
                        diagnostic: `Ataque rápido (${attackSpeed}x), mas força de impacto bruto (${attackDamage.toLocaleString()}) baixa para a escala de HP das fases avançadas. Substituir inscrições de Velocidade de Ataque por Dano Físico % ou Dano Base de Arma.`
                    });
                }
            }
        });

        if (dpsAudits.length === 0) {
            dpsAudits.push({
                type: "OPTIMAL",
                severity: "OPTIMAL",
                title: "✅ Eficiência de DPS Balanceada",
                diagnostic: "Relação de Chance Crítica vs Dano Crítico e cadência de ataque operando dentro das margens ideais."
            });
        }

        // -------------------------------------------------------------
        // B. Análise de Mitigação e Sobrevivência
        // -------------------------------------------------------------
        const mitigationAudits = [];
        const tank = heroes.find(h => h.heroKey === 101) || partyHeroes.find(h => h.role?.includes("Tanque")) || partyHeroes[0];

        if (tank) {
            const st = tank.baseStats || {};
            const rawChaos = st.chaosResistance !== undefined ? st.chaosResistance : (st.chaosResist || 0);
            const chaosRes = rawChaos - TORMENT_PENALTY;

            if (chaosRes < 0) {
                mitigationAudits.push({
                    type: "CHAOS_RESISTANCE_GAP",
                    severity: "CRITICAL",
                    hero: tank.name,
                    title: `🚨 Fenda Defensiva Crítica: Resistência ao Caos Negativa`,
                    diagnostic: `Resistência ao Caos efetiva em Tormento é ${chaosRes.toFixed(1)}% (Base: ${rawChaos}% - ${TORMENT_PENALTY}% da penalidade). Em mapas de Peste e Tormento, isso causa morte imediata por DoT. Inserir Gravações/Decorações T6+ de Caos.`
                });
            } else if (chaosRes < 75) {
                mitigationAudits.push({
                    type: "CHAOS_RESISTANCE_WARN",
                    severity: "WARNING",
                    hero: tank.name,
                    title: `⚠️ Resistência ao Caos Abaixo do Teto`,
                    diagnostic: `Resistência ao Caos efetiva em ${chaosRes.toFixed(1)}% (Teto Seguro: 75%). Fortaleça o Tanque com gemas de proteção contra Caos.`
                });
            }

            const elementalGaps = [];
            const rawFire = st.fireResistance ?? 0;
            const rawCold = st.coldResistance ?? 0;
            const rawLightning = st.lightningResistance ?? 0;
            if ((rawFire - TORMENT_PENALTY) < 75) elementalGaps.push(`Fogo: ${(rawFire - TORMENT_PENALTY).toFixed(1)}%`);
            if ((rawCold - TORMENT_PENALTY) < 75) elementalGaps.push(`Gelo: ${(rawCold - TORMENT_PENALTY).toFixed(1)}%`);
            if ((rawLightning - TORMENT_PENALTY) < 75) elementalGaps.push(`Raio: ${(rawLightning - TORMENT_PENALTY).toFixed(1)}%`);

            if (elementalGaps.length > 0) {
                mitigationAudits.push({
                    type: "ELEMENTAL_RESISTANCE_WARN",
                    severity: "WARNING",
                    hero: tank.name,
                    title: `⚠️ Vulnerabilidade Elemental no Tanque (Tormento)`,
                    diagnostic: `Resistências elementais efetivas abaixo do teto de 75% (${elementalGaps.join(", ")}). Dano mágico de chefes de Tormento causará picos de dano letais.`
                });
            }

            const blockChance = st.blockChance ?? 0;
            const damageAbsorp = st.damageAbsorption ?? 0;
            if (blockChance >= 60 && damageAbsorp < 20) {
                mitigationAudits.push({
                    type: "DEFENSE_PERMEABILITY",
                    severity: "WARNING",
                    hero: tank.name,
                    title: `⚠️ Defesa Perfurável (Bloqueio sem Absorção)`,
                    diagnostic: `Bloqueio físico em ${blockChance}%, mas Absorção de Dano em apenas ${damageAbsorp}%. Magias e golpes de elite perfuram a barreira. Alocar Absorção nos Acessórios.`
                });
            }
        }

        if (mitigationAudits.length === 0) {
            mitigationAudits.push({
                type: "OPTIMAL",
                severity: "OPTIMAL",
                title: "✅ Mitigação Defensiva Estável",
                diagnostic: "Resistências e absorção de dano do tanque estão consolidadas para os desafios de Tormento."
            });
        }

        // -------------------------------------------------------------
        // C. Sinergia de Formação e Habilidades
        // -------------------------------------------------------------
        const synergyAudits = [];
        const priest = heroes.find(h => h.heroKey === 401);
        if (priest && (priest.inParty || arrangedKeys.includes(401))) {
            const equippedSkillKeys = (priest.equippedSkills || []).map(s => s.skillKey);
            const hasSanctuary = equippedSkillKeys.includes(40201);
            const hasGroupHeal = equippedSkillKeys.includes(40101);

            if (!hasSanctuary && !hasGroupHeal) {
                synergyAudits.push({
                    type: "PRIEST_SUPPORT_GAP",
                    severity: "CRITICAL",
                    hero: priest.name,
                    title: `🚨 Falha no Elo de Suporte: Sacerdotisa`,
                    diagnostic: `A Sacerdotisa está na party ativa mas não está utilizando Santuário (ID: 40201) ou Bênção/Cura (ID: 40101). A Frontline cairá sob dano sustentado de área.`
                });
            }
        }

        if (tank && (tank.inParty || arrangedKeys.includes(101))) {
            const equippedSkillKeys = (tank.equippedSkills || []).map(s => s.skillKey);
            const hasTaunt = equippedSkillKeys.includes(10201);

            if (!hasTaunt) {
                synergyAudits.push({
                    type: "TAUNT_MISSING",
                    severity: "CRITICAL",
                    hero: tank.name,
                    title: `🚨 Risco Iminente na Backline: Ausência de Provocação (Taunt)`,
                    diagnostic: `O Tanque não possui habilidade de Provocação (Taunt - ID: 10201) equipada. Monstros e chefes focarão diretamente na classe de ataque à distância.`
                });
            }
        }

        const dpsHero = partyHeroes.find(h => h.cls === "Ranger" || h.heroKey === 201) || partyHeroes[1];
        if (tank && dpsHero && tank !== dpsHero) {
            const tankSpeed = tank.baseStats?.moveSpeed || 850;
            const dpsSpeed = dpsHero.baseStats?.moveSpeed || 850;
            const speedDiff = dpsSpeed - tankSpeed;

            if (speedDiff >= 50) {
                synergyAudits.push({
                    type: "SLINGSHOT_DESYNC",
                    severity: "WARNING",
                    hero: dpsHero.name,
                    title: `⚠️ Descompasso de Posicionamento (Efeito Estilingue)`,
                    diagnostic: `O ${dpsHero.name} está veloz demais (${dpsSpeed} vs ${tankSpeed} do Tanque, delta: +${speedDiff} pts), atingindo o mob antes da barreira de bloqueio do Tanque.`
                });
            }
        }

        if (synergyAudits.length === 0) {
            synergyAudits.push({
                type: "OPTIMAL",
                severity: "OPTIMAL",
                title: "✅ Sinergia de Formação Alinhada",
                diagnostic: "Provocação ativa, suporte calibrado e movimentação sincronizada entre Frontline e Backline."
            });
        }

        // -------------------------------------------------------------
        // D. Otimização de Rota e Economia
        // -------------------------------------------------------------
        const economyAudits = [];
        const isEndgameStage = currentStageKey >= 200000 || currentStageKey > 4000;
        const isBatActive = Number(activePet.petKey) === 1001 || (activePet.name || "").includes("Morcego");

        if (isEndgameStage && isBatActive) {
            economyAudits.push({
                type: "PET_MISALIGNMENT",
                severity: "WARNING",
                title: `⚠️ Pet Ineficiente para a Fase Atual`,
                diagnostic: `O jogador está no End Game (Terras da Peste / Ato 4, Stage ${currentStageKey}) buscando itens Celestiais Nv. 90 (Baús de Chefe) e o Pet ativo é o Morcego (foco em EXP e Baús Comuns). Alterar para Espírito Sombrio ou Esqueleto Ardente.`
            });
        }

        const defasadosForaAlquimia = allStorage.filter(it => {
            const diff = cubeLevel - (it.level || 1);
            return diff > 20 && it.cubeAction === "ALQUIMIA";
        });

        if (defasadosForaAlquimia.length > 0) {
            economyAudits.push({
                type: "CORROSION_ROUTING_WASTE",
                severity: "INFO",
                title: `💡 Desperdício de Recursos: Rota de Descarte do Cubo`,
                diagnostic: `Detectados ${defasadosForaAlquimia.length} itens de nível inferior na margem de defasagem do Cubo (Lv. ${cubeLevel}). Devem ser direcionados para Corrosão para gerar Contaminação.`
            });
        }

        if (economyAudits.length === 0) {
            economyAudits.push({
                type: "OPTIMAL",
                severity: "OPTIMAL",
                title: "✅ Economia e Reciclagem Otimizadas",
                diagnostic: "Pet em harmonia com objetivos de drop e reciclagem do cubo operando com eficiência."
            });
        }

        return {
            dps: dpsAudits,
            mitigation: mitigationAudits,
            synergy: synergyAudits,
            economy: economyAudits
        };
    }
}

/**
 * Gera relatório completo em Markdown
 */
export function generateAIReport(parsedData, options = {}) {
    if (!parsedData) return "# Erro: Nenhum dado de save disponível.";

    const { anonymizePII = true, stageLogs = null } = options;
    const data = anonymizePII ? sanitizePII(parsedData) : parsedData;

    const now = new Date().toISOString();
    const acc = data.account || {};
    const curr = data.currencies || {};
    const cube = data.cube || {};
    const pets = data.pets || {};
    const heroes = data.heroes || [];
    const allStorage = data.allStorageItems || [];
    const inventory = data.inventory || [];
    const stash = data.stash || [];

    // 1. Auditoria Cirúrgica de Combate
    const audit = CombatAuditor.runAudit(data);

    // 2. Análise de Fase e Telemetria
    const stageInfo = acc.currentStageInfo || {
        label: "3-9",
        formatted: acc.currentStageFormatted || "Ato 3 - 3-9 Tormento",
        diffPt: "Tormento",
        name: "Núcleo do Abismo",
        currentWave: 0,
        waves: 10,
        totalHP: 0
    };

    let clearStats = acc.stageClearStats || null;
    if (stageLogs && typeof stageLogs === 'string' && stageLogs.trim().length > 0) {
        const records = parseStageLogs(stageLogs, stageInfo.label);
        clearStats = getStageClearStats(records, stageInfo.label);
    } else if (!clearStats) {
        clearStats = getStageClearStats([], stageInfo.label);
    }

    const last3Formatted = (clearStats.lastThree && clearStats.lastThree.length > 0)
        ? clearStats.lastThree.map(s => `${s}s`).join(", ")
        : "260s";

    const avgClearTime = clearStats.averageSeconds || 260;
    const avgMinFormatted = (avgClearTime / 60).toFixed(1);
    const paceVerdict = avgClearTime < 150 
        ? "⚡ Limpeza Ultrarrápida (Farm Ideal)" 
        : (avgClearTime <= 300 
            ? "⚖️ Ritmo Moderado (Progresso Estável)" 
            : "⏳ Gargalo de DPS / Sobrevivência (Tempo Excessivo por Ciclo)");

    // 3. Contagens de Síntese vs Alquimia vs Corrosão
    const synthItems = allStorage.filter(i => i.cubeAction === "SÍNTESE");
    const alchemyItems = allStorage.filter(i => i.cubeAction === "ALQUIMIA");
    const trashItems = allStorage.filter(item => {
        const tier = item.tier || 0;
        const level = item.level || 0;
        return tier < 6 || level < 90;
    });

    const contamination = curr.contamination !== undefined ? curr.contamination : 0;
    const contaminationMax = curr.contaminationMax !== undefined ? curr.contaminationMax : 1000;

    // Detectar Auras Globais Cósmicas
    const cosmicAuras = heroes
        .flatMap(h => h.equippedSlots || [])
        .filter(s => s && !s.isEmpty && ((s.name || '').includes('Cósmic') || (s.gradeLabel || s.grade) === 'COSMIC'))
        .map(s => s.name);

    let md = `# RELATÓRIO DE TELEMETRIA & OTIMIZAÇÃO CIRÚRGICA: TASK BAR HERO (TBH)
> Gerado em: ${now} | Versão do Save: ${acc.version || "1.02.01"} | Engine: TTBH Analytics v3.0 (End Game & Deep Combat Audit)
> Dificuldade: **Tormento** | Penalidade de Resistências: **-${TORMENT_PENALTY}%**

---

## 1. PAINEL DE TELEMETRIA DO ESTÁGIO, RECURSOS E ECONOMIA
| Métrica / Parâmetro | Valor Registrado | Detalhes & Telemetria |
| :--- | :--- | :--- |
| **Estágio Atual em Combate** | **${stageInfo.formatted}** | Onda ${stageInfo.currentWave || 0}/${stageInfo.waves || 10} • Dificuldade: **${stageInfo.diffPt}** |
| **Últimos 3 Tempos de Conclusão** | **${last3Formatted}** | Amostras do log \`[Estágio ${stageInfo.label} concluido. (Xs)]\` |
| **Tempo Médio de Conclusão** | **${avgClearTime}s (~${avgMinFormatted} min)** | Diagnóstico: **${paceVerdict}** |
| **Recorde Máximo da Conta** | **${acc.maxStageFormatted || "1-1"}** | Stage Key: \`${acc.currentStageKey || acc.maxCompletedStage || 0}\` |
| **Ouro Acumulado** | **${curr.goldFormatted || (curr.gold ? curr.gold.toLocaleString() : "0")}** | ${(curr.gold || 0).toLocaleString()} moedas |
| **Contaminação (Peste)** | **${contamination} / ${contaminationMax}** | Recurso acumulado via Corrosão do Cubo |
| **Nível do Cubo Heroico** | **Nível ${cube.level || 1}** | ${(cube.exp || 0).toLocaleString()} EXP acumulada |
| **Margem Segura de Síntese** | **±10 Níveis** | Itens de **Lv. ${Math.max(1, (cube.level || 1) - 10)}** a **Lv. ${(cube.level || 1) + 10}** (100% EXP) |
| **Tempo Total Jogado** | **${acc.playTimeFormatted || "0h"}** | ${(acc.playTimeSeconds || 0).toLocaleString()} segundos |
| **Pet Ativo na Party** | **${pets.activePet?.icon || "🦇"} ${pets.activePet?.name || "Morcego"}** | Companheiro ativo em batalha |
| **Auras Globais Cósmicas** | **${cosmicAuras.length > 0 ? cosmicAuras.join(", ") : "Nenhuma ativa"}** | Buffs de alcance de equipe |

---

## 2. AUDITORIA DE COMBATE E ANOMALIAS CRÍTICAS (AÇÃO IMEDIATA)

### A. Análise de Eficiência de DPS Bruto (O "Falso Dano" & Dano Pulverizado)
${audit.dps.map(a => `* **${a.title}**\n  * **Diagnóstico**: "${a.diagnostic}"`).join("\n\n")}

### B. Análise de Mitigação e Sobrevivência (Penalidade de Tormento & Hard Caps)
${audit.mitigation.map(a => `* **${a.title}**\n  * **Diagnóstico**: "${a.diagnostic}"`).join("\n\n")}

### C. Sinergia de Formação e Habilidades (Provocação, Suporte e Efeito Estilingue)
${audit.synergy.map(a => `* **${a.title}**\n  * **Diagnóstico**: "${a.diagnostic}"`).join("\n\n")}

### D. Otimização de Rota e Economia (Pets e Roteamento de Corrosão)
${audit.economy.map(a => `* **${a.title}**\n  * **Diagnóstico**: "${a.diagnostic}"`).join("\n\n")}

---

## 3. SOMA GLOBAL DE BUFFS DE PETS
* **Bônus de EXP Global**: **+${pets.totalBuffs?.expPercent || 0}%**
* **Bônus de Ouro Global**: **+${pets.totalBuffs?.goldPercent || 0}%**
* **Chance de Baús Normais**: **+${pets.totalBuffs?.normalChestPercent || 0}%**
* **Chance de Baús de Chefes**: **+${pets.totalBuffs?.bossChestPercent || 0}%**

### Catálogo de Companheiros:
${(pets.all || []).filter(p => p.isUnlocked).map(p => `- ${p.icon} **${p.name}**${p.isActive ? " *(ATIVO NA PARTY)*" : ""}: ${p.buffs?.join(", ") || p.desc}`).join("\n") || "- Nenhum pet registrado"}

---

## 4. ROSTER COMPLETO, BUILDS E ATRIBUTOS DETALHADOS DOS HERÓIS
`;

    heroes.forEach(h => {
        const statusTag = h.inParty ? "[PARTY ATIVA]" : "[RESERVA]";
        const st = h.baseStats || {};
        const bd = h.statBreakdowns || {};

        md += `\n### ${h.icon || '🛡️'} ${h.name} (${h.cls || 'Hero'}) - Lv. ${h.level || 1} ${statusTag}
* **Função Principal**: ${h.role || 'DPS'} | **Status**: ${h.isUnlocked ? "Desbloqueado" : "Bloqueado"} | **AP Alocado**: ${h.allocatedAP || 0}
* **Resumo Rápido**: Hit Kill: **${(st.attackDamage || 0).toLocaleString()}** | DPS Proj.: **${(st.estimatedDps || Math.round((st.attackDamage || 0) * (st.attackSpeed || 1))).toLocaleString()}** | Vel. Ataque: **${st.attackSpeed || 1}x** | Crítico: **${st.critChance || 0}%** (x${st.critDamage || 0}%) | HP: **${(st.maxHp || 0).toLocaleString()}** | Defesa: **${(st.armor || 0).toLocaleString()}**

#### A. PAINEL DE HARD CAPS & STATUS DE COMBATE (COM PENALIDADE DE TORMENTO -60%):
| Atributo de Combate | Valor Efetivo | Hard Cap | Diagnóstico & Mitigação |
| :--- | :---: | :---: | :--- |
${diagnoseStat(st.critChance, HARD_CAPS.critChance, 'Chance Crítica')}
${diagnoseStat(st.blockChance, HARD_CAPS.blockChance, 'Chance de Bloqueio Físico')}
${diagnoseStat(st.chaosResistance ?? st.chaosResist ?? 0, HARD_CAPS.maxResist, 'Resistência ao Caos', true)}
${diagnoseStat(st.fireResistance ?? 0, HARD_CAPS.maxResist, 'Resistência a Fogo', true)}
${diagnoseStat(st.coldResistance ?? 0, HARD_CAPS.maxResist, 'Resistência a Gelo', true)}
${diagnoseStat(st.lightningResistance ?? 0, HARD_CAPS.maxResist, 'Resistência a Raio', true)}
${diagnoseStat(st.dodgeChance, HARD_CAPS.evasion, 'Chance de Esquiva')}
| **Velocidade de Movimento** | ${st.moveSpeed || 850} pts | [Sincronia] | ${st.moveSpeed > 1150 ? '⚠️ Atenção: Risco de Efeito Estilingue' : '✅ Alinhado'} |
| **Absorção de Dano** | ${st.damageAbsorption || 0}% | 100% | ${(st.damageAbsorption || 0) >= 20 ? '✅ Seguro' : '⚠️ Baixa Absorção pós-Bloqueio'} |

#### B. FOLHA TÉCNICA DETALHADA DE STATUS OFENSIVOS E DEFENSIVOS:
| Grupo | Atributo de Combate | Valor Efetivo | Detalhamento & Origem |
| :--- | :--- | :---: | :--- |
| ⚔️ **Ofensivo** | Dano de Ataque (Hit Kill) | **${(st.attackDamage || 0).toLocaleString()}** | Base: ${bd.baseAttack || 1} • Equipamentos: +${(bd.gearAttack || 0).toLocaleString()} • Bônus: +${bd.percentMultiplier || 0}% |
| ⚔️ **Ofensivo** | DPS Estimado | **${(st.estimatedDps || Math.round((st.attackDamage || 0) * (st.attackSpeed || 1))).toLocaleString()}** | Projeção considerando APS, Chance e Dano Crítico |
| ⚔️ **Ofensivo** | Velocidade de Ataque (APS) | **${st.attackSpeed || 1}x** | Frequência de acertos por segundo |
| ⚔️ **Ofensivo** | Velocidade de Conjuração | **+${st.castSpeed || 0}%** | Aceleração de lançamento de magias e canalizações |
| ⚔️ **Ofensivo** | Chance Crítica | **${st.critChance || 0}%** | Teto ideal: 100% |
| ⚔️ **Ofensivo** | Multiplicador de Dano Crítico | **+${st.critDamage || 0}%** | Escala sobre dano base no acerto crítico |
| ⚔️ **Ofensivo** | Redução de Recarga (CDR) | **+${st.cooldownReduction || 0}%** | Aceleração de recarga das habilidades ativas |
| ⚔️ **Ofensivo** | Área de Efeito (AoE) | **+${st.areaOfEffect || 0}%** | Raio de impacto de magias e dispersões |
| ⚔️ **Ofensivo** | Qtd. Projéteis Extras | **+${st.projectileCount || 0}** | Projéteis extras disparados simultaneamente |
| 🛡️ **Defensivo** | Vida Máxima (HP) | **${(st.maxHp || 0).toLocaleString()}** | Pontos de vida totais do herói |
| 🛡️ **Defensivo** | Regeneração de HP/seg | **+${(st.hpRegenPerSec || 0).toLocaleString()}** | Recuperação passiva de vida constante |
| 🛡️ **Defensivo** | Vida ao Acertar (Life on Hit) | **+${st.lifeOnHit || 0}** | Vida recuperada a cada acerto desferido |
| 🛡️ **Defensivo** | Armadura Total | **${(st.armor || 0).toLocaleString()}** | Proteção física contra impactos diretos |
| 🛡️ **Defensivo** | Redução Global de Dano | **${st.damageReduction || 0}%** | Mitigação percentual bruta contra qualquer dano |
| 🛡️ **Defensivo** | Absorção de Dano | **${st.damageAbsorption || 0}%** | Absorção residual pós-bloqueio |

#### C. Habilidades Equipadas na Party (3 Slots):
${(h.equippedSkills || []).map(sk => `- ⚡ **${sk.name}** (ID: \`${sk.skillKey}\`, Dano: ${sk.dmgType || 'Físico'}, Alcance: ${sk.delivery || 'Direto'}, Recarga: ${sk.cooldown || 0}s)`).join("\n") || "- Nenhuma habilidade equipada"}

#### D. Árvore de Habilidades & Talentos Ativos (${(h.heroTalents || []).length} nós):
| Habilidade / Talento | Tipo | Nível | Buffer Concedido |
| :--- | :---: | :---: | :--- |
`;
        (h.heroTalents || []).forEach(t => {
            const typeLabel = t.type === "ACTIVESKILL" 
                ? (t.isEquipped ? "**Ativa (Equipada)**" : "Ativa (Reserva)") 
                : "Passiva";
            md += `| ${t.name} | ${typeLabel} | Lv. ${t.level}/${t.maxLevel} | ${t.description} |\n`;
        });

        md += `\n#### E. Mapa de Forja & Build Completa dos 10 Slots de Equipamentos:
| Slot | Item & Grau (Nível) | Buffers Base | Inerentes / Única | Pedras Engastadas | Cubo | Aviso de Regra |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
`;
        const slots = h.equippedSlots || [];
        const slotNames = ['Arma Principal', 'Arma Secundária', 'Capacete', 'Armadura', 'Luvas', 'Botas', 'Amuleto', 'Brinco', 'Anel', 'Braçadeira'];
        
        for (let i = 0; i < 10; i++) {
            const s = slots[i] || { isEmpty: true, slotName: slotNames[i] || `Slot ${i + 1}` };
            const slotTitle = s.slotName || slotNames[i] || `Slot ${i + 1}`;
            
            if (s.isEmpty) {
                md += `| **${slotTitle}** | *(Slot Vazio)* | - | - | - | - | ⚠️ Slot Morto |\n`;
            } else {
                const gradeText = `${s.name}<br><strong>${s.gradeLabel || s.grade || 'Comum'} [T${s.tier || 1}]</strong> (Lv.${s.level || 0})`;
                const baseStatsText = (s.baseStats?.list && s.baseStats.list.length > 0)
                    ? s.baseStats.list.map(b => `${b.label}: ${b.value}`).join("<br>")
                    : "-";
                
                const inhText = (s.inherentAttributes && s.inherentAttributes.length > 0)
                    ? s.inherentAttributes.map(a => a.formattedText).join("<br>")
                    : (s.uniqueStat ? `🌟 **${s.uniqueStat.name}**: ${s.uniqueStat.description}` : "-");

                const decors = (s.decorationsList || []).map(m => `[T${m.tier}] ${m.slotDisplay || (m.statName + ' ' + m.formattedVal)}`);
                const engravings = (s.engravingsList || []).map(m => `[T${m.tier}] ${m.slotDisplay || (m.statName + ' ' + m.formattedVal)}`);
                const inscriptions = (s.inscriptionsList || []).map(m => `[T${m.tier}] ${m.slotDisplay || (m.statName + ' ' + m.formattedVal)}`);
                const allGemsList = [...decors, ...engravings, ...inscriptions];
                const gemsText = allGemsList.length > 0 ? allGemsList.join("<br>") : "-";
                
                const warning = getGearWarning(slotTitle, s);

                md += `| **${slotTitle}** | ${gradeText} | ${baseStatsText} | ${inhText} | ${gemsText} | \`${s.cubeAction || 'SÍNTESE'}\` | ${warning} |\n`;
            }
        }
    });

    md += `\n---

## 5. INVENTÁRIO, MOCHILA E ROTEAMENTO DO CUBO
* **Total no Inventário (Bolsa)**: ${inventory.length} itens
* **Total na Mochila (Stash / Baú)**: ${stash.length} itens
* **Peças para SÍNTESE (100% EXP)**: ${synthItems.length} itens (dentro da margem ±10 do Cubo Lv.${cube.level || 1})
* **Peças para ALQUIMIA**: ${alchemyItems.length} itens (fora da margem segura do Cubo)
* **Fila de Corrosão (Lixo Lv 1-80 / T1-T5)**: ${trashItems.length} itens para conversão em Contaminação

### A. Peças de End Game para Síntese ou Equipar (Tier 6+ e Nível 90+):
| Local | Item / Nome Oficial | Nível & Tier | Modificadores Aplicados | Ação Recomendada |
| :--- | :--- | :---: | :--- | :--- |
`;

    const endgameItems = allStorage.filter(item => (item.tier || 0) >= 6 && (item.level || 0) >= 80);
    const displayItems = endgameItems.length > 0 ? endgameItems : allStorage.slice(0, 30);

    displayItems.forEach(it => {
        const modsSummary = (it.detailedModifiers || []).map(m => `[T${m.tier}] ${m.statName} ${m.formattedVal}`).join("; ") || "Sem materiais";
        md += `| ${it.location || 'Inventário'} | **${it.name || 'Item'}** | Lv.${it.level || 0} [T${it.tier || 1} ${it.grade || 'Comum'}] | ${modsSummary} | **${it.cubeAction || 'SÍNTESE'}** (${it.cubeReason || 'Lv.90+'}) |\n`;
    });

    if (allStorage.length > displayItems.length) {
        md += `\n*... e mais ${allStorage.length - displayItems.length} itens arquivados no stash.*\n`;
    }

    md += `\n---

## 6. DIRETRIZES DE REORGANIZAÇÃO PARA A IA-TBH
1. **Sanar Falsos Danos**: Converter decorações de DPS puro em multiplicadores de Chance Crítica nos Acessórios até que o herói alcance >75% no End Game (Meta de Hard Cap: 100%).
2. **Eliminar Slots Mortos**: Substituir todas as gemas T3 e T4 engastadas em equipamentos T6+ por gemas de Tier compatível (T6-T8).
3. **Compensar Penalidade de Tormento (-60%)**: Garantir Resistência ao Caos acima de 75% e elevar resistências elementais para evitar hit kills mágicos.
4. **Ativar Provocação no Cavaleiro**: Alocar imediatamente a habilidade \`10201\` (Provocação) no Cavaleiro para forçar o aggro no tanque.
5. **Equipar Santuário na Sacerdotisa**: Alocar Santuário (\`40201\`) para sustentar a Frontline sob dano contínuo.
6. **Alinhar Companheiros ao End Game**: Em atos de Tormento/Peste, substituir pets de EXP/Baús comuns por Espírito Sombrio ou Esqueleto Ardente para focar em Baús de Chefe Celestiais.
7. **Roteamento de Corrosão**: Descartar todo o excedente de itens inferiores na aba de Corrosão para acumular Contaminação.

---
*Relatório gerado por ToolTaskBarHero (TTBH) v3.0 (END GAME & DEEP COMBAT AUDIT SPEC)*
`;

    return md;
}

export class AiExporter {
    static generateMarkdown(data, stageLogs = null) {
        return generateAIReport(data, { anonymizePII: true, stageLogs });
    }
}

if (typeof window !== 'undefined') {
    window.generateAIReport = generateAIReport;
    window.AiExporter = AiExporter;
    window.CombatAuditor = CombatAuditor;
    window.sanitizePII = sanitizePII;
}
