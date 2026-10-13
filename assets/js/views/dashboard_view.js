import { TBH_DB } from '../gamedata.js';
import { renderAggregatesPanel, renderStageTelemetry } from './telemetry_view.js';
import { renderHeroes } from './hero_view.js';
import { renderStashValue, renderFarmProjections } from './market_view.js';
import { filterAndRenderStorage, renderPetsTab, renderCubeOptimization } from './storage_view.js';
import { StatisticsEngine } from '../statistics_engine.js';
import { AiExporter, CombatAuditor } from '../ai_exporter.js';
import { AggregateAnalytics } from '../aggregate_analytics.js';
import { EnchantmentProfiler } from '../enchantment_profiler.js';

const statsEngine = new StatisticsEngine();

// dashboard_view.js - Extraído de app.js

export function renderDashboard(data) {
        // 1. Telemetria Geral
        document.getElementById('stat-gold').textContent = data.currencies.goldFormatted;
        document.getElementById('stat-cube-level').textContent = `Lv. ${data.cube.level}`;
        document.getElementById('stat-current-stage').textContent = data.account.currentStageFormatted;
        document.getElementById('stat-max-stage').textContent = `Max: ${data.account.maxStageFormatted}`;
        document.getElementById('stat-playtime').textContent = data.account.playTimeFormatted;
        document.getElementById('stat-version').textContent = `Versão: ${data.account.version}`;

        // Schema Drift Guard (Tarefa 3)
        const schemaVer = data.meta?.schemaVersion || data.account?.version || "1.0.0";
        window.__lastDetectedSchemaVersion = schemaVer;
        const supportedSave = TBH_DB?.meta?.supportedSaveSchema || "1.2.8";
        const driftBanner = document.getElementById('schema-drift-banner');
        const driftMsg = document.getElementById('schema-drift-message');
        const btnDismissDrift = document.getElementById('btn-dismiss-drift-banner');

        if (driftBanner && driftMsg) {
            if (schemaVer !== supportedSave) {
                driftMsg.textContent = `Schema do save ${schemaVer} ≠ suportado ${supportedSave}. Campos novos podem aparecer não mapeados — reporte ao time.`;
                driftBanner.classList.remove('hidden');
            } else {
                driftBanner.classList.add('hidden');
            }
            if (btnDismissDrift) {
                btnDismissDrift.onclick = () => { driftBanner.classList.add('hidden'); };
            }
        }

        const steamIdEl = document.getElementById('stat-steam-id');
        if (steamIdEl) {
            const rawSteam = data.account?.ownerSteamId;
            if (rawSteam) {
                // Formata Steam ID em blocos legíveis: ex 76561 1980 1234 5678
                const formattedSteam = String(rawSteam).replace(/(\d{5})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
                steamIdEl.textContent = `Steam: ${formattedSteam}`;
                steamIdEl.title = `Steam ID: ${rawSteam}`;
            } else {
                steamIdEl.textContent = `Steam: Convidado`;
                steamIdEl.title = 'Sem vínculo com conta Steam';
            }
        }

        // Renderiza Painel de Atividade Acumulada
        renderAggregatesPanel(data.aggregates || data.raw?.aggregateSaveDatas || []);

        // 1.1 Métrica POWER (0-100)
        const mainHero = (data.heroes && data.heroes.length) ? data.heroes[0] : null;
        const powerData = statsEngine.calculatePOWER(mainHero, {
            runeBonus: data.account?.runeBonus || 20,
            petBonus: data.pets?.totalBuffs?.exp || 15
        });
        const statPowerEl = document.getElementById('stat-power');
        const statPowerRankEl = document.getElementById('stat-power-rank');
        if (statPowerEl) {
            statPowerEl.textContent = `${powerData.score} / 100`;
            statPowerEl.style.color = powerData.tierColor;
        }
        if (statPowerRankEl) {
            statPowerRankEl.textContent = `Tier: ${powerData.rank}`;
        }

        // 1.2 Métrica Stash Value
        renderStashValue(data);

        // 2. Pet Ativo no cabeçalho
        document.getElementById('active-pet-name').textContent = `${data.activePet.icon} ${data.activePet.name}`;
        const activeBuffsStr = data.activePet.buffs ? data.activePet.buffs.join(", ") : (data.activePet.desc || data.activePet.boost || "Buffs");
        document.getElementById('active-pet-boost').textContent = activeBuffsStr;

        // 3. Auditoria de Combate & Diagnósticos IA
        renderCombatAudit(data);

        // 4. Renderiza Heróis (com clique para modal)
        renderHeroes(data.heroes);

        // 5. Renderiza Aba de Armazenamento (Inventário & Mochila)
        window.__allCurrentStorageItems = data.allStorageItems || [];
        filterAndRenderStorage();

        // 6. Renderiza Aba de Pets & Soma Global de Buffs
        renderPetsTab(data.pets);

        // 7. Renderiza Otimizador do Cubo
        renderCubeOptimization(data.inventory, data.cube.level);

        // 8. Eficiência de Farm, Telemetria de Estágio & Projeções
        renderStageTelemetry(data.account);
        renderFarmProjections();

        // 9. BiS Finder & Rune Planner
        if (window.__renderBiSFinder) window.__renderBiSFinder(data);
        if (window.__renderRunePlanner) window.__renderRunePlanner(data);

        // 10. Aba de Relatório IA (Markdown)
        const aiMarkdown = AiExporter.generateMarkdown(data);
        const aiMarkdownContent = document.getElementById("ai-markdown-content");
        if (aiMarkdownContent) {
            aiMarkdownContent.value = aiMarkdown;
        }

        // 11. Inspetor JSON
        document.getElementById('json-viewer-content').textContent = JSON.stringify(data.raw, null, 2);

        // 12. [V1.1.0] Cards de Data Science Avançada
        renderDataScienceCards(data);
    }

export function renderDataScienceCards(parsedData) {
    const aggregateEngine = AggregateAnalytics || window.TTBH_AggregateAnalytics || window.AggregateAnalytics;
    const enchantEngine = EnchantmentProfiler || window.TTBH_EnchantmentProfiler || window.EnchantmentProfiler;

    if (!aggregateEngine || !enchantEngine || !parsedData) {
        return;
    }

    try {
        const aggregateStats = aggregateEngine.analyze(parsedData);
        const enchantStats = enchantEngine.analyze(parsedData);

        const effEl = document.getElementById('card-farm-efficiency');
        if (effEl) effEl.textContent = (aggregateStats.efficiency || 0).toFixed(1);

        const goldEl = document.getElementById('card-gold-per-min');
        if (goldEl) goldEl.textContent = Math.round(aggregateStats.goldPerMinute || 0).toLocaleString('pt-BR');

        const deadEl = document.getElementById('card-dead-slots');
        if (deadEl) deadEl.textContent = (enchantStats.deadSlots || []).length;

        const chaoticEl = document.getElementById('card-chaotic-items');
        if (chaoticEl) chaoticEl.textContent = enchantStats.chaoticItems || 0;

        const timeEl = document.getElementById('card-total-playtime');
        if (timeEl) timeEl.textContent = (aggregateStats.totalPlayTimeHours || 0).toFixed(1) + 'h';

        const boxesEl = document.getElementById('card-boxes-per-hour');
        if (boxesEl) boxesEl.textContent = (aggregateStats.boxesPerHour || 0).toFixed(1);
    } catch (e) {
        console.warn('[Dashboard] Erro ao renderizar Data Science cards:', e);
    }
}

export function renderCombatAudit(data) {
        const auditContainer = document.getElementById('combat-audit-container');
        if (!auditContainer) return;

        auditContainer.innerHTML = '';
        const audit = CombatAuditor.runAudit(data);

        const allCards = [
            ...audit.dps.map(a => ({ ...a, category: "DPS & Eficiência" })),
            ...audit.mitigation.map(a => ({ ...a, category: "Mitigação & Tanque" })),
            ...audit.synergy.map(a => ({ ...a, category: "Sinergia & Habilidades" })),
            ...audit.economy.map(a => ({ ...a, category: "Pets & Economia" }))
        ];

        allCards.forEach(item => {
            const card = document.createElement('div');
            const sev = (item.severity || "info").toLowerCase();
            card.className = `combat-audit-card ${sev}`;

            let sevBadgeClass = "badge-tier-8";
            let sevBadgeText = "SUGESTÃO";
            if (item.severity === "CRITICAL") {
                sevBadgeClass = "badge-tier-5";
                sevBadgeText = "ALERTA CRÍTICO";
            } else if (item.severity === "WARNING") {
                sevBadgeClass = "badge-tier-4";
                sevBadgeText = "GARGALO";
            } else if (item.severity === "OPTIMAL") {
                sevBadgeClass = "badge-tier-2";
                sevBadgeText = "OTIMIZADO";
            }

            card.innerHTML = `
                <div>
                    <div class="combat-audit-header">
                        <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700;">
                            ${item.category}
                        </span>
                        <span class="gear-tag ${sevBadgeClass}">
                            ${sevBadgeText}
                        </span>
                    </div>
                    <div class="combat-audit-title">${item.title}</div>
                    <div class="combat-audit-body" style="margin-top: 0.4rem;">
                        ${item.diagnostic}
                    </div>
                </div>
            `;
            auditContainer.appendChild(card);
        });
    }

