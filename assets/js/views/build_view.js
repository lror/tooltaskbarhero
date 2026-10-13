/**
 * Build View - Aba dedicada para visualização detalhada de builds de heróis
 */

import { TBH_DB } from '../gamedata.js';
import { StatisticsEngine } from '../statistics_engine.js';
import { openHeroModal } from './hero_view.js';

const statsEngine = new StatisticsEngine();

/**
 * Renderiza a aba BUILD com lista completa de heróis e suas builds
 */
export function renderBuildTab(parsedData) {
    const buildContainer = document.getElementById('build-container');
    if (!buildContainer || !parsedData) return;
    
    const heroes = parsedData.heroes || [];
    
    if (heroes.length === 0) {
        buildContainer.innerHTML = '<p style="color: #8b9bb4; text-align: center; padding: 2rem;">Nenhum herói desbloqueado encontrado.</p>';
        return;
    }
    
    let html = '<div class="build-grid">';
    
    heroes.forEach(hero => {
        if (!hero.isUnlocked && hero.isUnlocked !== undefined) return;
        
        const stats = hero.combatStats || hero.baseStats || {};
        const equipped = hero.equippedSlots || [];
        
        // Arma principal e offhand
        const weapon = equipped.find(s => s.slotIndex === 0 && !s.isEmpty);
        const offhand = equipped.find(s => s.slotIndex === 1 && !s.isEmpty);
        
        // Calcular power score
        const powerData = statsEngine.calculatePOWER(hero);
        const powerScore = powerData ? powerData.score : 0;
        
        html += `
            <div class="build-card" data-hero-id="${hero.id || hero.name}">
                <div class="build-card-header">
                    <div class="hero-icon">${hero.icon || '🛡️'}</div>
                    <div class="hero-info">
                        <h3>${hero.name}</h3>
                        <p class="hero-class">${hero.className || hero.cls || 'Herói'} • Lv. ${hero.level || 1}</p>
                    </div>
                    <div class="power-badge">
                        <span class="power-label">POWER</span>
                        <span class="power-value">${powerScore.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="build-stats">
                    <div class="stat-row">
                        <span class="stat-label">⚔️ Dano / DPS</span>
                        <span class="stat-value">${Math.round(stats.dps || stats.attackDamage || 0).toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">🛡️ Armadura</span>
                        <span class="stat-value">${Math.round(stats.armor || stats.defense || 0).toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">❤️ Vida Máxima</span>
                        <span class="stat-value">${Math.round(stats.maxHp || stats.hp || 0).toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">⚡ Velocidade</span>
                        <span class="stat-value">${(stats.attackSpeed || 1.0).toFixed(2)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">🎯 Chance Crítica</span>
                        <span class="stat-value">${(stats.critChance || stats.critRate || 0).toFixed(1)}%</span>
                    </div>
                </div>
                
                <div class="build-gear">
                    <h4>Equipamentos Principais</h4>
                    ${weapon ? `
                        <div class="gear-item">
                            <span class="gear-label">Arma:</span>
                            <span class="gear-name">${weapon.name}</span>
                            <span class="gear-level">Lv.${weapon.level}</span>
                        </div>
                    ` : '<div class="gear-item empty">Sem arma principal equipada</div>'}
                    
                    ${offhand ? `
                        <div class="gear-item">
                            <span class="gear-label">Off-hand:</span>
                            <span class="gear-name">${offhand.name}</span>
                            <span class="gear-level">Lv.${offhand.level}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="build-actions">
                    <button class="btn btn-sm btn-primary view-details-btn" data-hero-name="${hero.name}">
                        Ver Detalhes Completos (10 Slots)
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    buildContainer.innerHTML = html;
    
    // Adicionar event listeners para botões de detalhes e cards
    buildContainer.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const heroName = e.currentTarget.dataset.heroName;
            const hero = heroes.find(h => h.name === heroName);
            if (hero) {
                openHeroModal(hero);
            }
        });
    });

    buildContainer.querySelectorAll('.build-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            const btn = e.currentTarget.querySelector('.view-details-btn');
            if (btn) btn.click();
        });
    });
}

if (typeof window !== 'undefined') {
    window.renderBuildTab = renderBuildTab;
}
