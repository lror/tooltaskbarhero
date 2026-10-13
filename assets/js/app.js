import { renderBuildTab } from './views/build_view.js';
// Imports de Views
import { renderHeroes, openHeroModal } from './views/hero_view.js';
import { filterAndRenderStorage, renderPetsTab, renderCubeOptimization } from './views/storage_view.js';
import { renderAggregatesPanel, setupPlayerTelemetryUI, renderStageTelemetry } from './views/telemetry_view.js';
import { renderDashboard, renderCombatAudit } from './views/dashboard_view.js';
import { renderStashValue, renderFarmProjections, updateBottleneckView } from './views/market_view.js';
import { initTimelineUI } from './views/timeline_view.js';

/**
 * TTBH - ToolTaskBarHero
 * Controlador Principal da Aplicação v2.5 - Edição 10 Tiers & Combat Stats
 */

import { CryptoEngine, DEFAULT_TBH_PASSWORD } from './crypto.js';
import { SaveParser, TIERS, parseStageLogs, getStageClearStats } from './save_parser.js';
import { StatisticsEngine } from './statistics_engine.js';
import { AiExporter, CombatAuditor } from './ai_exporter.js';
import { stashValueEngine } from './stash_value.js';
import { synthesisSimulator } from './synthesis_simulator.js';
import { bisFinder } from './bis_finder.js';
import { runePlanner } from './rune_planner.js';
import { backupTimeline } from './backup_timeline.js';
import { farmingCalculator } from './farming_calculator.js';
import { chestSimulator } from './chest_simulator.js';
import { marketPrice } from './market_price.js';
import { chestOptimizer } from './chest_optimizer.js';
import { PlayerTelemetry } from './player_telemetry.js';
import { TBH_DB } from './gamedata.js';

document.addEventListener('DOMContentLoaded', () => {
    // Instâncias dos motores
    const cryptoEngine = new CryptoEngine();
    const saveParser = new SaveParser();
    const statsEngine = new StatisticsEngine();

    // Elementos da UI - Upload & Cabeçalho
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnBrowse = document.getElementById('btn-browse');
    if (btnBrowse && fileInput) { btnBrowse.addEventListener('click', () => fileInput.click()); }
    const uploadError = document.getElementById('upload-error');
    const toggleAdvanced = document.getElementById('toggle-advanced');
    const advancedBox = document.getElementById('advanced-box');
    const customPasswordInput = document.getElementById('custom-password');
    const btnLoadDemo = document.getElementById('btn-load-demo');
    const btnResetSave = document.getElementById('btn-reset-save');
    const btnDownloadJson = document.getElementById('btn-download-json');
    const btnRecalcBottleneck = document.getElementById('btn-recalc-bottleneck');
    const inputClearTime = document.getElementById('input-clear-time');
    const btnParseStageLog = document.getElementById('btn-parse-stage-log');
    const inputStageLogs = document.getElementById('input-stage-logs');

    const uploadSection = document.getElementById('upload-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    // Botões e inputs da Steam Linux
    const btnLoadSteamDirect = document.getElementById('btn-load-steam-direct');
    const btnCopyPath = document.getElementById('btn-copy-path');
    const linuxSavePath = document.getElementById('linux-save-path');

    // Modal de Herói
    const heroModal = document.getElementById('hero-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const modalHeroIcon = document.getElementById('modal-hero-icon');
    const modalHeroName = document.getElementById('modal-hero-name');
    const modalHeroSubtitle = document.getElementById('modal-hero-subtitle');
    const modalHeroStats = document.getElementById('modal-hero-stats');
    const modalHeroSkills = document.getElementById('modal-hero-skills');
    const modalHeroTalents = document.getElementById('modal-hero-talents');
    const modalTalentsCountBadge = document.getElementById('modal-talents-count-badge');
    const modalHeroGear = document.getElementById('modal-hero-gear');

    // Storage / Inventário
    const storageSearch = document.getElementById('storage-search');
    const storageFilterType = document.getElementById('storage-filter-type');
    const storageFilteredCount = document.getElementById('storage-filtered-count');
    const storageTbody = document.getElementById('storage-tbody');

    // Pets
    const petSumExp = document.getElementById('pet-sum-exp');
    const petSumGold = document.getElementById('pet-sum-gold');
    const petSumNormalChest = document.getElementById('pet-sum-normal-chest');
    const petSumBossChest = document.getElementById('pet-sum-boss-chest');
    const petsContainer = document.getElementById('pets-container');

    // AI Markdown
    const btnCopyAiMd = document.getElementById('btn-copy-ai-md');
    const btnDownloadAiMd = document.getElementById('btn-download-ai-md');
    const aiMarkdownContent = document.getElementById('ai-markdown-content');

    // Tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    let currentParsedData = null;
    let currentRawDecrypted = null;
    let allCurrentStorageItems = [];

    // --- Drag and Drop Handlers ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            await handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length) {
            await handleFiles(e.target.files);
        }
    });

    // Toggle advanced settings
    toggleAdvanced.addEventListener('click', () => {
        advancedBox.classList.toggle('hidden');
    });

    // Reset save button
    btnResetSave.addEventListener('click', () => {
        dashboardSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        btnResetSave.classList.add('hidden');
        statusDot.classList.remove('active');
        statusText.textContent = "Nenhum save conectado";
    });

    // Demo Mode Button
    btnLoadDemo.addEventListener('click', () => {
        loadDemoData();
    });

    // Tab Navigation
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.add('hidden'));

            btn.classList.add('active');
            const targetId = `tab-${btn.dataset.tab}`;
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
        });
    });

    // Recalculate Bottleneck
    btnRecalcBottleneck.addEventListener('click', () => {
        const seconds = parseFloat(inputClearTime.value) || 48;
        updateBottleneckView(seconds);
    });

    // Processar Logs de Estágio do Jogo (Player.log / [Estágio X-Y concluido. (Xs)])
    let currentStageLogs = "";
    if (btnParseStageLog && inputStageLogs) {
        btnParseStageLog.addEventListener('click', () => {
            const raw = inputStageLogs.value.trim();
            if (!raw) return;
            currentStageLogs = raw;
            if (currentParsedData && currentParsedData.account) {
                const targetStage = currentParsedData.account.currentStageInfo?.label || "3-9";
                const records = parseStageLogs(raw, targetStage);
                const stats = getStageClearStats(records, targetStage);
                currentParsedData.account.stageClearStats = stats;
                renderStageTelemetry(currentParsedData.account);

                // Atualiza o relatório de IA Markdown em tempo real com os novos tempos
                const updatedMd = AiExporter.generateMarkdown(currentParsedData, raw);
                if (aiMarkdownContent) {
                    aiMarkdownContent.value = updatedMd;
                }
            }
        });
    }

    // Download Decrypted JSON
    btnDownloadJson.addEventListener('click', () => {
        if (!currentRawDecrypted) return;
        const blob = new Blob([JSON.stringify(currentRawDecrypted, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "SaveFile_Live_Decrypted.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Botão de cópia rápida do caminho da Steam
    if (btnCopyPath && linuxSavePath) {
        btnCopyPath.addEventListener('click', () => {
            const pathText = linuxSavePath.textContent.trim();
            navigator.clipboard.writeText(pathText).then(() => {
                const origText = btnCopyPath.textContent;
                btnCopyPath.textContent = "✅ Copiado!";
                setTimeout(() => { btnCopyPath.textContent = origText; }, 2000);
            }).catch(() => {
                alert("Caminho:\n" + pathText);
            });
        });
    }

    // Carregamento direto da Steam no Linux
    if (btnLoadSteamDirect) {
        btnLoadSteamDirect.addEventListener('click', async () => {
            showError("");
            statusText.textContent = "Carregando save da Steam...";
            try {
                const response = await fetch('/steam_save/SaveFile_Live.es3?t=' + Date.now());
                if (!response.ok) {
                    throw new Error(`Não foi possível acessar /steam_save/SaveFile_Live.es3 (HTTP ${response.status})`);
                }
                const buffer = await response.arrayBuffer();
                await processBuffer(buffer, "SaveFile_Live.es3 (Steam Linux)");
            } catch (err) {
                console.error(err);
                showError("Não foi possível carregar o save automaticamente da Steam: " + err.message + ". Por favor, arraste o arquivo ou use o botão de procurar arquivo.");
                statusText.textContent = "Erro na leitura";
            }
        });
    }

    // --- Modal Handlers ---
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            heroModal.classList.add('hidden');
        });
    }

    heroModal.addEventListener('click', (e) => {
        if (e.target === heroModal) {
            heroModal.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !heroModal.classList.contains('hidden')) {
            heroModal.classList.add('hidden');
        }
    });

    // --- Storage Filter Handlers ---
    if (storageSearch) {
        storageSearch.addEventListener('input', () => {
            filterAndRenderStorage();
        });
    }
    if (storageFilterType) {
        storageFilterType.addEventListener('change', () => {
            filterAndRenderStorage();
        });
    }

    // --- AI Markdown Exporter Handlers ---
    if (btnCopyAiMd && aiMarkdownContent) {
        btnCopyAiMd.addEventListener('click', () => {
            const text = aiMarkdownContent.value;
            navigator.clipboard.writeText(text).then(() => {
                const origText = btnCopyAiMd.innerHTML;
                btnCopyAiMd.innerHTML = "✅ Copiado com Sucesso!";
                setTimeout(() => { btnCopyAiMd.innerHTML = origText; }, 2000);
            }).catch(err => {
                aiMarkdownContent.select();
                document.execCommand('copy');
                alert("Texto selecionado e copiado!");
            });
        });
    }

    if (btnDownloadAiMd && aiMarkdownContent) {
        btnDownloadAiMd.addEventListener('click', () => {
            const text = aiMarkdownContent.value;
            const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "TBH_AI_Telemetry_Prompt.md";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // --- Leitura e Upload Unificado de Arquivos ---
    async function handleFiles(fileList) {
        showError("");
        const files = Array.from(fileList);
        if (files.length === 0) return;

        // Se houver mais de 1 arquivo ou se o arquivo for .log/.dat e o UploadManager existir:
        if (window.TTBH_UploadManager && (files.length > 1 || !files[0].name.endsWith('.es3'))) {
            statusText.textContent = `Processando ${files.length} arquivo(s)...`;
            try {
                const results = await window.TTBH_UploadManager.processFiles(files);
                if (results.saves.length > 0) {
                    const firstSave = results.saves[0];
                    currentParsedData = firstSave.parsedData;
                    window.__lastParsedSaveData = firstSave.parsedData;
                    renderDashboard(firstSave.parsedData);
                    renderBuildTab(firstSave.parsedData);

                    statusDot.classList.add('active');
                    statusText.textContent = `${firstSave.fileName} Conectado (+${files.length - 1} anexos)`;
                    btnResetSave.classList.remove('hidden');
                    uploadSection.classList.add('hidden');
                    dashboardSection.classList.remove('hidden');
                } else if (results.logs.length > 0) {
                    statusText.textContent = `${results.logs.length} Log(s) Processado(s)`;
                }
            } catch (err) {
                console.error(err);
                showError("Erro no processamento em lote: " + err.message);
            }
            return;
        }

        // Fallback rápido para save único (.es3)
        handleFile(files[0]);
    }

    function handleFile(file) {
        showError("");
        const reader = new FileReader();
        reader.onload = async (e) => {
            await processBuffer(e.target.result, file.name);
        };
        reader.onerror = () => {
            showError("Erro ao ler o arquivo no navegador.");
        };
        reader.readAsArrayBuffer(file);
    }

    async function processBuffer(buffer, fileName) {
        showError("");
        const customPassword = customPasswordInput.value.trim();
        cryptoEngine.setPassword(customPassword || DEFAULT_TBH_PASSWORD);

        try {
            statusText.textContent = "Descriptografando...";
            const decryptedSave = await cryptoEngine.decryptBuffer(buffer);
            currentRawDecrypted = decryptedSave;

            const parsedData = saveParser.parse(decryptedSave);
            currentParsedData = parsedData;
            window.__lastParsedSaveData = parsedData;

            renderDashboard(parsedData);
            renderBuildTab(parsedData);

            statusDot.classList.add('active');
            statusText.textContent = `${fileName} Conectado`;
            btnResetSave.classList.remove('hidden');

            uploadSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
        } catch (err) {
            console.error(err);
            showError("Erro ao processar save: " + err.message);
            statusText.textContent = "Erro na leitura";
        }
    }

    function showError(msg, rawText = "") {
        if (!msg) {
            uploadError.innerHTML = "";
            uploadError.classList.add('hidden');
        } else {
            uploadError.classList.remove('hidden');

            const hasExcerpt = msg.includes("TRECHO:");
            let baseMsg = msg;
            let excerpt = "";
            if (hasExcerpt) {
                const parts = msg.split(" | TRECHO: ");
                baseMsg = parts[0];
                excerpt = parts[1] || "";
            }

            const posMatch = /position (\d+)/i.exec(msg);
            const pos = posMatch ? posMatch[1] : "N/A";

            let html = `
                <div style="font-weight: 600; margin-bottom: 0.4rem; color: #f87171;">
                    ${baseMsg}
                </div>
            `;

            if (excerpt || hasExcerpt) {
                html += `
                    <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; font-size: 0.75rem; border: 1px solid rgba(239, 68, 68, 0.4);">
                            Estratégia: exotics (falha terminal)
                        </span>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">Posição: ${pos}</span>
                        <button id="btn-copy-error-report" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.2rem 0.6rem; cursor: pointer;">
                            📋 Copiar relatório
                        </button>
                    </div>
                    <details style="margin-top: 0.6rem; text-align: left; background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 6px; border: 1px solid var(--card-border);">
                        <summary style="cursor: pointer; font-size: 0.8rem; color: var(--accent-primary);">Ver detalhe técnico do trecho JSON</summary>
                        <pre id="error-excerpt-pre" style="margin-top: 0.4rem; font-family: monospace; font-size: 0.75rem; color: #fef08a; white-space: pre-wrap; word-break: break-all; background: rgba(0,0,0,0.4); padding: 0.4rem; border-radius: 4px;">${excerpt}</pre>
                    </details>
                `;
            }

            uploadError.innerHTML = html;

            const btnCopy = document.getElementById('btn-copy-error-report');
            if (btnCopy) {
                btnCopy.addEventListener('click', () => {
                    const first4Lines = (rawText || "").split(/\r?\n/).slice(0, 4).join("\n");
                    const schemaVer = window.__lastDetectedSchemaVersion || currentParsedData?.meta?.schemaVersion || "desconhecido";
                    const clientBld = window.__lastDetectedClientBuild || "desconhecido";
                    const report = `[TTBH ERROR REPORT]\nSchema Version: ${schemaVer}\nClient Build: ${clientBld}\nPosição: ${pos}\nMensagem: ${baseMsg}\nTrecho: ${excerpt}\nPrimeiras 4 linhas:\n${first4Lines}`;
                    navigator.clipboard.writeText(report).then(() => {
                        btnCopy.textContent = "✅ Copiado!";
                        setTimeout(() => { btnCopy.textContent = "📋 Copiar relatório"; }, 2000);
                    }).catch(() => {
                        btnCopy.textContent = "Falha ao copiar";
                    });
                });
            }
        }
    }

    // --- Renderização do Dashboard ---
    

    // --- Painel de Atividade Acumulada ---
    function renderAggregates(aggregatesData) {
        renderAggregatesPanel(aggregatesData);
    }

    

    // --- Renderizador do Stash Value (Avaliação de Mercado) ---
    

    // --- Auditoria de Combate & Diagnósticos IA (Visual) ---
    

    // --- Roster de Heróis & Modal de Inspeção ---
    

    

    // --- Pets Tab & Soma Global de Buffs ---
    

    // --- Storage Tab (Inventário & Mochila) ---
    

    // --- Otimizador do Cubo ---
    

    window.__initSynthesisSimulatorUI = initSynthesisSimulatorUI;
    function initSynthesisSimulatorUI() {
        const btnRun = document.getElementById('btn-run-synthesis-sim');
        const inputCount = document.getElementById('sim-input-count');
        const selectFrom = document.getElementById('sim-select-from');
        const selectTo = document.getElementById('sim-select-to');
        const tbody = document.getElementById('sim-result-tbody');

        if (!btnRun || btnRun._hasInitListener) return;
        btnRun._hasInitListener = true;

        btnRun.addEventListener('click', () => {
            if (!tbody) return;
            const count = Number(inputCount?.value) || 10;
            const fromG = selectFrom?.value || 'COMMON';
            const toG = selectTo?.value || 'UNCOMMON';

            const sim = synthesisSimulator.create(currentParsedData || {}, window.TBH_DB || {});
            const res = sim.projectCost(count, fromG, toG);

            const xpFormatted = res.expectedXp.toLocaleString('pt-BR');
            const goldFormatted = (res.expectedGold >= 0 ? '+' : '') + res.expectedGold.toLocaleString('pt-BR') + ' G';
            const goldColor = res.expectedGold >= 0 ? '#4ade80' : '#f87171';
            const successPct = `${Math.round(res.successRate * 100)}%`;
            const evColor = res.ev >= 0 ? '#4ade80' : '#f87171';

            const warningHtml = !res.economicViability.isViable
                ? `<div style="margin-top:0.5rem; padding:0.4rem 0.6rem; border-radius:4px; background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#fca5a5; font-size:0.75rem;">
                    ⚠️ ${res.economicViability.warning}
                   </div>`
                : '';

            tbody.innerHTML = `
                <tr>
                    <td><strong>${res.inputGrade} ➔ ${res.outputGrade}</strong></td>
                    <td><strong>${res.outputCount}</strong></td>
                    <td><span style="color: #60a5fa;">+${xpFormatted} XP</span></td>
                    <td><strong style="color: ${goldColor};">${goldFormatted}</strong></td>
                    <td><span style="color: #38bdf8;">${successPct}</span></td>
                    <td><strong style="color: ${evColor};">${res.ev > 0 ? '+' : ''}${res.ev}</strong></td>
                </tr>
                ${warningHtml ? `<tr><td colspan="6" style="padding:0.4rem 0.75rem;">${warningHtml}</td></tr>` : ''}
            `;
        });
    }

    // --- Telemetria de Estágio & Tempos de Conclusão ---
    

    // --- Eficiência de Farm ---
    

    

    // --- Modo Demonstração Completo ---
    function loadDemoData() {
        const demoEquippedKnight = [
            { slotIndex: 0, slotName: "Arma Principal", isEmpty: false, name: "Espada Celestial Soberana", grade: "CELESTIAL", tier: 8, level: 90, enchantsCount: 3, detailedModifiers: [{ category: "Decoração", recipeType: 3, tier: 8, tierInfo: TIERS[8], statName: "Dano Físico %", formattedVal: "+150.0%" }, { category: "Gravação", recipeType: 4, tier: 8, tierInfo: TIERS[8], statName: "Chance Crítica", formattedVal: "+14.5%" }], decorations: 5, inscriptions: 3, engravings: 2, cubeAction: "SÍNTESE", cubeReason: "Lv.90 na margem segura do Cubo Lv.100" },
            { slotIndex: 1, slotName: "Arma Secundária", isEmpty: false, name: "Escudo do Baluarte Sagrado", grade: "DIVINE", tier: 9, level: 90, enchantsCount: 2, detailedModifiers: [{ category: "Decoração", recipeType: 3, tier: 9, tierInfo: TIERS[9], statName: "Armadura", formattedVal: "+480" }], decorations: 4, inscriptions: 2, engravings: 1, cubeAction: "SÍNTESE" },
            { slotIndex: 2, slotName: "Capacete", isEmpty: false, name: "Elmo do Titã Imortal", grade: "IMMORTAL", tier: 5, level: 85, enchantsCount: 2, detailedModifiers: [{ category: "Decoração", recipeType: 3, tier: 5, tierInfo: TIERS[5], statName: "Vida Máxima (HP)", formattedVal: "+1800" }], decorations: 3, inscriptions: 1, engravings: 0, cubeAction: "SÍNTESE" },
            { slotIndex: 3, slotName: "Armadura", isEmpty: false, name: "Peitoral das Chamas Eternas", grade: "ARCANA", tier: 6, level: 90, enchantsCount: 3, detailedModifiers: [{ category: "Decoração", recipeType: 3, tier: 6, tierInfo: TIERS[6], statName: "Vida Máxima (HP)", formattedVal: "+2400" }], decorations: 5, inscriptions: 4, engravings: 2, cubeAction: "SÍNTESE" },
            { slotIndex: 4, slotName: "Luvas", isEmpty: false, name: "Manoplas da Fúria Divina", grade: "DIVINE", tier: 9, level: 90, enchantsCount: 2, detailedModifiers: [{ category: "Decoração", recipeType: 3, tier: 9, tierInfo: TIERS[9], statName: "Velocidade de Ataque", formattedVal: "+18.0%" }], decorations: 2, inscriptions: 1, engravings: 0, cubeAction: "SÍNTESE" },
            { slotIndex: 5, slotName: "Botas", isEmpty: false, name: "Passos Cósmicos", grade: "COSMIC", tier: 10, level: 90, enchantsCount: 2, detailedModifiers: [{ category: "Inscrição", recipeType: 5, tier: 10, tierInfo: TIERS[10], statName: "Velocidade de Movimento", formattedVal: "+150" }], decorations: 1, inscriptions: 1, engravings: 0, cubeAction: "SÍNTESE" },
            { slotIndex: 6, slotName: "Amuleto / Colar", isEmpty: false, name: "Coração do Dragão Ancestral", grade: "CELESTIAL", tier: 8, level: 90, enchantsCount: 3, detailedModifiers: [{ category: "Gravação", recipeType: 4, tier: 8, tierInfo: TIERS[8], statName: "Dano Crítico", formattedVal: "+45.0%" }], decorations: 5, inscriptions: 5, engravings: 3, cubeAction: "SÍNTESE" },
            { slotIndex: 7, slotName: "Brinco", isEmpty: false, name: "Brinco do Vórtice Celestial", grade: "BEYOND", tier: 7, level: 85, enchantsCount: 2, detailedModifiers: [{ category: "Decoração", recipeType: 3, tier: 7, tierInfo: TIERS[7], statName: "Chance Crítica", formattedVal: "+12.0%" }], decorations: 3, inscriptions: 2, engravings: 1, cubeAction: "SÍNTESE" },
            { slotIndex: 8, slotName: "Anel", isEmpty: false, name: "Selo do Rei Supremo", grade: "IMMORTAL", tier: 5, level: 85, enchantsCount: 3, detailedModifiers: [{ category: "Inscrição", recipeType: 5, tier: 5, tierInfo: TIERS[5], statName: "Ouro Extra", formattedVal: "+25.0%" }], decorations: 4, inscriptions: 3, engravings: 2, cubeAction: "SÍNTESE" },
            { slotIndex: 9, slotName: "Braçadeira", isEmpty: false, name: "Emblema do Guardião Épico", grade: "LEGENDARY", tier: 4, level: 80, enchantsCount: 2, detailedModifiers: [{ category: "Inscrição", recipeType: 5, tier: 4, tierInfo: TIERS[4], statName: "EXP Extra", formattedVal: "+15.0%" }], decorations: 2, inscriptions: 1, engravings: 0, cubeAction: "ALQUIMIA" }
        ];

        const demoTalentsKnight = [
            { name: "Golpe Básico do Cavaleiro", type: "ACTIVESKILL", isEquipped: true, level: 5, maxLevel: 5, description: "Ativa: Dano Físico • CD 0s • Melee" },
            { name: "Investida com Escudo", type: "ACTIVESKILL", isEquipped: true, level: 5, maxLevel: 5, description: "Ativa: Dano Físico • CD 6s • Dash / Atordoamento" },
            { name: "Barreira Sagrada", type: "ACTIVESKILL", isEquipped: true, level: 5, maxLevel: 5, description: "Ativa: Buff Divino • CD 15s • +30% Defesa" },
            { name: "Talento Passivo: Dano de Ataque", type: "PASSIVESKILL", isEquipped: false, level: 10, maxLevel: 10, description: "Buffer Permanente: +20 Dano de Ataque" },
            { name: "Talento Passivo: Vida Máxima", type: "PASSIVESKILL", isEquipped: false, level: 8, maxLevel: 8, description: "Buffer Permanente: +1200 HP Máximo" },
            { name: "Talento Passivo: Dano Físico %", type: "PASSIVESKILL", isEquipped: false, level: 10, maxLevel: 10, description: "Buffer Permanente: +150% Dano Físico" },
            { name: "Talento Passivo: Velocidade de Ataque", type: "PASSIVESKILL", isEquipped: false, level: 10, maxLevel: 10, description: "Buffer Permanente: +40% Velocidade de Ataque" },
            { name: "Talento Passivo: Redução de Dano", type: "PASSIVESKILL", isEquipped: false, level: 10, maxLevel: 10, description: "Buffer Permanente: +20% Redução de Dano" }
        ];

        const demoTalentsRanger = [
            { name: "Disparo Básico do Explorador", type: "ACTIVESKILL", isEquipped: true, level: 5, maxLevel: 5, description: "Ativa: Dano Físico • CD 0s • Ranged" },
            { name: "Flecha Explosiva", type: "ACTIVESKILL", isEquipped: true, level: 5, maxLevel: 5, description: "Ativa: Dano Físico • CD 13s • Projectile AoE" },
            { name: "Disparo Rápido", type: "ACTIVESKILL", isEquipped: true, level: 5, maxLevel: 5, description: "Ativa: Dano Físico • CD 8s • 5 Flechas Rápidas" },
            { name: "Talento Passivo: Dano de Ataque", type: "PASSIVESKILL", isEquipped: false, level: 3, maxLevel: 3, description: "Buffer Permanente: +3 Dano de Ataque" },
            { name: "Talento Passivo: Velocidade de Ataque", type: "PASSIVESKILL", isEquipped: false, level: 8, maxLevel: 8, description: "Buffer Permanente: +32% Velocidade de Ataque" },
            { name: "Talento Passivo: Chance Crítica", type: "PASSIVESKILL", isEquipped: false, level: 8, maxLevel: 8, description: "Buffer Permanente: +16.0% Chance Crítica" },
            { name: "Talento Passivo: Dano Crítico", type: "PASSIVESKILL", isEquipped: false, level: 3, maxLevel: 3, description: "Buffer Permanente: +39.0% Dano Crítico" },
            { name: "Talento Passivo: Dano de Projétil", type: "PASSIVESKILL", isEquipped: false, level: 10, maxLevel: 10, description: "Buffer Permanente: +150% Dano de Projétil" }
        ];

        const demoHeroKnight = {
            heroKey: 101,
            name: "Cavaleiro",
            cls: "Knight",
            role: "Tanque / Defesa",
            icon: "🛡️",
            level: 101,
            isUnlocked: true,
            inParty: true,
            equippedCount: 10,
            allocatedAP: 85,
            abilityPoints: 16,
            baseStats: { attackDamage: 4120, attackSpeed: 1.25, critChance: 32.5, critDamage: 240, maxHp: 42500, armor: 650, moveSpeed: 950 },
            statBreakdowns: { baseAttack: 2, gearAttack: 2450, passiveAttack: 20, percentMultiplier: 68 },
            equippedSkills: [
                { skillKey: 10001, name: "Golpe Básico do Cavaleiro", dmgType: "Físico", delivery: "Melee", cooldown: 0 },
                { skillKey: 10101, name: "Investida com Escudo", dmgType: "Físico", delivery: "Dash", cooldown: 6 },
                { skillKey: 10301, name: "Barreira Sagrada", dmgType: "Sagrado", delivery: "Buff", cooldown: 15 }
            ],
            heroTalents: demoTalentsKnight,
            equippedSlots: demoEquippedKnight
        };

        const demoHeroRanger = {
            heroKey: 201,
            name: "Explorador",
            cls: "Ranger",
            role: "Dano à Distância",
            icon: "🏹",
            level: 101,
            isUnlocked: true,
            inParty: true,
            equippedCount: 10,
            allocatedAP: 80,
            abilityPoints: 21,
            baseStats: { attackDamage: 3666, attackSpeed: 1.85, critChance: 48.5, critDamage: 275, maxHp: 19500, armor: 180, moveSpeed: 1050 },
            statBreakdowns: { baseAttack: 1, gearAttack: 2150, passiveAttack: 3, percentMultiplier: 70 },
            equippedSkills: [
                { skillKey: 20001, name: "Disparo Básico do Explorador", dmgType: "Físico", delivery: "Ranged", cooldown: 0 },
                { skillKey: 20501, name: "Flecha Explosiva", dmgType: "Físico", delivery: "Projectile", cooldown: 13 },
                { skillKey: 20601, name: "Disparo Rápido", dmgType: "Físico", delivery: "Rapid", cooldown: 8 }
            ],
            heroTalents: demoTalentsRanger,
            equippedSlots: demoEquippedKnight
        };

        const demoHeroes = [
            demoHeroKnight,
            demoHeroRanger,
            { heroKey: 301, name: "Feiticeiro", cls: "Sorcerer", role: "Dano Elemental AoE", icon: "🔮", level: 101, isUnlocked: true, inParty: true, equippedCount: 10, allocatedAP: 80, baseStats: { attackDamage: 4350, attackSpeed: 1.15, critChance: 38.0, critDamage: 260, maxHp: 16500, armor: 130, moveSpeed: 900 }, statBreakdowns: { baseAttack: 2, gearAttack: 2600, passiveAttack: 26, percentMultiplier: 65 }, equippedSkills: [{ skillKey: 30201, name: "Tempestade de Meteoros", dmgType: "Fogo", delivery: "AoE", cooldown: 18 }], heroTalents: demoTalentsKnight, equippedSlots: demoEquippedKnight },
            { heroKey: 401, name: "Sacerdote", cls: "Priest", role: "Suporte / Cura", icon: "✨", level: 85, isUnlocked: true, inParty: false, equippedCount: 8, allocatedAP: 60, baseStats: { attackDamage: 1250, attackSpeed: 1.0, critChance: 18.0, critDamage: 160, maxHp: 24000, armor: 210, moveSpeed: 900 }, statBreakdowns: { baseAttack: 1, gearAttack: 850, passiveAttack: 6, percentMultiplier: 45 }, equippedSkills: [{ skillKey: 40101, name: "Cura em Grupo", dmgType: "Sagrado", delivery: "Buff", cooldown: 12 }], heroTalents: demoTalentsKnight, equippedSlots: demoEquippedKnight },
            { heroKey: 501, name: "Caçador", cls: "Hunter", role: "Armadilhas / Controle", icon: "🎯", level: 1, isUnlocked: false, inParty: false, equippedCount: 0, allocatedAP: 0, baseStats: { attackDamage: 10, attackSpeed: 1.0, critChance: 5.0, critDamage: 140, maxHp: 250, armor: 10, moveSpeed: 900 }, statBreakdowns: { baseAttack: 1, gearAttack: 0, passiveAttack: 0, percentMultiplier: 0 }, equippedSkills: [], heroTalents: [], equippedSlots: [] },
            { heroKey: 601, name: "Matador", cls: "Slayer", role: "Dano Físico Brutal", icon: "⚔️", level: 1, isUnlocked: false, inParty: false, equippedCount: 0, allocatedAP: 0, baseStats: { attackDamage: 12, attackSpeed: 1.0, critChance: 5.0, critDamage: 140, maxHp: 300, armor: 12, moveSpeed: 920 }, statBreakdowns: { baseAttack: 2, gearAttack: 0, passiveAttack: 0, percentMultiplier: 0 }, equippedSkills: [], heroTalents: [], equippedSlots: [] }
        ];

        const demoPets = {
            all: [
                { petKey: 1001, name: "Morcego (Bat)", icon: "🦇", desc: "EXP de monstros e chance de baú normal", isUnlocked: true, isActive: true, buffs: ["+15% EXP", "+10% Baús Normais"] },
                { petKey: 1002, name: "Vigia (Watcher)", icon: "👁️", desc: "Ouro adicional em combate", isUnlocked: true, isActive: false, buffs: ["+15% Ouro"] },
                { petKey: 1003, name: "Esqueleto Ardente", icon: "💀", desc: "Chance de baú de chefe de fase", isUnlocked: true, isActive: false, buffs: ["+10% Baús de Chefes"] },
                { petKey: 1004, name: "Golem Azul", icon: "🗿", desc: "Aumento de baús normais", isUnlocked: true, isActive: false, buffs: ["+12% Baús Normais"] },
                { petKey: 1005, name: "Espírito Sombrio", icon: "👻", desc: "Aumento de baús de chefes", isUnlocked: false, isActive: false, buffs: ["+15% Baús de Chefes"] },
                { petKey: 6001, name: "Espada (DLC)", icon: "⚔️", desc: "Bônus de EXP global", isUnlocked: true, isActive: false, buffs: ["+20% EXP"] },
                { petKey: 6002, name: "Borboleta (DLC)", icon: "🦋", desc: "Bônus de Ouro global", isUnlocked: true, isActive: false, buffs: ["+25% Ouro"] },
                { petKey: 6003, name: "Dragão (DLC)", icon: "🐲", desc: "Super bônus de Ouro, EXP e Baús", isUnlocked: true, isActive: false, buffs: ["+30% Ouro", "+30% EXP", "+20% Baús"] }
            ],
            totalBuffs: {
                expPercent: 65.0,
                goldPercent: 70.0,
                normalChestPercent: 42.0,
                bossChestPercent: 30.0
            }
        };
        demoPets.activePet = demoPets.all[0];

        const demoStorageItems = [
            { location: "Inventário", uniqueId: "1", itemKey: 315193, name: "Arco Arcana Supremo", level: 90, grade: "ARCANA", tier: 6, type: "Arco", detailedModifiers: [{ category: "Decoração", tier: 6, statName: "Dano Físico %", formattedVal: "+40.0%" }, { category: "Gravação", tier: 6, statName: "Dano Físico %", formattedVal: "+66.0%" }], decorations: 2, inscriptions: 1, cubeAction: "SÍNTESE", cubeReason: "Lv.90 dentro da margem do Cubo Lv.100" },
            { location: "Inventário", uniqueId: "2", itemKey: 415091, name: "Aljava Arcana Celestial", level: 40, grade: "ARCANA", tier: 6, type: "Aljava", detailedModifiers: [{ category: "Decoração", tier: 8, statName: "Dano Físico %", formattedVal: "+122.0%" }], decorations: 4, inscriptions: 1, cubeAction: "ALQUIMIA", cubeReason: "Lv.40 fora da margem segura do Cubo" },
            { location: "Inventário", uniqueId: "3", itemKey: 505171, name: "Capacete Arcana Heroico", level: 80, grade: "ARCANA", tier: 6, type: "Capacete", detailedModifiers: [{ category: "Decoração", tier: 6, statName: "Redução de Recarga", formattedVal: "+9.1%" }], decorations: 2, inscriptions: 1, cubeAction: "ALQUIMIA", cubeReason: "Lv.80 fora da margem segura do Cubo" },
            { location: "Inventário", uniqueId: "4", itemKey: 515171, name: "Armadura Arcana do Guardião", level: 80, grade: "ARCANA", tier: 6, type: "Armadura", detailedModifiers: [{ category: "Decoração", tier: 6, statName: "Redução de Recarga", formattedVal: "+8.9%" }], decorations: 2, inscriptions: 1, cubeAction: "ALQUIMIA", cubeReason: "Lv.80 fora da margem segura do Cubo" },
            { location: "Mochila", uniqueId: "5", itemKey: 525171, name: "Luvas Arcanas da Agilidade", level: 80, grade: "ARCANA", tier: 6, type: "Luvas", detailedModifiers: [{ category: "Inscrição", tier: 1, statName: "Dano de Ataque", formattedVal: "+1" }], decorations: 2, inscriptions: 1, cubeAction: "ALQUIMIA", cubeReason: "Lv.80 fora da margem segura do Cubo" },
            { location: "Mochila", uniqueId: "6", itemKey: 535193, name: "Passos da Tempestade Cósmica", level: 90, grade: "ARCANA", tier: 6, type: "Botas", detailedModifiers: [{ category: "Inscrição", tier: 3, statName: "Aumentar Dano Invocação", formattedVal: "+30.8%" }], decorations: 0, inscriptions: 1, cubeAction: "SÍNTESE", cubeReason: "Lv.90 dentro da margem do Cubo Lv.100" },
            { location: "Mochila", uniqueId: "7", itemKey: 604193, name: "Selo do Berserker Imortal", level: 90, grade: "IMMORTAL", tier: 5, type: "Anel 1", detailedModifiers: [{ category: "Decoração", tier: 4, statName: "Velocidade de Ataque", formattedVal: "+8.4%" }], decorations: 2, inscriptions: 0, cubeAction: "SÍNTESE", cubeReason: "Lv.90 dentro da margem do Cubo Lv.100" },
            { location: "Mochila", uniqueId: "8", itemKey: 614171, name: "Brinco Imortal do Predador", level: 80, grade: "IMMORTAL", tier: 5, type: "Brinco", detailedModifiers: [{ category: "Decoração", tier: 6, statName: "Chance Crítica", formattedVal: "+36.6%" }], decorations: 2, inscriptions: 0, cubeAction: "ALQUIMIA", cubeReason: "Lv.80 fora da margem segura do Cubo" }
        ];

        const normalized = {
            account: {
                version: "1.2.2",
                playTimeFormatted: "56d 15h",
                playTimeSeconds: 4892567,
                currentStageKey: 4309,
                currentStageFormatted: "Ato 4 (309)",
                maxStageFormatted: "Ato 4 (310)"
            },
            currencies: {
                gold: 49401243,
                goldFormatted: "49.4M"
            },
            cube: {
                level: 100,
                exp: 1000000000,
                penaltyMargin: 10
            },
            pets: demoPets,
            activePet: demoPets.activePet,
            heroes: demoHeroes,
            inventory: demoStorageItems.filter(i => i.location === "Inventário"),
            stash: demoStorageItems.filter(i => i.location === "Mochila"),
            allStorageItems: demoStorageItems,
            aggregates: [
                { Type: 0, SubKey: 30011, Value: 1046073 },
                { Type: 0, SubKey: 30041, Value: 914559 },
                { Type: 0, SubKey: 30021, Value: 858732 },
                { Type: 1, SubKey: 0, Value: 342 },
                { Type: 2, SubKey: 0, Value: 1824000000 },
                { Type: 16, SubKey: 0, Value: 12540 },
                { Type: 3, SubKey: 0, Value: 14200 },
                { Type: 4, SubKey: 0, Value: 85400 },
                { Type: 13, SubKey: 0, Value: 4309 },
                { Type: 14, SubKey: 0, Value: 85 },
                { Type: 17, SubKey: 30903, Value: 455 },
                { Type: 5, SubKey: 0, Value: 2291 },
                { Type: 15, SubKey: 0, Value: 81542 }
            ],
            raw: { demo: true, message: "Save de Demonstração Interativo com 10 Tiers e Cores Oficiais" }
        };

        currentRawDecrypted = { PlayerSaveData: { value: JSON.stringify(normalized) } };
        currentParsedData = normalized;

        renderDashboard(normalized);
        renderBuildTab(normalized);

        statusDot.classList.add('active');
        statusText.textContent = "Modo Demonstração Ativo";
        btnResetSave.classList.remove('hidden');

        uploadSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
    }

    // --- Renderizador do BiS Finder ---
    window.__renderBiSFinder = renderBiSFinder;
    function renderBiSFinder(data) {
        const selectHero = document.getElementById('bis-select-hero');
        const tbody = document.getElementById('bis-tbody');
        const btnSaveLocal = document.getElementById('btn-apply-bis-local');
        if (!tbody) return;

        const finder = bisFinder.create(data, window.TBH_DB || {});

        const renderTableForSelectedHero = () => {
            const heroId = selectHero?.value || '101';
            const suggestions = finder.suggestForHero(heroId);
            tbody.innerHTML = '';

            Object.values(suggestions).forEach(s => {
                const tr = document.createElement('tr');
                const cur = s.currentItem;
                const best = s.bestItem;

                const curText = cur
                    ? `<strong>${cur.name || 'Item'}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(Lv.${cur.level})</span>`
                    : '<span style="color:var(--text-muted);">— Vazio —</span>';

                const bestText = best
                    ? `<strong style="color:var(--text-primary);">${best.name || 'Item'}</strong> <span class="item-grade-tag badge-tier-${best.tier || 1}">${best.grade || 'COMMON'}</span> <span style="font-size:0.75rem; color:var(--text-muted);">(Lv.${best.level})</span>`
                    : '<span style="color:var(--text-muted);">—</span>';

                const scoreColor = s.upgradeValue > 0 ? '#4ade80' : 'var(--text-muted)';
                const deltaText = s.upgradeValue > 0 ? `+${s.upgradeValue}` : '—';
                const reasonColor = s.upgradeValue > 0 ? '#60a5fa' : 'var(--text-secondary)';

                tr.innerHTML = `
                    <td><strong>${s.slotName}</strong></td>
                    <td>${curText}</td>
                    <td>${bestText}</td>
                    <td><strong style="color: ${scoreColor};">${deltaText}</strong></td>
                    <td><span style="color: ${reasonColor}; font-size:0.85rem;">${s.reason}</span></td>
                `;
                tbody.appendChild(tr);
            });
        };

        if (selectHero && !selectHero._hasBisListener) {
            selectHero._hasBisListener = true;
            selectHero.addEventListener('change', renderTableForSelectedHero);
        }

        if (btnSaveLocal && !btnSaveLocal._hasBisListener) {
            btnSaveLocal._hasBisListener = true;
            btnSaveLocal.addEventListener('click', () => {
                const heroId = selectHero?.value || '101';
                const suggestions = finder.suggestForHero(heroId);
                localStorage.setItem(`ttbh_bis_notes_${heroId}`, JSON.stringify({
                    heroId,
                    savedAt: new Date().toISOString(),
                    suggestions
                }));
                alert(`Sugestões de BiS para o Herói ${heroId} salvas com sucesso localmente! (Nenhum arquivo de save foi modificado).`);
            });
        }

        renderTableForSelectedHero();
    }

    // --- Renderizador do Rune Planner ---
    window.__renderRunePlanner = renderRunePlanner;
    function renderRunePlanner(data) {
        const svg = document.getElementById('rune-tree-svg');
        const progressText = document.getElementById('rune-progress-text');
        const list = document.getElementById('rune-recommended-list');
        const costEl = document.getElementById('rune-next-cost');
        if (!svg) return;

        const planner = runePlanner.create(data, window.TBH_DB || {});
        const tree = planner.treeState();
        const plan = planner.planNext(5);

        if (progressText) {
            progressText.textContent = `${tree.unlockedCount} / ${tree.totalRunes} (${tree.maxedCount} Maximizadas)`;
        }

        if (costEl) {
            costEl.textContent = `${plan.costGold.toLocaleString('pt-BR')} G`;
        }

        if (list) {
            list.innerHTML = '';
            plan.nextRecommended.forEach(r => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';
                li.style.padding = '0.35rem 0.6rem';
                li.style.borderRadius = '4px';
                li.style.background = 'rgba(0,0,0,0.2)';

                const statusColor = r.status === 'inProgress' ? '#facc15' : '#38bdf8';
                li.innerHTML = `
                    <span><strong>${r.name}</strong> <span style="font-size:0.75rem; color:${statusColor};">Lv.${r.currentLevel}/${r.maxLevel}</span></span>
                    <strong style="color:#fbbf24;">${r.costGold.toLocaleString('pt-BR')} G</strong>
                `;
                list.appendChild(li);
            });
        }

        // Renderiza nós no SVG (projeção normalizada 600x400)
        svg.innerHTML = '';
        const bounds = window.TBH_DB?.runeBounds || { minX: -864, maxX: 1512, minY: -648, maxY: 432 };
        const rangeX = Math.max(1, bounds.maxX - bounds.minX);
        const rangeY = Math.max(1, bounds.maxY - bounds.minY);

        Object.values(tree.nodes).forEach(n => {
            const nx = ((n.x - bounds.minX) / rangeX) * 540 + 30;
            const ny = ((n.y - bounds.minY) / rangeY) * 340 + 30;

            let color = '#475569'; // locked
            if (n.status === 'maxed') color = '#22c55e'; // verde
            else if (n.status === 'inProgress') color = '#eab308'; // amarelo
            else if (n.status === 'available') color = '#38bdf8'; // azul

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', nx);
            circle.setAttribute('cy', ny);
            circle.setAttribute('r', n.status === 'maxed' ? '5' : (n.status === 'inProgress' ? '4.5' : '3'));
            circle.setAttribute('fill', color);
            circle.setAttribute('stroke', '#0f172a');
            circle.setAttribute('stroke-width', '1');
            circle.style.cursor = 'pointer';

            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${n.name} (Lv.${n.currentLevel}/${n.maxLevel})\nStatus: ${n.status}\nCusto p/ Max: ${n.costToMax.toLocaleString('pt-BR')} G`;
            circle.appendChild(title);

            svg.appendChild(circle);
        });
    }

    // --- Renderizador da Timeline de Backups ---
    initTimelineUI();

    // --- Telemetria V2 (Player.log e Runtime) ---
    setupPlayerTelemetryUI();
});
