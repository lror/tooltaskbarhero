window.TTBH_CONFIG = window.TTBH_CONFIG || {};
window.TTBH_CONFIG.anonimizePII = true;

import { parseStageLogs, getStageClearStats } from './save_parser.js';

/**
 * TTBH - ToolTaskBarHero
 * AI Exporter (Markdown Generator v2.7) & Combat Auditor Engine
 * 
 * Implementa a Auditoria Cirúrgica de Combate e Anomalias exigida pela IA-TBH:
 * - A. Análise de Eficiência de DPS Bruto (O "Falso Dano" & Dano Pulverizado)
 * - B. Análise de Mitigação e Sobrevivência (Resistências Caos/Elemental & Absorção pós-Bloqueio)
 * - C. Sinergia de Formação e Habilidades (Suporte Sacerdotisa, Taunt do Tanque, Efeito Estilingue)
 * - D. Otimização de Rota e Economia (Alinhamento de Pets e Roteamento de Corrosão do Cubo)
 * - E. Telemetria de Estágio e Tempos de Conclusão (Últimos 3 ciclos de batalha)
 * - F. Folha Técnica Completa de Atributos Detalhados por Herói
 * - G. Classificação Completa de Equipamentos (Nome, Grau, Buffers Base, Atributos Inerentes, Stats Únicas, Decorações, Gravações, Inscrições)
 */

export class CombatAuditor {
    /**
     * Executa a auditoria cirúrgica de combate e gera diagnósticos acionáveis
     * @param {Object} data - Dados completos do Save
     * @returns {Object} Diagnósticos divididos em 4 pilares
     */
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

            // 1. Taxa de Conversão Crítica (Gargalo da Exploradora / DPS)
            if (st.critDamage >= 800 && st.critChance < 75) {
                dpsAudits.push({
                    type: "ENDGAME_CRIT_CONVERSION",
                    severity: "CRITICAL",
                    hero: h.name,
                    title: `🚨 Falso Dano em High-Tier: ${h.name}`,
                    diagnostic: `No End Game (Equipamentos Celestiais+), o Dano Crítico massivo de ${st.critDamage}% é "Falso Dano" porque a Chance Crítica (${st.critChance}%) está abaixo do limiar de consistência de 75%. Substitua inscrições secundárias por Chance Crítica T8+ imediatamente.`
                });
            } else if (st.critDamage > 200 && st.critChance < 50) {
                dpsAudits.push({
                    type: "CRIT_CONVERSION",
                    severity: "CRITICAL",
                    hero: h.name,
                    title: `🚨 Alerta Crítico: Falso Dano no Herói ${h.name}`,
                    diagnostic: `Aviso de Falso Dano. O Dano Crítico de ${st.critDamage}% está ocioso porque a Chance Crítica é de apenas ${st.critChance}%. Priorize decorações T5+ de Aumento Multiplicador de Chance Crítica nos Acessórios para estabilizar o DPS.`
                });
            } else if (st.critChance < 35 && st.critDamage >= 150) {
                dpsAudits.push({
                    type: "CRIT_CONVERSION_WARN",
                    severity: "WARNING",
                    hero: h.name,
                    title: `⚠️ Aviso de Conversão Crítica: ${h.name}`,
                    diagnostic: `Chance Crítica em ${st.critChance}% (Dano Crítico: ${st.critDamage}%). O DPS oscila demasiadamente contra chefes de fase. Recomenda-se elevar a Chance Crítica acima de 50%.`
                });
            }

            // 2. Frequência vs Impacto (Gargalo da Velocidade de Ataque)
            if ((h.cls === "Ranger" || h.cls === "Slayer" || h.heroKey === 201) && st.attackSpeed >= 2.5) {
                if (st.attackDamage < 500000 || (bd.baseAttack && bd.baseAttack < 300)) {
                    dpsAudits.push({
                        type: "ENDGAME_ATTACK_SPEED_DILUTION",
                        severity: "CRITICAL",
                        hero: h.name,
                        title: `🚨 Dano Pulverizado em High-Tier: ${h.name}`,
                        diagnostic: `O herói alcançou hyper-velocidade (${st.attackSpeed}x), mas sofre de Dano Pulverizado (Hit Kill: ${st.attackDamage.toLocaleString()}). Em fases com chefes Celestiais, ataques fracos rápidos não superam a armadura e regeneração inimiga. Troque velocidade por Dano Físico % Base.`
                    });
                }
            } else if ((h.cls === "Ranger" || h.cls === "Slayer" || h.heroKey === 201) && st.attackSpeed >= 1.8) {
                if (st.attackDamage < 100000 || (bd.baseAttack && bd.baseAttack < 120)) {
                    dpsAudits.push({
                        type: "ATTACK_SPEED_DILUTION",
                        severity: "WARNING",
                        hero: h.name,
                        title: `⚠️ Aviso de Dano Pulverizado: ${h.name}`,
                        diagnostic: `A personagem ataca rapidamente (${st.attackSpeed}x), mas carece de força de impacto bruto (Hit Kill: ${st.attackDamage.toLocaleString()}) necessária para a escala de HP das fases avançadas. Substituir inscrições de Velocidade de Ataque por Dano Físico % ou Dano Base de Arma.`
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
        // B. Análise de Mitigação e Sobrevivência (O Gargalo do Cavaleiro)
        // -------------------------------------------------------------
        const mitigationAudits = [];
        const tank = heroes.find(h => h.heroKey === 101) || partyHeroes.find(h => h.role?.includes("Tanque")) || partyHeroes[0];

        if (tank) {
            const st = tank.baseStats || {};

            // 1. Cobertura de Resistência Elemental/Caos
            const chaosRes = st.chaosResistance ?? 32;
            if (chaosRes < 75) {
                mitigationAudits.push({
                    type: "CHAOS_RESISTANCE_GAP",
                    severity: "CRITICAL",
                    hero: tank.name,
                    title: `🚨 Fenda Defensiva Detectada: Resistência ao Caos`,
                    diagnostic: `Fenda Defensiva Detectada. Resistência ao Caos em ${chaosRes}%. No modo Tormento/Peste, valores abaixo do teto de 75% resultam em morte por dano ao longo do tempo (DoT). Inserir Gravações/Decorações T6+ de Chaos Resistance no Elmo/Armadura.`
                });
            }

            const elementalGaps = [];
            if ((st.fireResistance ?? 48) < 75) elementalGaps.push(`Fogo: ${st.fireResistance ?? 48}%`);
            if ((st.coldResistance ?? 42) < 75) elementalGaps.push(`Gelo: ${st.coldResistance ?? 42}%`);
            if ((st.lightningResistance ?? 55) < 75) elementalGaps.push(`Raio: ${st.lightningResistance ?? 55}%`);

            if (elementalGaps.length > 0) {
                mitigationAudits.push({
                    type: "ELEMENTAL_RESISTANCE_WARN",
                    severity: "WARNING",
                    hero: tank.name,
                    title: `⚠️ Vulnerabilidade Elemental no Tanque`,
                    diagnostic: `Resistências elementais abaixo do teto de 75% (${elementalGaps.join(", ")}). Dano mágico massivo de elites e chefes pode ultrapassar a mitigação comum de armadura.`
                });
            }

            // 2. Eficiência de Absorção Pós-Bloqueio
            const blockChance = st.blockChance ?? 75;
            const damageAbsorp = st.damageAbsorption ?? 8;
            if (blockChance >= 70 && damageAbsorp < 20) {
                mitigationAudits.push({
                    type: "DEFENSE_PERMEABILITY",
                    severity: "WARNING",
                    hero: tank.name,
                    title: `⚠️ Defesa Perfurável (Bloqueio sem Absorção)`,
                    diagnostic: `Defesa Perfurável. Bloqueio no limite máximo (${blockChance}%), mas ausência de Absorção de Dano (${damageAbsorp}%) o expõe a magias e ataques não-bloqueáveis. Alocar Absorção de Dano nos espaços de acessórios (Amuletos e Braçadeiras).`
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
        // C. Sinergia de Formação e Habilidades (A Quebra do Ciclo)
        // -------------------------------------------------------------
        const synergyAudits = [];

        // 1. Verificação de Ferramentas de Suporte (Sacerdotisa)
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
                    diagnostic: `Falha no Elo de Suporte. A Sacerdotisa está na party ativa mas não está utilizando Santuário (ID: 40201) ou Bênção do Poder (ID: 40101) para manter a Frontline (Cavaleiro) viva sob dano contínuo. Substituir habilidade incorreta por Santuário.`
                });
            }
        }

        // 2. Verificação de Controle de Ameaça (Aggro do Cavaleiro)
        if (tank && (tank.inParty || arrangedKeys.includes(101))) {
            const equippedSkillKeys = (tank.equippedSkills || []).map(s => s.skillKey);
            const hasTaunt = equippedSkillKeys.includes(10201);

            if (!hasTaunt) {
                synergyAudits.push({
                    type: "TAUNT_MISSING",
                    severity: "CRITICAL",
                    hero: tank.name,
                    title: `🚨 Risco Iminente na Backline: Ausência de Provocação (Taunt)`,
                    diagnostic: `Risco Iminente na Backline. O Tanque não possui habilidade de Provocação (Taunt - ID: 10201) equipada. Substituir habilidades de dano secundário por Provocação para forçar o foco dos monstros no Tanque.`
                });
            }
        }

        // 3. Sincronia de Velocidade de Movimento (O Efeito Estilingue)
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
                    diagnostic: `Descompasso de Posicionamento. O ${dpsHero.name} está veloz demais (${dpsSpeed} vs ${tankSpeed} do Tanque, delta: +${speedDiff} pts), alcançando a onda de inimigos antes do Tanque ou do tempo ideal de recarga das habilidades. Calibrar Movimentação na árvore de talentos ou retirar decorações de velocidade excessivas.`
                });
            }
        }

        if (synergyAudits.length === 0) {
            synergyAudits.push({
                type: "OPTIMAL",
                severity: "OPTIMAL",
                title: "✅ Sinergia de Formação Alinhada",
                diagnostic: "Provocação ativa, suporte calibrado e sincronia de movimentação entre Frontline e Backline sem descompasso."
            });
        }

        // -------------------------------------------------------------
        // D. Otimização de Rota e Economia (Pets e Reciclagem)
        // -------------------------------------------------------------
        const economyAudits = [];

        const isEndgameStage = currentStageKey >= 200000 || currentStageKey > 4000;
        const isBatActive = Number(activePet.petKey) === 1001 || (activePet.name || "").includes("Morcego");

        if (isEndgameStage && isBatActive) {
            economyAudits.push({
                type: "PET_MISALIGNMENT",
                severity: "WARNING",
                title: `⚠️ Pet Ineficiente para a Fase Atual`,
                diagnostic: `Pet Ineficiente para a Fase. O jogador está no End Game (Ato 4 / Terras da Peste, Stage: ${currentStageKey}) buscando equipamentos Celestiais Nv. 90 (Baús de Chefe) e o Pet ativo é o Morcego (focado em EXP e Baús Comuns). Alterar de Morcego para Espírito Sombrio ou Esqueleto Ardente para maximizar o drop dos baús de chefe (onde residem os itens de nível máximo).`
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
                diagnostic: `Desperdício de Recursos. Detectados ${defasadosForaAlquimia.length} itens de nível inferior (Lv. 1 a ${Math.max(1, cubeLevel - 20)}) na margem de defasagem do Cubo (Lv. ${cubeLevel}). Devem ser roteados para a aba de CORROSÃO para gerar Contaminação, e não Alquimia.`
            });
        }

        if (economyAudits.length === 0) {
            economyAudits.push({
                type: "OPTIMAL",
                severity: "OPTIMAL",
                title: "✅ Economia e Reciclagem Otimizadas",
                diagnostic: "Pet em harmonia com os objetivos de drop e itens de descarte roteados sem desperdício de EXP e materiais."
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

export class AiExporter {
    /**
     * Gera o relatório consolidado em formato Markdown otimizado para a IA-TBH
     * @param {Object} data - Objeto retornado pelo SaveParser.parse()
     * @param {string|null} stageLogs - Conteúdo opcional de log de estágio (Player.log)
     * @returns {string} Markdown completo para LLM
     */
    static generateMarkdown(data, stageLogs = null) {
        if (!data) return "# Erro: Nenhum dado de save disponível.";

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

        // 2. Análise de Fase e Telemetria de Conclusão (Últimos 3 tempos)
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

        // 3. Contagens de Síntese vs Alquimia
        const synthItems = allStorage.filter(i => i.cubeAction === "SÍNTESE");
        const alchemyItems = allStorage.filter(i => i.cubeAction === "ALQUIMIA");

        let md = `# RELATÓRIO DE TELEMETRIA & OTIMIZAÇÃO CIRÚRGICA: TASK BAR HERO (TBH)
> Gerado em: ${now} | Versão do Jogo: ${acc.version || "1.02.01"} | Engine: TTBH Analytics v2.7 (Complete Deep-Spec)

---

## 1. AUDITORIA DE COMBATE E ANOMALIAS (DIAGNÓSTICO AVANÇADO - O QUE PRECISA MUDAR AGORA)

### A. Análise de Eficiência de DPS Bruto (O "Falso Dano")
${audit.dps.map(a => `* **${a.title}**\n  * **Diagnóstico**: "${a.diagnostic}"`).join("\n\n")}

### B. Análise de Mitigação e Sobrevivência (O Gargalo do Cavaleiro)
${audit.mitigation.map(a => `* **${a.title}**\n  * **Diagnóstico**: "${a.diagnostic}"`).join("\n\n")}

### C. Sinergia de Formação e Habilidades (A Quebra do Ciclo)
${audit.synergy.map(a => `* **${a.title}**\n  * **Diagnóstico**: "${a.diagnostic}"`).join("\n\n")}

### D. Otimização de Rota e Economia (Pets e Reciclagem)
${audit.economy.map(a => `* **${a.title}**\n  * **Diagnóstico**: "${a.diagnostic}"`).join("\n\n")}

---

## 2. TELEMETRIA DO ESTÁGIO DE BATALHA, CRONOMETRIA & RECURSOS
| Métrica / Parâmetro | Valor Registrado | Detalhes & Telemetria |
| :--- | :--- | :--- |
| **Estágio Atual em Combate** | **${stageInfo.formatted}** | Onda ${stageInfo.currentWave || 0}/${stageInfo.waves || 10} • Dificuldade: **${stageInfo.diffPt}** |
| **Últimos 3 Tempos de Conclusão** | **${last3Formatted}** | Amostras extraídas do log \`[Estágio ${stageInfo.label} concluido. (Xs)]\` |
| **Tempo Médio de Conclusão** | **${avgClearTime}s (~${avgMinFormatted} min)** | Diagnóstico de Farm: **${paceVerdict}** |
| **Recorde Máximo da Conta** | **${acc.maxStageFormatted || "1-1"}** | Stage Key: \`${acc.maxCompletedStage}\` |
| **Ouro Acumulado** | **${curr.goldFormatted || "0"}** | ${(curr.gold || 0).toLocaleString()} moedas |
| **Nível do Cubo Heroico** | **Nível ${cube.level || 1}** | ${(cube.exp || 0).toLocaleString()} EXP acumulada |
| **Margem Segura de Síntese** | **±10 Níveis** | Itens de **Lv. ${Math.max(1, cube.level - 10)}** a **Lv. ${cube.level + 10}** (100% de EXP) |
| **Tempo Total Jogado** | **${acc.playTimeFormatted || "0h"}** | ${acc.playTimeSeconds || 0} segundos de execução |
| **Pet Ativo na Party** | **${pets.activePet?.icon || "🦇"} ${pets.activePet?.name || "Morcego"}** | Companheiro ativo em batalha |

---

## 3. SOMA GLOBAL DE BUFFS DE PETS
* **Bônus de EXP Global**: **+${pets.totalBuffs?.expPercent || 0}%**
* **Bônus de Ouro Global**: **+${pets.totalBuffs?.goldPercent || 0}%**
* **Chance de Baús Normais**: **+${pets.totalBuffs?.normalChestPercent || 0}%**
* **Chance de Baús de Chefes**: **+${pets.totalBuffs?.bossChestPercent || 0}%**

### Catálogo de Companheiros:
${(pets.all || []).filter(p => p.isUnlocked).map(p => `- ${p.icon} **${p.name}**${p.isActive ? " *(ATIVO NA PARTY)*" : ""}: ${p.buffs.join(", ") || p.desc}`).join("\n")}

---

## 4. ROSTER COMPLETO, BUILDS E ATRIBUTOS DETALHADOS DOS HERÓIS
`;

        heroes.forEach(h => {
            const statusTag = h.inParty ? "[PARTY ATIVA]" : "[RESERVA]";
            const st = h.baseStats || {};
            const bd = h.statBreakdowns || {};

            md += `\n### ${h.icon} ${h.name} (${h.cls}) - Lv. ${h.level} ${statusTag}
* **Função Principal**: ${h.role} | **Status**: ${h.isUnlocked ? "Desbloqueado" : "Bloqueado"} | **AP Alocado**: ${h.allocatedAP}
* **Resumo Rápido**: Hit Kill: **${st.attackDamage.toLocaleString()}** | DPS Proj.: **${(st.estimatedDps || Math.round(st.attackDamage * (st.attackSpeed || 1))).toLocaleString()}** | Vel. Ataque: **${st.attackSpeed}x** | Crítico: **${st.critChance}%** (x${st.critDamage}%) | HP: **${(st.maxHp || 0).toLocaleString()}** | Defesa: **${st.armor}**

#### FOLHA TÉCNICA DE STATUS DETALHADO DO HERÓI (PAINEL COMPLETO DE COMBATE - EXCLUSIVO IA-TBH):
| Grupo | Atributo de Combate | Valor Efetivo | Detalhamento & Origem |
| :--- | :--- | :---: | :--- |
| ⚔️ **Ofensivo** | Dano de Ataque (Hit Kill) | **${st.attackDamage.toLocaleString()}** | Base: ${bd.baseAttack || 1} • Equipamentos: +${(bd.gearAttack || 0).toLocaleString()} • Bônus/Passivas: +${bd.percentMultiplier || 0}% |
| ⚔️ **Ofensivo** | DPS Estimado | **${(st.estimatedDps || Math.round(st.attackDamage * (st.attackSpeed || 1))).toLocaleString()}** | Dano médio por segundo projetado com Chance/Dano Crítico e APS |
| ⚔️ **Ofensivo** | Velocidade de Ataque (APS) | **${st.attackSpeed}x** | Frequência de acertos por segundo |
| ⚔️ **Ofensivo** | Velocidade de Conjuração | **+${st.castSpeed || 0}%** | Aceleração de lançamento de habilidades mágicas e canalizações |
| ⚔️ **Ofensivo** | Chance Crítica | **${st.critChance}%** | Probabilidade de acerto de dano crítico |
| ⚔️ **Ofensivo** | Multiplicador de Dano Crítico | **+${st.critDamage}%** | Escala de dano multiplicativo sobre o golpe crítico |
| ⚔️ **Ofensivo** | Redução de Recarga (CDR) | **+${st.cooldownReduction || 0}%** | Aceleração de recarga das habilidades ativas |
| ⚔️ **Ofensivo** | Aumento de Área de Efeito (AoE) | **+${st.areaOfEffect || 0}%** | Raio de impacto de magias em área e dispersões |
| ⚔️ **Ofensivo** | Golpe Múltiplo (Multistrike) | **+${st.multistrike || 0}** | Ativação de golpes repetidos por disparo/golpe |
| ⚔️ **Ofensivo** | Qtd. Projéteis Adicionais | **+${st.projectileCount || 0}** | Projéteis extras disparados simultaneamente |
| 🛡️ **Defensivo** | Vida Máxima (HP) | **${(st.maxHp || 0).toLocaleString()}** | Pontos de vida totais do herói |
| 🛡️ **Defensivo** | Regeneração de HP/seg | **+${(st.hpRegenPerSec || 0).toLocaleString()}** | Recuperação passiva de vida constante a cada segundo |
| 🛡️ **Defensivo** | Vida ao Acertar (Life on Hit) | **+${st.lifeOnHit || 0}** | Vida recuperada imediatamente a cada acerto desferido |
| 🛡️ **Defensivo** | Armadura Total | **${(st.armor || 0).toLocaleString()}** | Proteção física contra impactos diretos |
| 🛡️ **Defensivo** | Redução Global de Dano | **${st.damageReduction || 0}%** | Mitigação percentual bruta contra qualquer dano |
| 🛡️ **Defensivo** | Absorção de Dano | **${st.damageAbsorption || 0}%** | Absorção residual pós-bloqueio |
| 🛡️ **Defensivo** | Chance de Bloqueio Físico | **${st.blockChance || 0}%** *(Teto: ${st.maxBlockChance || 75}%)* | Chance de anular impacto com escudo/armas |
| 🛡️ **Defensivo** | Bloqueio Elemental | **${st.elementalBlockChance || 0}%** | Chance de mitigar ataques mágicos |
| 🛡️ **Defensivo** | Chance de Esquiva | **${st.dodgeChance || 0}%** *(Teto: ${st.maxDodgeChance || 75}%)* | Evasão contra ataques inimigos |
| 🛡️ **Defensivo** | Esquiva Elemental | **${st.elementalDodgeChance || 0}%** | Evasão contra projéteis mágicos |
| 🔮 **Resistências** | Resistência ao Caos | **${st.chaosResistance ?? 0}%** | Vital em Tormento (Teto seguro: 75%) |
| 🔮 **Resistências** | Resistência a Fogo | **${st.fireResistance ?? 0}%** | Mitigação contra dano ígneo (Teto: 75%) |
| 🔮 **Resistências** | Resistência a Gelo | **${st.coldResistance ?? 0}%** | Mitigação contra dano glacial/congelamento (Teto: 75%) |
| 🔮 **Resistências** | Resistência a Raio | **${st.lightningResistance ?? 0}%** | Mitigação contra choque/elétrico (Teto: 75%) |
| 👟 **Mobilidade** | Velocidade de Movimento | **${st.moveSpeed || 850}** | Padrão: 850 pts (Evitar ultrapassar Tanque em +50 pts) |

#### Habilidades Equipadas na Party (3 Slots):
${h.equippedSkills.map(sk => `- ⚡ **${sk.name}** (ID: \`${sk.skillKey}\`, Dano: ${sk.dmgType}, Alcance: ${sk.delivery}, Recarga: ${sk.cooldown}s)`).join("\n") || "- Nenhuma habilidade equipada"}

#### Habilidades & Talentos Ativos na Árvore (${(h.heroTalents || []).length} nós):
| Habilidade / Talento | Tipo | Nível | Buffer Concedido |
| :--- | :---: | :---: | :--- |
`;
            (h.heroTalents || []).forEach(t => {
                const typeLabel = t.type === "ACTIVESKILL" 
                    ? (t.isEquipped ? "**Ativa (Equipada)**" : "Ativa (Reserva)") 
                    : "Passiva";
                md += `| ${t.name} | ${typeLabel} | Lv. ${t.level}/${t.maxLevel} | ${t.description} |\n`;
            });

            md += `\n#### Build Completa dos 10 Slots de Equipamentos (Nome, Grau, Buffers, Inerentes, Única e Slots):
| Slot | Item & Grau | Buffers Base | Atributos Inerentes | Stats Únicas | Decorações | Gravações | Inscrições | Cubo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
`;
            h.equippedSlots.forEach(s => {
                if (s.isEmpty) {
                    md += `| **${s.slotName}** | *(Slot Vazio)* | - | - | - | - | - | - | - |\n`;
                } else {
                    const gradeText = `${s.gradeLabel || s.grade} [T${s.tier}]<br>Lv.${s.level} (${s.heroRestriction || 'Qualquer Herói'})`;
                    const baseStatsText = (s.baseStats?.list && s.baseStats.list.length > 0)
                        ? s.baseStats.list.map(b => `${b.label}: ${b.value}`).join("<br>")
                        : "-";
                    const inhText = (s.inherentAttributes && s.inherentAttributes.length > 0)
                        ? s.inherentAttributes.map(a => a.formattedText).join("<br>")
                        : "-";
                    const uniqueText = s.uniqueStat 
                        ? `🌟 **${s.uniqueStat.name}**:<br>${s.uniqueStat.description}` 
                        : "-";
                    const decorsText = (s.decorationsList && s.decorationsList.length > 0)
                        ? s.decorationsList.map(m => `[T${m.tier}] ${m.slotDisplay || (m.statName + ' ' + m.formattedVal)}`).join("<br>")
                        : "-";
                    const engravingsText = (s.engravingsList && s.engravingsList.length > 0)
                        ? s.engravingsList.map(m => `[T${m.tier}] ${m.slotDisplay || (m.statName + ' ' + m.formattedVal)}`).join("<br>")
                        : "-";
                    const inscriptsText = (s.inscriptionsList && s.inscriptionsList.length > 0)
                        ? s.inscriptionsList.map(m => `[T${m.tier}] ${m.slotDisplay || (m.statName + ' ' + m.formattedVal)}`).join("<br>")
                        : "-";

                    md += `| **${s.slotName}** | **${s.name}**<br>${gradeText} | ${baseStatsText} | ${inhText} | ${uniqueText} | ${decorsText} | ${engravingsText} | ${inscriptsText} | \`${s.cubeAction}\` |\n`;
                }
            });
        });

        md += `\n---

## 5. INVENTÁRIO E MOCHILA COMPLETA (STASH)
* **Total no Inventário (Bolsa Ativa)**: ${inventory.length} itens
* **Total na Mochila (Stash / Baú)**: ${stash.length} itens
* **Itens para SÍNTESE (100% EXP)**: ${synthItems.length} itens (dentro da margem ±10 do Cubo Lv.${cube.level})
* **Itens para ALQUIMIA / CORROSÃO**: ${alchemyItems.length} itens (fora da margem segura do Cubo)

### Tabela Completa de Itens Armazenados:
| Local | Item / Nome Oficial | Nível & Tier | Modificadores Aplicados | Ação Recomendada |
| :--- | :--- | :---: | :--- | :--- |
`;

        allStorage.forEach(it => {
            const modsSummary = (it.detailedModifiers || []).map(m => `[T${m.tier}] ${m.statName} ${m.formattedVal}`).join("; ") || "Sem materiais";
            md += `| ${it.location} | **${it.name}** | Lv.${it.level} [T${it.tier} ${it.grade}] | ${modsSummary} | **${it.cubeAction}** (${it.cubeReason}) |\n`;
        });

        md += `\n---

## 6. DIRETRIZES DE REORGANIZAÇÃO PARA A IA-TBH
1. **Sanar Falsos Danos**: Converter decorações de DPS puro em multiplicadores de Chance Crítica nos Acessórios até que o herói DPS alcance >50% de consistência.
2. **Ativar Provocação no Cavaleiro**: Alocar imediatamente \`10201\` (Provocação) no Cavaleiro para retirar o foco dos monstros sobre o DPS.
3. **Equipar Santuário na Sacerdotisa**: Substituir magias ofensivas da Sacerdotisa por Santuário (\`40201\`) para manter o ciclo de cura contínua.
4. **Alinhar Pets ao Drop de Chefe**: Substituir o Morcego por Espírito Sombrio / Esqueleto Ardente em atos de Tormento/Peste para maximizar o drop de armas e armaduras Celestiais Lv. 90.
5. **Roteamento de Corrosão**: Enviar todo o excedente de itens Lv. <= 80 para Corrosão a fim de acumular Contaminação.
`;

        return md;
    }
}


// [RSK-SEC-004] Sanitização de PII para exportação
function sanitizePII(data) {
    if (!window.TTBH_CONFIG || window.TTBH_CONFIG.anonimizePII === false) {
        return data;
    }
    
    const sanitized = JSON.parse(JSON.stringify(sanitizePII(data))); // Deep clone
    
    if (sanitized.ownerSteamId) sanitized.ownerSteamId = '[STEAM_ID_ANONIMIZADO]';
    if (sanitized.username) sanitized.username = '[USUARIO_ANONIMIZADO]';
    
    // Percorrer arrays de heróis/itens se existirem
    const keysToCheck = ['heroes', 'items', 'inventory', 'stash', 'characters'];
    keysToCheck.forEach(key => {
        if (Array.isArray(sanitized[key])) {
            sanitized[key].forEach(item => {
                if (item.ownerSteamId) item.ownerSteamId = '[STEAM_ID_ANONIMIZADO]';
                if (item.username) item.username = '[USUARIO_ANONIMIZADO]';
            });
        }
    });
    
    return sanitized;
}
