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
}