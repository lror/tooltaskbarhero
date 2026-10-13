import { filterAndRenderStorage } from './storage_view.js';
import { farmingCalculator } from '../farming_calculator.js';
import { chestSimulator } from '../chest_simulator.js';
import { marketPrice } from '../market_price.js';
import { chestOptimizer } from '../chest_optimizer.js';
import { backupTimeline } from '../backup_timeline.js';
import { CryptoEngine } from '../crypto.js';
import { SaveParser } from '../save_parser.js';

const cryptoEngine = new CryptoEngine();
const saveParser = new SaveParser();

// timeline_view.js - Extraído de app.js

export function initTimelineUI() {
        const dropzone = document.getElementById('timeline-dropzone');
        const fileInput = document.getElementById('timeline-file-input');
        const emptyNotice = document.getElementById('timeline-empty-notice');
        const content = document.getElementById('timeline-content');
        const svg = document.getElementById('timeline-svg');
        const diffTbody = document.getElementById('timeline-diff-tbody');
        const btnExportJson = document.getElementById('btn-export-timeline-json');

        if (!dropzone || dropzone._hasTimelineListener) return;
        dropzone._hasTimelineListener = true;

        dropzone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--accent-primary)';
        });

        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'rgba(56, 189, 248, 0.4)';
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleTimelineFiles(Array.from(e.dataTransfer.files));
            }
        });

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    handleTimelineFiles(Array.from(e.target.files));
                }
            });
        }

        if (btnExportJson) {
            btnExportJson.addEventListener('click', () => {
                const series = backupTimeline.getSeries();
                const diffs = backupTimeline.getDiffs();
                const jsonBlob = new Blob([JSON.stringify({ series, diffs }, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(jsonBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ttbh_timeline_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        async function handleTimelineFiles(files) {
            for (const file of files) {
                try {
                    const ab = await file.arrayBuffer();
                    const decrypted = await cryptoEngine.decryptBuffer(ab);
                    const parsed = saveParser.parse(decrypted);
                    backupTimeline.addSave({
                        name: file.name,
                        parsedData: parsed
                    });
                } catch (err) {
                    console.warn('Erro ao processar save na timeline:', file.name, err);
                }
            }
            renderTimelineData();
        }

        function renderTimelineData() {
            const series = backupTimeline.getSeries();
            const diffs = backupTimeline.getDiffs();

            if (series.length < 2) {
                if (emptyNotice) emptyNotice.style.display = 'block';
                if (content) content.classList.add('hidden');
                return;
            }

            if (emptyNotice) emptyNotice.style.display = 'none';
            if (content) content.classList.remove('hidden');

            // Renderiza Tabela de Diffs
            if (diffTbody) {
                diffTbody.innerHTML = '';
                diffs.forEach(d => {
                    const tr = document.createElement('tr');
                    const fmtGold = (d.deltaGold >= 0 ? '+' : '') + d.deltaGold.toLocaleString('pt-BR');
                    const goldColor = d.deltaGold >= 0 ? '#4ade80' : '#f87171';
                    const fmtCube = (d.deltaCube >= 0 ? '+' : '') + d.deltaCube;
                    const cubeColor = d.deltaCube >= 0 ? '#60a5fa' : '#f87171';
                    const fmtStage = (d.deltaStage >= 0 ? '+' : '') + d.deltaStage;
                    const stageColor = d.deltaStage >= 0 ? '#4ade80' : '#f87171';
                    const fmtItems = (d.deltaItems >= 0 ? '+' : '') + d.deltaItems;

                    tr.innerHTML = `
                        <td><strong>${d.from}</strong></td>
                        <td><strong>${d.to}</strong></td>
                        <td><span style="color:var(--text-muted);">${d.timeDeltaFormatted}</span></td>
                        <td><strong style="color:${goldColor};">${fmtGold} G</strong></td>
                        <td><strong style="color:${cubeColor};">${fmtCube}</strong></td>
                        <td><strong style="color:${stageColor};">${fmtStage}</strong></td>
                        <td><span>${fmtItems}</span></td>
                    `;
                    diffTbody.appendChild(tr);
                });
            }

            // Renderiza Gráfico SVG Normalizado (600x220)
            if (svg) {
                svg.innerHTML = '';
                const W = 600, H = 220, PAD = 30;
                const plotW = W - PAD * 2;
                const plotH = H - PAD * 2;

                const maxGold = Math.max(1, ...series.map(s => s.gold));
                const maxCube = Math.max(1, ...series.map(s => s.cubeLevel));
                const maxStage = Math.max(1, ...series.map(s => s.stage));

                const goldPts = [];
                const cubePts = [];
                const stagePts = [];

                series.forEach((s, i) => {
                    const x = PAD + (i / (series.length - 1)) * plotW;
                    const yGold = H - PAD - (s.gold / maxGold) * plotH;
                    const yCube = H - PAD - (s.cubeLevel / maxCube) * plotH;
                    const yStage = H - PAD - (s.stage / maxStage) * plotH;

                    goldPts.push(`${x},${yGold}`);
                    cubePts.push(`${x},${yCube}`);
                    stagePts.push(`${x},${yStage}`);
                });

                function createPath(pts, color) {
                    const p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                    p.setAttribute('points', pts.join(' '));
                    p.setAttribute('fill', 'none');
                    p.setAttribute('stroke', color);
                    p.setAttribute('stroke-width', '2');
                    svg.appendChild(p);
                }

                createPath(goldPts, '#fbbf24');
                createPath(cubePts, '#60a5fa');
                createPath(stagePts, '#4ade80');
            }
        }

        // ==========================================
        // FASE 10: INTEGRAÇÃO FARMING CALCULATOR
        // ==========================================
        const farmingCalc = farmingCalculator.create(window.TBH_DB || {});
        const btnCalcFarming = document.getElementById('btn-calc-farming');
        const farmingClearTimeInput = document.getElementById('farming-clear-time');
        const farmingHeroLevelInput = document.getElementById('farming-hero-level');
        const farmingGoalSelect = document.getElementById('farming-optimize-goal');
        const farmingTbody = document.getElementById('farming-table-tbody');
        const farmingSuggestBox = document.getElementById('farming-suggest-box');

        function renderFarmingTable() {
            if (!farmingTbody) return;
            const clearTime = Number(farmingClearTimeInput?.value) || 15;
            const heroLv = Number(farmingHeroLevelInput?.value) || 35;
            const goal = farmingGoalSelect?.value || 'exp';

            const ranking = farmingCalc.rankStages(clearTime, goal, null, heroLv);
            const suggest = farmingCalc.suggestFarmStage(heroLv, clearTime, goal);

            if (farmingSuggestBox && suggest) {
                farmingSuggestBox.innerHTML = `
                    ⭐ <strong>Stage Sugerida:</strong> Stage ${suggest.stage} (${suggest.diff}) — <em>${suggest.name}</em> (Lv ${suggest.lv}) |
                    <strong>EXP/h:</strong> ${Math.round(suggest.expPerHour).toLocaleString('pt-BR')} |
                    <strong>Gold/h:</strong> ${Math.round(suggest.goldPerHour).toLocaleString('pt-BR')}
                `;
            }

            farmingTbody.innerHTML = '';
            ranking.forEach(r => {
                const tr = document.createElement('tr');
                const isBest = suggest && r.stage === suggest.stage && r.diff === suggest.diff;
                if (isBest) {
                    tr.style.background = 'rgba(16, 185, 129, 0.15)';
                }
                const statusColor = r.status === 'OK' ? '#4ade80' : (r.status.includes('PENALTY') ? '#f87171' : '#facc15');

                tr.innerHTML = `
                    <td><strong>${r.stage}</strong></td>
                    <td><span class="badge ${r.diff.toLowerCase()}">${r.diff}</span></td>
                    <td>${r.name}</td>
                    <td>${r.lv}</td>
                    <td>${r.expClear.toLocaleString('pt-BR')}</td>
                    <td>${r.goldClear.toLocaleString('pt-BR')}</td>
                    <td><strong style="color: #60a5fa;">${Math.round(r.expPerHour).toLocaleString('pt-BR')}</strong></td>
                    <td><strong style="color: #fbbf24;">${Math.round(r.goldPerHour).toLocaleString('pt-BR')}</strong></td>
                    <td><span style="color: ${statusColor}; font-weight: 600;">${r.status}</span></td>
                `;
                farmingTbody.appendChild(tr);
            });
        }

        if (btnCalcFarming) {
            btnCalcFarming.addEventListener('click', renderFarmingTable);
        }

        // ==========================================
        // FASE 10: INTEGRAÇÃO CHEST SIMULATOR
        // ==========================================
        const chestSim = chestSimulator.create(window.TBH_DB || {});
        const btnRunChestSim = document.getElementById('btn-run-chest-sim');
        const chestBoxSelect = document.getElementById('chest-box-select');
        const chestCountInput = document.getElementById('chest-sim-count');
        const chestResultsTbody = document.getElementById('chest-results-tbody');
        const chestImmortalRuns = document.getElementById('chest-immortal-runs');
        const chestDistSvg = document.getElementById('chest-dist-svg');

        function renderChestSimulation() {
            if (!chestResultsTbody) return;
            const boxId = chestBoxSelect?.value || 'stageBossBox4';
            const count = Math.min(10000, Math.max(1, Number(chestCountInput?.value) || 1000));

            const result = chestSim.simulate(boxId, count);
            const expImmortal = chestSim.expectedRunsForGrade(boxId, 'IMMORTAL');
            if (chestImmortalRuns) {
                chestImmortalRuns.textContent = expImmortal === Infinity ? 'N/A' : `~${expImmortal} runs`;
            }

            chestResultsTbody.innerHTML = '';
            const gradesOrder = ['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY', 'IMMORTAL'];
            
            gradesOrder.forEach(g => {
                const info = result.comparison[g] || { count: 0, actualPct: 0, expectedPct: 0, diffPct: 0 };
                const tr = document.createElement('tr');
                const diffColor = info.diffPct >= 0 ? '#4ade80' : '#f87171';
                tr.innerHTML = `
                    <td><strong>${g}</strong></td>
                    <td>${info.count.toLocaleString('pt-BR')}</td>
                    <td>${info.actualPct.toFixed(2)}%</td>
                    <td>${info.expectedPct.toFixed(2)}%</td>
                    <td><span style="color: ${diffColor};">${(info.diffPct > 0 ? '+' : '') + info.diffPct.toFixed(2)}%</span></td>
                `;
                chestResultsTbody.appendChild(tr);
            });

            // Renderiza barras no SVG (600x150)
            if (chestDistSvg) {
                chestDistSvg.innerHTML = '';
                const W = 600, H = 150, PAD = 20;
                const barWidth = 70;
                const spacing = (W - PAD * 2) / gradesOrder.length;

                gradesOrder.forEach((g, idx) => {
                    const info = result.comparison[g] || { actualPct: 0 };
                    const barHeight = Math.min(H - PAD * 2, (info.actualPct / 100) * (H - PAD * 2));
                    const x = PAD + idx * spacing + (spacing - barWidth) / 2;
                    const y = H - PAD - barHeight;

                    // Barra
                    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rect.setAttribute('x', x);
                    rect.setAttribute('y', y);
                    rect.setAttribute('width', barWidth);
                    rect.setAttribute('height', barHeight);
                    rect.setAttribute('fill', '#38bdf8');
                    rect.setAttribute('rx', '4');
                    chestDistSvg.appendChild(rect);

                    // Label Grade
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', x + barWidth / 2);
                    text.setAttribute('y', H - 5);
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('fill', '#94a3b8');
                    text.setAttribute('font-size', '11');
                    text.textContent = g;
                    chestDistSvg.appendChild(text);

                    // Label %
                    const textPct = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    textPct.setAttribute('x', x + barWidth / 2);
                    textPct.setAttribute('y', Math.max(15, y - 4));
                    textPct.setAttribute('text-anchor', 'middle');
                    textPct.setAttribute('fill', '#f1f5f9');
                    textPct.setAttribute('font-size', '10');
                    textPct.textContent = `${info.actualPct.toFixed(1)}%`;
                    chestDistSvg.appendChild(textPct);
                });
            }
        }

        if (btnRunChestSim) {
            btnRunChestSim.addEventListener('click', renderChestSimulation);
        }

        // Render inicial nas abas
        renderFarmingTable();
        renderChestSimulation();

        // ==========================================
        // FASE 10 (RC): INTEGRAÇÃO MARKET PRICE
        // ==========================================
        function showToast(message, type = 'info') {
            const container = document.getElementById('toast-container');
            if (!container) return;
            const toast = document.createElement('div');
            toast.style.padding = '0.75rem 1.25rem';
            toast.style.borderRadius = '8px';
            toast.style.fontSize = '0.85rem';
            toast.style.color = '#fff';
            toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
            toast.style.transition = 'opacity 0.3s ease';
            toast.style.background = type === 'warning' ? '#f59e0b' : (type === 'error' ? '#ef4444' : '#10b981');
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        const btnOpenImportPrices = document.getElementById('btn-open-import-prices');
        const modalImportPrices = document.getElementById('modal-import-prices');
        const btnCloseImportModal = document.getElementById('btn-close-import-modal');
        const btnDoImportPrices = document.getElementById('btn-do-import-prices');
        const importPricesInput = document.getElementById('import-prices-input');
        const btnRefreshMarketPrices = document.getElementById('btn-refresh-market-prices');

        if (btnOpenImportPrices && modalImportPrices) {
            btnOpenImportPrices.addEventListener('click', () => {
                modalImportPrices.classList.remove('hidden');
            });
        }

        if (btnCloseImportModal && modalImportPrices) {
            btnCloseImportModal.addEventListener('click', () => {
                modalImportPrices.classList.add('hidden');
            });
        }

        if (btnDoImportPrices && importPricesInput && modalImportPrices) {
            btnDoImportPrices.addEventListener('click', () => {
                const text = importPricesInput.value.trim();
                if (!text) {
                    showToast('Insira dados válidos no campo de importação', 'warning');
                    return;
                }
                const isJson = text.startsWith('{') || text.startsWith('[');
                const res = marketPrice.importPrices(text, isJson ? 'json' : 'csv');
                showToast(`Preços importados: ${res.imported} itens (${res.skipped} ignorados)`, 'info');
                modalImportPrices.classList.add('hidden');
                importPricesInput.value = '';
                // Recalcular Stash Value com modo market
                if (window.__lastParsedSaveData) {
                    filterAndRenderStorage();
                }
            });
        }

        if (btnRefreshMarketPrices) {
            btnRefreshMarketPrices.addEventListener('click', () => {
                let staleCount = 0;
                for (const key of Object.keys(marketPrice.cache)) {
                    if (marketPrice.getMetadata(key).isStale) staleCount++;
                }
                if (staleCount > 0) {
                    showToast(`Atenção: ${staleCount} itens com cotação desatualizada (>7 dias)`, 'warning');
                } else {
                    showToast(`Cotações sincronizadas (${marketPrice.getCacheSize()} itens em cache)`, 'info');
                }
            });
        }

        // ==========================================
        // FASE 10 (RC): INTEGRAÇÃO CHEST OPTIMIZER
        // ==========================================
        const chestOptTbody = document.getElementById('chest-opt-tbody');
        const chestOptSuggestionCard = document.getElementById('chest-opt-suggestion-card');
        const chestOptSvg = document.getElementById('chest-opt-svg');
        const btnRunMonteCarlo = document.getElementById('btn-run-monte-carlo');
        const monteCarloResultsBox = document.getElementById('monte-carlo-results-box');
        const monteCarloSummaryText = document.getElementById('monte-carlo-summary-text');
        const monteCarloTbody = document.getElementById('monte-carlo-tbody');

        function renderChestOptimizer(playerData = {}) {
            if (!chestOptTbody) return;
            const suggestions = chestOptimizer.suggestBestChest(playerData);
            if (!suggestions || suggestions.length === 0) return;

            const best = suggestions[0];
            if (chestOptSuggestionCard && best) {
                chestOptSuggestionCard.innerHTML = `
                    ⭐ <strong>Melhor Baú Recomendado:</strong> ${best.name} |
                    <strong>EV Líquido:</strong> <span style="color: #4ade80;">+${best.netEV.toLocaleString('pt-BR')} G</span> |
                    <strong>Motivo:</strong> ${best.reason}
                `;
            }

            chestOptTbody.innerHTML = '';
            suggestions.forEach(item => {
                const tr = document.createElement('tr');
                const isViable = item.netEV > 0;
                const viableBadge = isViable
                    ? '<span class="badge" style="background: rgba(16,185,129,0.2); color:#4ade80;">Rentável</span>'
                    : '<span class="badge" style="background: rgba(239,68,68,0.2); color:#f87171;">Prejuízo</span>';

                tr.innerHTML = `
                    <td><strong>${item.name}</strong></td>
                    <td>${item.cost.toLocaleString('pt-BR')} G</td>
                    <td><strong style="color:#60a5fa;">+${item.ev.toLocaleString('pt-BR')} G</strong></td>
                    <td><strong style="color:${isViable ? '#4ade80' : '#f87171'};">${item.netEV > 0 ? '+' : ''}${item.netEV.toLocaleString('pt-BR')} G</strong></td>
                    <td>${viableBadge}</td>
                    <td style="font-size:0.8rem; color:var(--text-secondary);">${item.reason}</td>
                `;
                chestOptTbody.appendChild(tr);
            });

            // SVG Bar chart de EV Líquido
            if (chestOptSvg) {
                chestOptSvg.innerHTML = '';
                const W = 600, H = 160, PAD = 20;
                const top5 = suggestions.slice(0, 5);
                const maxEv = Math.max(1, ...top5.map(s => Math.max(0, s.netEV)));
                const barWidth = 80;
                const spacing = (W - PAD * 2) / top5.length;

                top5.forEach((item, idx) => {
                    const h = Math.max(4, (Math.max(0, item.netEV) / maxEv) * (H - PAD * 2 - 25));
                    const x = PAD + idx * spacing + (spacing - barWidth) / 2;
                    const y = H - PAD - h - 15;

                    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rect.setAttribute('x', x);
                    rect.setAttribute('y', y);
                    rect.setAttribute('width', barWidth);
                    rect.setAttribute('height', h);
                    rect.setAttribute('fill', item.netEV > 0 ? '#10b981' : '#ef4444');
                    rect.setAttribute('rx', '4');
                    chestOptSvg.appendChild(rect);

                    const textName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    textName.setAttribute('x', x + barWidth / 2);
                    textName.setAttribute('y', H - 5);
                    textName.setAttribute('text-anchor', 'middle');
                    textName.setAttribute('fill', '#94a3b8');
                    textName.setAttribute('font-size', '10');
                    textName.textContent = item.name.substring(0, 12);
                    chestOptSvg.appendChild(textName);

                    const textVal = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    textVal.setAttribute('x', x + barWidth / 2);
                    textVal.setAttribute('y', Math.max(12, y - 4));
                    textVal.setAttribute('text-anchor', 'middle');
                    textVal.setAttribute('fill', '#f1f5f9');
                    textVal.setAttribute('font-size', '10');
                    textVal.textContent = `${Math.round(item.netEV)} G`;
                    chestOptSvg.appendChild(textVal);
                });
            }
        }

        if (btnRunMonteCarlo) {
            btnRunMonteCarlo.addEventListener('click', () => {
                const res = chestOptimizer.simulateMonteCarlo('chest_stage_4309', 100);
                if (monteCarloResultsBox && monteCarloSummaryText && monteCarloTbody) {
                    monteCarloResultsBox.classList.remove('hidden');
                    monteCarloSummaryText.innerHTML = `
                        Simulação de 100 aberturas para <strong>${res.chestName}</strong>: Custo: <strong>${res.totalCost.toLocaleString('pt-BR')} G</strong> |
                        Retorno Bruto: <strong>${res.totalSimulatedGold.toLocaleString('pt-BR')} G</strong> |
                        Lucro Líquido: <strong style="color:${res.netGold >= 0 ? '#4ade80' : '#f87171'};">${res.netGold.toLocaleString('pt-BR')} G</strong>
                    `;
                    monteCarloTbody.innerHTML = '';
                    Object.entries(res.distribution).forEach(([itemName, qty]) => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td><strong>${itemName}</strong></td>
                            <td>${qty}</td>
                            <td>${qty}%</td>
                        `;
                        monteCarloTbody.appendChild(tr);
                    });
                }
            });
        }

        renderChestOptimizer(window.__lastParsedSaveData || {});
}


export function handleTimelineFiles() {}
