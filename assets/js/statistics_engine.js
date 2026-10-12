/**
 * TTBH - ToolTaskBarHero
 * Core Statistics & Analytics Engine
 * 
 * Este módulo processa os dados brutos descriptografados do save
 * e aplica as regras matemáticas de negócio para gerar recomendações.
 */

export class StatisticsEngine {
    constructor() {
        // Multiplicadores baseados na "Calculadora de Eficiência"
        this.PET_MODIFIERS = {
            bat: { exp: 1.15, gold: 1.0, chests: 0.10 },
            watcher: { exp: 1.0, gold: 1.15, chests: 0.0 }
        };
        // Regra descoberta: itens com mais de 10 níveis de diferença cortam a EXP do cubo
        this.CUBE_PENALTY_MARGIN = 10;
        
        // Regra de ouro do Farm: Chefe deve morrer em menos de 1 min.
        this.OPTIMAL_CLEAR_TIME_SEC = 60; 
    }

    /**
     * Calcula a projeção de ganhos comparando os dois principais pets de farm
     * @param {number} kills - Inimigos abatidos projetados
     * @param {number} baseExp - Experiência base do estágio
     * @param {number} baseGold - Ouro base do estágio
     */
    calculateFarmEfficiency(kills, baseExp, baseGold) {
        const batStats = {
            pet: 'Morcego',
            totalExp: kills * baseExp * this.PET_MODIFIERS.bat.exp,
            totalGold: kills * baseGold * this.PET_MODIFIERS.bat.gold,
            extraChests: kills * this.PET_MODIFIERS.bat.chests
        };

        const watcherStats = {
            pet: 'Vigia',
            totalExp: kills * baseExp * this.PET_MODIFIERS.watcher.exp,
            totalGold: kills * baseGold * this.PET_MODIFIERS.watcher.gold,
            extraChests: kills * this.PET_MODIFIERS.watcher.chests
        };

        return { batStats, watcherStats };
    }

    /**
     * Analisa um item do inventário contra o nível do Cubo do jogador
     * @param {number} cubeLevel - Nível atual do Cubo
     * @param {number} itemLevel - Nível do item a ser processado
     */
    evaluateCubeAction(cubeLevel, itemLevel) {
        const levelDifference = Math.abs(cubeLevel - itemLevel);
        
        if (levelDifference <= this.CUBE_PENALTY_MARGIN) {
            return {
                action: 'SÍNTESE',
                color: 'green',
                reason: `Item (Lv.${itemLevel}) na margem segura (±10) do Cubo (Lv.${cubeLevel}). 100% de EXP.`
            };
        } else {
            return {
                action: 'ALQUIMIA',
                color: 'red',
                reason: `Item (Lv.${itemLevel}) fora da margem do Cubo (Lv.${cubeLevel}). Penalidade de EXP detectada. Otimize vendendo/convertendo.`
            };
        }
    }

    /**
     * Analisa o tempo de clear de um estágio e julga a eficiência
     * @param {number} currentStage - Nome/Número do estágio (ex: "2-8")
     * @param {number} clearTimeSeconds - Tempo em segundos para limpar a onda/chefe
     */
    analyzeBottleneck(currentStage, clearTimeSeconds) {
        if (clearTimeSeconds > this.OPTIMAL_CLEAR_TIME_SEC) {
            const lossPercent = Math.round(((clearTimeSeconds - this.OPTIMAL_CLEAR_TIME_SEC) / this.OPTIMAL_CLEAR_TIME_SEC) * 100);
            return {
                status: 'GARGALO DETECTADO',
                recommendation: `Recuar estágio. Tempo de abate > 60s prejudica o farm de baús em ${lossPercent}%.`,
                isOptimal: false
            };
        }
        return {
            status: 'OTIMIZADO',
            recommendation: `Manter farm. Estágio ${currentStage} sendo limpo em tempo hábil (${clearTimeSeconds}s).`,
            isOptimal: true
        };
    }

    /**
     * Métrica POWER (0–100) — Avaliação de força de build
     * POWER = f(DPS, HP, Armor, CritRate, CritDmg, AtkSpeed, RuneBonus, PetBonus)
     * Normalizado de 0 a 100 com base nos benchmarks da comunidade do Task Bar Hero
     * @param {Object} hero - Objeto do herói ou estatísticas agregadas da equipe
     * @param {Object} context - { runeBonus: number, petBonus: number }
     * @returns {Object} Score de 0 a 100 e classificação de tier
     */
    calculatePOWER(hero, context = {}) {
        if (!hero) return { score: 0, rank: "F", label: "Sem dados" };

        const stats = hero.baseStats || hero.combatStats || hero;
        const dps = Number(stats.dps || stats.attackDamage || 10);
        const hp = Number(stats.maxHp || stats.hp || 100);
        const armor = Number(stats.armor || 10);
        const critRate = Math.min(100, Math.max(0, Number(stats.critChance || stats.critRate || 5)));
        const critDmg = Math.max(100, Number(stats.critDamage || 150));
        const atkSpeed = Math.max(0.5, Number(stats.attackSpeed || 1.0));
        const runeBonus = Number(context.runeBonus || 0);
        const petBonus = Number(context.petBonus || 0);

        // Pesos relativos de combate (Ofensivo, Defensivo, Consistência e Bônus de Conta)
        // 1. Escala logarítmica de DPS (referência: 1.000 early, 50.000 mid, 5.000.000+ endgame)
        const dpsScore = Math.min(35, Math.log10(Math.max(10, dps)) * 5.0);

        // 2. Sobrevivência (EHP baseado em Vida e Armadura)
        const effectiveHp = hp * (1 + armor / 100);
        const survivabilityScore = Math.min(25, Math.log10(Math.max(50, effectiveHp)) * 4.0);

        // 3. Eficiência de Crítico (Produto de Chance x Dano crítico)
        const critMultiplier = 1 + (critRate / 100) * ((critDmg - 100) / 100);
        const critScore = Math.min(20, (critMultiplier - 1) * 6.5);

        // 4. Cadência de Ataque
        const speedScore = Math.min(10, (atkSpeed / 2.5) * 10);

        // 5. Bônus de Conta (Runas e Mascotes)
        const metaScore = Math.min(10, (runeBonus * 0.1) + (petBonus * 0.1));

        const rawScore = dpsScore + survivabilityScore + critScore + speedScore + metaScore;
        const finalScore = Math.min(100, Math.max(1, Math.round(rawScore)));

        let rank = "C";
        let tierColor = "#94a3b8";

        if (finalScore >= 95) { rank = "COSMIC"; tierColor = "#ff007a"; }
        else if (finalScore >= 85) { rank = "CELESTIAL"; tierColor = "#38bdf8"; }
        else if (finalScore >= 75) { rank = "BEYOND"; tierColor = "#f43f5e"; }
        else if (finalScore >= 65) { rank = "IMMORTAL"; tierColor = "#ef4444"; }
        else if (finalScore >= 50) { rank = "LEGENDARY"; tierColor = "#facc15"; }
        else if (finalScore >= 35) { rank = "RARE"; tierColor = "#3b82f6"; }
        else if (finalScore >= 20) { rank = "UNCOMMON"; tierColor = "#22c55e"; }
        else { rank = "COMMON"; tierColor = "#cbd5e1"; }

        return {
            score: finalScore,
            rank: rank,
            tierColor: tierColor,
            breakdown: {
                dps: Math.round(dpsScore),
                survivability: Math.round(survivabilityScore),
                crit: Math.round(critScore),
                speed: Math.round(speedScore),
                meta: Math.round(metaScore)
            }
        };
    }
}
