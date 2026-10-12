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

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
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

    // --- Leitura do Arquivo de Save ---
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

            renderDashboard(parsedData);

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
    function renderDashboard(data) {
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
        allCurrentStorageItems = data.allStorageItems || [];
        filterAndRenderStorage();

        // 6. Renderiza Aba de Pets & Soma Global de Buffs
        renderPetsTab(data.pets);

        // 7. Renderiza Otimizador do Cubo
        renderCubeOptimization(data.inventory, data.cube.level);

        // 8. Eficiência de Farm, Telemetria de Estágio & Projeções
        renderStageTelemetry(data.account);
        renderFarmProjections();

        // 9. BiS Finder & Rune Planner
        renderBiSFinder(data);
        renderRunePlanner(data);

        // 10. Aba de Relatório IA (Markdown)
        const aiMarkdown = AiExporter.generateMarkdown(data);
        if (aiMarkdownContent) {
            aiMarkdownContent.value = aiMarkdown;
        }

        // 11. Inspetor JSON
        document.getElementById('json-viewer-content').textContent = JSON.stringify(data.raw, null, 2);
    }

    // --- Painel de Atividade Acumulada ---
    function renderAggregates(aggregatesData) {
        renderAggregatesPanel(aggregatesData);
    }

    function renderAggregatesPanel(aggregatesData) {
        const AGG_TYPES = (window.TBH_DB && window.TBH_DB.aggregateTypes) || {
            MonsterKill:0, HeroDeath:1, GoldEarn:2, BoxObtain:3, ItemObtain:4,
            Synthesis:5, Alchemy:6, Crafting:7, Offering:8, Extraction:9,
            Decoration:10, Engraving:11, Inscription:12, StageClear:13, StageFail:14,
            PlayTime:15, BoxOpen:16, ActBossKill:17
        };

        const typeTotals = {};
        const subKeyGroups = {}; // { type: { subKey: sum } }
        let hasData = false;

        function addVal(type, subKey, val) {
            const numVal = Number(val) || 0;
            if (numVal > 0) hasData = true;
            typeTotals[type] = (typeTotals[type] || 0) + numVal;
            if (subKey !== undefined && subKey !== null && Number(subKey) !== 0) {
                if (!subKeyGroups[type]) subKeyGroups[type] = {};
                subKeyGroups[type][subKey] = (subKeyGroups[type][subKey] || 0) + numVal;
            }
        }

        if (Array.isArray(aggregatesData) && aggregatesData.length > 0) {
            aggregatesData.forEach(item => {
                if (!item) return;
                const type = item.Type !== undefined ? Number(item.Type) : undefined;
                const subKey = item.SubKey !== undefined ? item.SubKey : (item.subKey !== undefined ? item.subKey : 0);
                const val = item.Value !== undefined ? item.Value : (item.value !== undefined ? item.value : 0);
                
                if (type !== undefined && !isNaN(type)) {
                    addVal(type, subKey, val);
                } else {
                    // Fallback nome textual
                    const keyStr = String(item.Key || item.key || '').toLowerCase();
                    if (/kill|monster/i.test(keyStr)) addVal(AGG_TYPES.MonsterKill, subKey, val);
                    else if (/death/i.test(keyStr)) addVal(AGG_TYPES.HeroDeath, subKey, val);
                    else if (/gold/i.test(keyStr)) addVal(AGG_TYPES.GoldEarn, subKey, val);
                    else if (/boxopen/i.test(keyStr)) addVal(AGG_TYPES.BoxOpen, subKey, val);
                    else if (/box|chest/i.test(keyStr)) addVal(AGG_TYPES.BoxObtain, subKey, val);
                    else if (/clear/i.test(keyStr)) addVal(AGG_TYPES.StageClear, subKey, val);
                    else if (/fail/i.test(keyStr)) addVal(AGG_TYPES.StageFail, subKey, val);
                    else if (/boss/i.test(keyStr)) addVal(AGG_TYPES.ActBossKill, subKey, val);
                    else if (/synth/i.test(keyStr)) addVal(AGG_TYPES.Synthesis, subKey, val);
                    else if (/playtime|time/i.test(keyStr)) addVal(AGG_TYPES.PlayTime, subKey, val);
                }
            });
        } else if (aggregatesData && typeof aggregatesData === 'object' && Object.keys(aggregatesData).length > 0) {
            Object.entries(aggregatesData).forEach(([k, v]) => {
                const keyStr = String(k).toLowerCase();
                const val = Number(v) || 0;
                if (/kill|monster/i.test(keyStr)) addVal(AGG_TYPES.MonsterKill, 0, val);
                else if (/death/i.test(keyStr)) addVal(AGG_TYPES.HeroDeath, 0, val);
                else if (/gold/i.test(keyStr)) addVal(AGG_TYPES.GoldEarn, 0, val);
                else if (/boxopen/i.test(keyStr)) addVal(AGG_TYPES.BoxOpen, 0, val);
                else if (/box|chest/i.test(keyStr)) addVal(AGG_TYPES.BoxObtain, 0, val);
                else if (/clear/i.test(keyStr)) addVal(AGG_TYPES.StageClear, 0, val);
                else if (/fail/i.test(keyStr)) addVal(AGG_TYPES.StageFail, 0, val);
                else if (/boss/i.test(keyStr)) addVal(AGG_TYPES.ActBossKill, 0, val);
                else if (/synth/i.test(keyStr)) addVal(AGG_TYPES.Synthesis, 0, val);
                else if (/playtime|time/i.test(keyStr)) addVal(AGG_TYPES.PlayTime, 0, val);
            });
        }

        const formatSecsToHms = (seconds) => {
            if (!seconds || seconds <= 0) return '—';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };

        const renderVal = (id, type) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (!hasData || typeTotals[type] === undefined) {
                el.textContent = '—';
                return;
            }
            const val = typeTotals[type];
            el.textContent = (type === AGG_TYPES.PlayTime)
                ? formatSecsToHms(val)
                : val.toLocaleString('pt-BR');
        };

        renderVal('agg-monster-kill', AGG_TYPES.MonsterKill);
        renderVal('agg-hero-death', AGG_TYPES.HeroDeath);
        renderVal('agg-gold-earn', AGG_TYPES.GoldEarn);
        renderVal('agg-box-open', AGG_TYPES.BoxOpen);
        renderVal('agg-box-obtain', AGG_TYPES.BoxObtain);
        renderVal('agg-stage-clear', AGG_TYPES.StageClear);
        renderVal('agg-stage-fail', AGG_TYPES.StageFail);
        renderVal('agg-act-boss-kill', AGG_TYPES.ActBossKill);
        renderVal('agg-synthesis', AGG_TYPES.Synthesis);
        renderVal('agg-play-time', AGG_TYPES.PlayTime);

        // Sub-painel com top-3 sub-keys em MonsterKill e StageClear
        const subPanel = document.getElementById('agg-subkeys-panel');
        const subContent = document.getElementById('agg-subkeys-content');
        if (subPanel && subContent) {
            const pills = [];
            [AGG_TYPES.MonsterKill, AGG_TYPES.StageClear].forEach(t => {
                const grp = subKeyGroups[t];
                if (grp) {
                    const sorted = Object.entries(grp).sort((a, b) => b[1] - a[1]).slice(0, 3);
                    sorted.forEach(([sk, v]) => {
                        const typeName = t === AGG_TYPES.MonsterKill ? 'Monstro' : 'Dificuldade/Estágio';
                        pills.push(`<span class="buff-pill" style="display:inline-flex; padding:0.2rem 0.5rem; font-size:0.75rem; margin-right:0.4rem; margin-bottom:0.2rem;">${typeName} [SubKey=${sk}]: <strong style="margin-left:0.3rem;">${Number(v).toLocaleString('pt-BR')}</strong></span>`);
                    });
                }
            });

            if (pills.length > 0) {
                subContent.innerHTML = pills.join(' ');
                subPanel.style.display = 'block';
            } else {
                subPanel.style.display = 'none';
            }
        }
    }

    // --- Renderizador do Stash Value (Avaliação de Mercado) ---
    function renderStashValue(data) {
        const totalEl = document.getElementById('stash-value-total');
        const subEl = document.getElementById('stash-value-sub');
        const toggleBtn = document.getElementById('btn-toggle-price-mode');

        if (!totalEl || !data) return;

        const valData = stashValueEngine.calculateTotalStashValue(data);
        totalEl.textContent = valData.totalFormatted;
        
        if (subEl) {
            subEl.textContent = `Mochila: R$ ${valData.byLocation.stash.toFixed(2)} | Bolsa: R$ ${valData.byLocation.inventory.toFixed(2)} | Trade Ship: R$ ${valData.byLocation.tradeShip.toFixed(2)} (${valData.itemCount} itens)`;
        }

        if (toggleBtn && !toggleBtn._hasInitListener) {
            toggleBtn._hasInitListener = true;
            toggleBtn.addEventListener('click', () => {
                const nextMode = stashValueEngine.priceMode === "current" ? "preClose" : "current";
                stashValueEngine.setPriceMode(nextMode);
                toggleBtn.textContent = `🏷️ Modo: ${nextMode === "current" ? "Atual" : "Pré-Fechamento"}`;
                if (currentParsedData) {
                    renderStashValue(currentParsedData);
                }
            });
        }
    }

    // --- Auditoria de Combate & Diagnósticos IA (Visual) ---
    function renderCombatAudit(data) {
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

            card.innerHTML = window.TTBH.safeHtml`
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

    // --- Roster de Heróis & Modal de Inspeção ---
    function renderHeroes(heroes) {
        const container = document.getElementById('heroes-container');
        container.innerHTML = '';

        heroes.forEach(h => {
            const card = document.createElement('div');
            card.className = `hero-card ${h.inParty ? 'in-party' : ''}`;
            card.title = "Clique para abrir ficha completa, 10 slots e buffers de habilidades!";

            // Armas e equipamentos chave para preview direto no card
            const weaponSlot = (h.equippedSlots || []).find(s => !s.isEmpty && s.slotIndex === 0);
            const offhandSlot = (h.equippedSlots || []).find(s => !s.isEmpty && s.slotIndex === 1);

            let gearPreviewHtml = '';
            if (weaponSlot) {
                gearPreviewHtml += `<div class="hero-gear-pill"><span>⚔️ ${weaponSlot.name}</span> <span class="item-grade-tag badge-tier-${weaponSlot.tier}">Lv.${weaponSlot.level}</span></div>`;
            }
            if (offhandSlot) {
                gearPreviewHtml += `<div class="hero-gear-pill"><span>🛡️ ${offhandSlot.name}</span> <span class="item-grade-tag badge-tier-${offhandSlot.tier}">Lv.${offhandSlot.level}</span></div>`;
            }
            if (!weaponSlot && !offhandSlot) {
                gearPreviewHtml = `<div class="hero-gear-pill" style="color: var(--text-muted);">Sem armas equipadas</div>`;
            }

            card.innerHTML = window.TTBH.safeHtml`
                <div class="hero-card-header">
                    <div class="hero-icon">${h.icon}</div>
                    <div class="hero-title" style="flex: 1;">
                        <h4>
                            ${h.name}
                            ${h.inParty ? '<span class="hero-party-badge">NA PARTY</span>' : ''}
                        </h4>
                        <span class="hero-role">${h.role}</span>
                    </div>
                    <div class="hero-level">Lv.${h.level}</div>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; justify-content: space-between; border-top: 1px solid var(--card-border); padding-top: 0.5rem; margin-top: 0.25rem;">
                    <span>Itens Equipados: <strong>${h.equippedCount}/10</strong></span>
                    <span>Dano Real: <strong style="color: var(--gold);">${(h.baseStats?.attackDamage || 0).toLocaleString()}</strong></span>
                </div>
                <div class="hero-equipped-preview">
                    ${gearPreviewHtml}
                </div>
                <div style="margin-top: 0.4rem; font-size: 0.75rem; color: var(--accent-primary); text-align: right; font-weight: 600;">
                    Ver 10 Slots & Build Completa ➔
                </div>
            `;

            card.addEventListener('click', () => {
                openHeroModal(h);
            });

            container.appendChild(card);
        });
    }

    function openHeroModal(hero) {
        modalHeroIcon.textContent = hero.icon;
        modalHeroName.textContent = `${hero.name} (${hero.cls})`;
        modalHeroSubtitle.textContent = `Nível ${hero.level} • AP Alocado: ${hero.allocatedAP} • Status: ${hero.inParty ? 'Party Ativa' : (hero.isUnlocked ? 'Reserva' : 'Bloqueado')}`;

        // Atributos Reais de Combate com Detalhamento Transparente
        const st = hero.baseStats || {};
        const bd = hero.statBreakdowns || {};

        modalHeroStats.innerHTML = window.TTBH.safeHtml`
            <div class="modal-stat-card">
                <div class="modal-stat-label">Dano de Ataque Total</div>
                <div class="modal-stat-val" style="color: #facc15;">${(st.attackDamage || 1).toLocaleString()}</div>
                <div class="modal-stat-sub">Base: ${bd.baseAttack || 1} • Armas/Gear: +${(bd.gearAttack || 0).toLocaleString()} • Bônus/Passivas: +${bd.percentMultiplier || 0}%</div>
            </div>
            <div class="modal-stat-card">
                <div class="modal-stat-label">Velocidade de Ataque</div>
                <div class="modal-stat-val">${st.attackSpeed || 1.0}x</div>
                <div class="modal-stat-sub">Multiplicador por segundo</div>
            </div>
            <div class="modal-stat-card">
                <div class="modal-stat-label">Chance Crítica</div>
                <div class="modal-stat-val">${st.critChance || 2.5}%</div>
                <div class="modal-stat-sub">Taxa de dano crítico extra</div>
            </div>
            <div class="modal-stat-card">
                <div class="modal-stat-label">Dano Crítico</div>
                <div class="modal-stat-val">${st.critDamage || 140}%</div>
                <div class="modal-stat-sub">Multiplicador de golpe crítico</div>
            </div>
            <div class="modal-stat-card">
                <div class="modal-stat-label">Vida Máxima (HP)</div>
                <div class="modal-stat-val">${(st.maxHp || 1000).toLocaleString()}</div>
                <div class="modal-stat-sub">Pontos de vida totais em batalha</div>
            </div>
            <div class="modal-stat-card">
                <div class="modal-stat-label">Armadura / Defesa</div>
                <div class="modal-stat-val">${st.armor || 20}</div>
                <div class="modal-stat-sub">Redução de dano físico recebido</div>
            </div>
            <div class="modal-stat-card">
                <div class="modal-stat-label">Velocidade Movimento</div>
                <div class="modal-stat-val">${st.moveSpeed || 900}</div>
                <div class="modal-stat-sub">Deslocamento no cenário</div>
            </div>
            <div class="modal-stat-card">
                <div class="modal-stat-label">Bloqueio / Absorção</div>
                <div class="modal-stat-val">${st.blockChance || 0}% / ${st.damageAbsorption || 0}%</div>
                <div class="modal-stat-sub">Mitigação de golpes e magias</div>
            </div>
            <div class="modal-stat-card">
                <div class="modal-stat-label">Resistência ao Caos</div>
                <div class="modal-stat-val" style="color: ${(st.chaosResistance ?? 0) < 75 ? '#ef4444' : '#10b981'};">${st.chaosResistance ?? 0}%</div>
                <div class="modal-stat-sub">Teto de Tormento: 75%</div>
            </div>
            <div class="modal-stat-card">
                <div class="modal-stat-label">Resistências Elementais</div>
                <div class="modal-stat-val" style="font-size: 0.95rem;">🔥 ${st.fireResistance ?? 0}% • ❄️ ${st.coldResistance ?? 0}% • ⚡ ${st.lightningResistance ?? 0}%</div>
                <div class="modal-stat-sub">Fogo • Gelo • Raio (Teto: 75%)</div>
            </div>
            <div class="modal-stat-card">
                <div class="modal-stat-label">Pontos de Habilidade (AP)</div>
                <div class="modal-stat-val">${hero.allocatedAP} / ${(hero.abilityPoints || 0) + (hero.allocatedAP || 0)}</div>
                <div class="modal-stat-sub">Pontos distribuídos na árvore</div>
            </div>
        `;

        // 1. Habilidades Equipadas na Party (3 slots)
        modalHeroSkills.innerHTML = '';
        if (hero.equippedSkills && hero.equippedSkills.length > 0) {
            hero.equippedSkills.forEach(sk => {
                const item = document.createElement('div');
                item.className = 'modal-skill-item';
                item.innerHTML = window.TTBH.safeHtml`
                    <div>
                        <div class="modal-skill-title">⚡ ${sk.name}</div>
                        <div class="modal-skill-meta">Dano: ${sk.dmgType} • Recarga: ${sk.cooldown}s • ${sk.delivery}</div>
                    </div>
                    <span class="gear-tag badge-tier-8">Equipada</span>
                `;
                modalHeroSkills.appendChild(item);
            });
        } else {
            modalHeroSkills.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem;">Nenhuma habilidade equipada na party para este herói.</div>';
        }

        // 2. TODAS as Habilidades e Talentos com pontos alocados na Árvore (Buffers)
        modalHeroTalents.innerHTML = '';
        const activeTalents = hero.heroTalents || [];
        if (modalTalentsCountBadge) {
            modalTalentsCountBadge.textContent = `${activeTalents.length} Ativas`;
        }

        if (activeTalents.length > 0) {
            activeTalents.forEach(t => {
                const item = document.createElement('div');
                item.className = 'modal-talent-item';
                const isAct = t.type === "ACTIVESKILL";
                const badgeClass = isAct ? (t.isEquipped ? 'badge-tier-8' : 'badge-tier-6') : 'badge-tier-4';
                const typeText = isAct ? (t.isEquipped ? 'Ativa (Equipada)' : 'Ativa (Reserva)') : 'Passiva';

                item.innerHTML = window.TTBH.safeHtml`
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">
                            ${isAct ? '⚡' : '🛡️'} ${t.name}
                            <span class="gear-tag ${badgeClass}" style="margin-left: 0.3rem;">${typeText}</span>
                        </div>
                        <div class="talent-buff-text" style="font-size: 0.75rem; margin-top: 0.15rem;">
                            ${t.description}
                        </div>
                    </div>
                    <span class="talent-lvl-badge">Lv. ${t.level}/${t.maxLevel}</span>
                `;
                modalHeroTalents.appendChild(item);
            });
        } else {
            modalHeroTalents.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem;">Herói sem pontos de habilidade ou talentos alocados no momento.</div>';
        }

        // 3. 10 Slots de Equipamentos com Cores Oficiais e Detalhes In-Game
        modalHeroGear.innerHTML = '';
        (hero.equippedSlots || []).forEach(slot => {
            const slotEl = document.createElement('div');
            if (slot.isEmpty) {
                slotEl.className = 'gear-slot-item';
                slotEl.innerHTML = window.TTBH.safeHtml`
                    <div class="gear-slot-header">
                        <span class="gear-slot-type">${slot.slotName}</span>
                        <span class="gear-tag empty">Slot Vazio</span>
                    </div>
                `;
            } else {
                const tierClass = `badge-tier-${slot.tier}`;
                const slotIcons = ["🗡️", "🏹", "👑", "🦺", "🧤", "👢", "📿", "✨", "💍", "🛡️"];
                const sIcon = slotIcons[slot.slotIndex] || "⚔️";

                // Buffers Passivos Base (ex: Dano de Ataque 1037, Ataques por Segundo 1,65)
                let baseStatsHtml = '';
                if (slot.baseStats && slot.baseStats.list && slot.baseStats.list.length > 0) {
                    baseStatsHtml = `
                        <div class="item-card-base-stats">
                            ${slot.baseStats.list.map(b => `<div class="base-stat-row"><span class="stat-lbl">${b.label}</span> <strong class="stat-num">${b.value}</strong></div>`).join('')}
                        </div>
                    `;
                }

                // Atributos Inerentes (ex: - Dano Ataque +251, - 25% Mais Vel. Ataque, - Dano Crítico +104%)
                let inherentHtml = '';
                if (slot.inherentAttributes && slot.inherentAttributes.length > 0) {
                    inherentHtml = `
                        <div class="item-card-section">
                            <div class="item-card-section-title">Atributos Inerentes</div>
                            <div class="inherent-list">
                                ${slot.inherentAttributes.map(inh => `<div class="inherent-row"><span class="inh-bullet">-</span> <span class="inh-text">${inh.formattedText.replace(/^-\s*/, '')}</span></div>`).join('')}
                            </div>
                        </div>
                    `;
                }

                // Stats Únicas (ex: SkewerShot)
                let uniqueHtml = '';
                if (slot.uniqueStat) {
                    uniqueHtml = `
                        <div class="item-card-section unique-section">
                            <div class="item-card-section-title unique-title">Stats Únicas</div>
                            <div class="unique-desc">${slot.uniqueStat.description}</div>
                        </div>
                    `;
                }

                // Categorized Slots: Decoração, Gravação, Inscrição
                let slotsHtml = '';
                const decors = slot.decorationsList || [];
                const engravings = slot.engravingsList || [];
                const inscriptions = slot.inscriptionsList || [];

                if (decors.length > 0 || engravings.length > 0 || inscriptions.length > 0) {
                    slotsHtml = '<div class="item-card-slots">';
                    if (decors.length > 0) {
                        slotsHtml += `
                            <div class="slot-group decoration-group">
                                <div class="slot-group-header">🔸 Slot de Decoração</div>
                                ${decors.map(d => `<div class="slot-row"><span class="slot-badge badge-tier-${d.tier}">[T${d.tier}]</span> <span class="slot-text">${d.slotDisplay}</span></div>`).join('')}
                            </div>
                        `;
                    }
                    if (engravings.length > 0) {
                        slotsHtml += `
                            <div class="slot-group engraving-group">
                                <div class="slot-group-header">🔹 Slot de Gravação</div>
                                ${engravings.map(g => `<div class="slot-row"><span class="slot-badge badge-tier-${g.tier}">[T${g.tier}]</span> <span class="slot-text">${g.slotDisplay}</span></div>`).join('')}
                            </div>
                        `;
                    }
                    if (inscriptions.length > 0) {
                        slotsHtml += `
                            <div class="slot-group inscription-group">
                                <div class="slot-group-header">📜 Slot de Inscrição</div>
                                ${inscriptions.map(i => `<div class="slot-row"><span class="slot-badge badge-tier-${i.tier}">[T${i.tier}]</span> <span class="slot-text">${i.slotDisplay}</span></div>`).join('')}
                            </div>
                        `;
                    }
                    slotsHtml += '</div>';
                }

                slotEl.className = `gear-slot-item has-item tbh-gear-card ${slot.tier === 10 ? 'badge-tier-10' : ''}`;
                slotEl.innerHTML = window.TTBH.safeHtml`
                    <div class="gear-slot-header">
                        <span class="gear-slot-type">${sIcon} ${slot.slotName}</span>
                        <div style="display: flex; gap: 0.35rem; align-items: center;">
                            <span class="item-grade-tag ${tierClass}">${slot.gradeLabel || slot.grade}</span>
                            <span class="cube-action-badge ${slot.cubeAction === 'SÍNTESE' ? 'safe' : 'danger'}">${slot.cubeAction}</span>
                        </div>
                    </div>
                    
                    <div class="item-card-box">
                        <div class="item-card-header">
                            <div class="item-card-name grade-color-${(slot.grade || '').toLowerCase()}">${slot.name}</div>
                            <div class="item-card-grade-badge ${tierClass}">${slot.gradeLabel || slot.grade}</div>
                        </div>

                        ${baseStatsHtml}
                        ${inherentHtml}
                        ${uniqueHtml}
                        ${slotsHtml}

                        <div class="item-card-footer">
                            <span class="item-req-tag danger">Não negociável</span>
                            <span class="item-req-tag">${slot.heroRestriction || 'Qualquer Herói'}</span>
                            <span class="item-req-tag warning">${slot.reqLevel || 'Requer Nv.' + slot.level}</span>
                        </div>
                    </div>
                `;
            }
            modalHeroGear.appendChild(slotEl);
        });

        heroModal.classList.remove('hidden');
    }

    // --- Pets Tab & Soma Global de Buffs ---
    function renderPetsTab(petsData) {
        if (!petsData) return;

        const tb = petsData.totalBuffs || {};
        petSumExp.textContent = `+${tb.expPercent || 0}%`;
        petSumGold.textContent = `+${tb.goldPercent || 0}%`;
        petSumNormalChest.textContent = `+${tb.normalChestPercent || 0}%`;
        petSumBossChest.textContent = `+${tb.bossChestPercent || 0}%`;

        petsContainer.innerHTML = '';
        (petsData.all || []).forEach(pet => {
            const card = document.createElement('div');
            card.className = `pet-card ${pet.isActive ? 'active' : ''} ${!pet.isUnlocked ? 'locked' : ''}`;

            const statusBadge = pet.isActive 
                ? '<span class="pet-badge-active">ATIVO NA PARTY</span>'
                : (pet.isUnlocked ? '<span style="font-size: 0.7rem; color: var(--success); font-weight: 700;">DESBLOQUEADO</span>' : '<span style="font-size: 0.7rem; color: var(--text-muted);">BLOQUEADO</span>');

            const buffItems = (pet.buffs && pet.buffs.length > 0)
                ? pet.buffs.map(b => `<div class="pet-buff-entry">⚡ ${b}</div>`).join('')
                : `<div class="pet-buff-entry" style="color: var(--text-muted);">${pet.desc || 'Sem bônus registrado'}</div>`;

            card.innerHTML = window.TTBH.safeHtml`
                <div>
                    <div class="pet-card-header">
                        <div class="pet-icon-big">${pet.icon}</div>
                        <div>
                            <h4>${pet.name} ${statusBadge}</h4>
                            <p style="font-size: 0.75rem; color: var(--text-secondary);">${pet.desc}</p>
                        </div>
                    </div>
                    <div class="pet-buff-list">
                        ${buffItems}
                    </div>
                </div>
                <div style="margin-top: 1rem; font-size: 0.72rem; color: var(--text-muted); text-align: right;">
                    ID: ${pet.petKey}
                </div>
            `;

            petsContainer.appendChild(card);
        });
    }

    // --- Storage Tab (Inventário & Mochila) ---
    function filterAndRenderStorage() {
        if (!storageTbody) return;

        const query = (storageSearch ? storageSearch.value : "").trim().toLowerCase();
        const filterType = storageFilterType ? storageFilterType.value : "ALL";

        const filtered = allCurrentStorageItems.filter(item => {
            // Busca por texto
            if (query) {
                const matchName = (item.name || "").toLowerCase().includes(query);
                const matchKey = String(item.itemKey || "").includes(query);
                const matchGrade = (item.grade || "").toLowerCase().includes(query);
                if (!matchName && !matchKey && !matchGrade) return false;
            }

            // Filtro por tipo
            if (filterType === "WEAPON") {
                return (item.type || "").toUpperCase().includes("WEAPON") || (item.name || "").includes("Arco") || (item.name || "").includes("Espada");
            } else if (filterType === "ARMOR") {
                return ["HELMET", "ARMOR", "GLOVES", "BOOTS"].some(t => (item.type || "").toUpperCase().includes(t));
            } else if (filterType === "ACCESSORY") {
                return ["RING", "AMULET", "ACCESSORY"].some(t => (item.type || "").toUpperCase().includes(t));
            } else if (filterType === "CUBE_SAFE") {
                return item.cubeAction === "SÍNTESE";
            }

            return true;
        });

        if (storageFilteredCount) {
            storageFilteredCount.textContent = filtered.length;
        }

        storageTbody.innerHTML = '';

        if (filtered.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = window.TTBH.safeHtml`<td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum item corresponde aos filtros selecionados.</td>`;
            storageTbody.appendChild(tr);
            return;
        }

        // Renderiza primeiras 300 linhas para performance de renderização
        const itemsToRender = filtered.slice(0, 300);

        itemsToRender.forEach(it => {
            const tr = document.createElement('tr');
            const tierClass = `badge-tier-${it.tier || 1}`;

            const locBadge = it.location === "Inventário"
                ? `<span class="location-badge inv">Inventário</span>`
                : `<span class="location-badge stash">Mochila</span>`;

            const cubeBadge = it.cubeAction === "SÍNTESE"
                ? `<span class="cube-action-badge safe">SÍNTESE (100% EXP)</span>`
                : `<span class="cube-action-badge danger">ALQUIMIA / VENDA</span>`;

            const unitPrice = stashValueEngine ? stashValueEngine.getItemPriceForTable(it) : '—';
            const priceHtml = unitPrice !== '—'
                ? `<strong style="color: #10b981;">${unitPrice}</strong>`
                : `<span style="color: var(--text-muted); font-size: 0.8rem;">—</span>`;

            let modifiersHtml = '';
            if (it.detailedModifiers && it.detailedModifiers.length > 0) {
                modifiersHtml = it.detailedModifiers.map(m => {
                    const mTierClass = `badge-tier-${m.tier}`;
                    return `<span class="material-badge ${mTierClass}">[T${m.tier}] ${m.statName} ${m.formattedVal}</span>`;
                }).join(' ');
            } else {
                modifiersHtml = `<span style="color: var(--text-muted); font-size: 0.75rem;">-</span>`;
            }

            const decorsCount = it.decorations > 0 
                ? `<span class="gear-tag badge-tier-4">👑 +${it.decorations}</span>` 
                : `<span style="color: var(--text-muted); font-size: 0.75rem;">-</span>`;

            const inscriptsCount = it.inscriptions > 0 
                ? `<span class="gear-tag badge-tier-8">📜 +${it.inscriptions}</span>` 
                : `<span style="color: var(--text-muted); font-size: 0.75rem;">-</span>`;

            tr.innerHTML = window.TTBH.safeHtml`
                <td>${locBadge}</td>
                <td>
                    <strong style="color: var(--text-primary);">${it.name}</strong>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">ID: ${it.itemKey} • UID: ${it.uniqueId}</div>
                </td>
                <td><span class="item-grade-tag ${tierClass}">${it.grade} (T${it.tier || 1})</span></td>
                <td><strong>Lv.${it.level}</strong></td>
                <td>${priceHtml}</td>
                <td>${modifiersHtml}</td>
                <td>${decorsCount}</td>
                <td>${inscriptsCount}</td>
                <td>${cubeBadge}</td>
            `;

            storageTbody.appendChild(tr);
        });

        if (filtered.length > 300) {
            const tr = document.createElement('tr');
            tr.innerHTML = window.TTBH.safeHtml`<td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 0.75rem; font-size: 0.8rem; background: rgba(0,0,0,0.2);">Exibindo os primeiros 300 de ${filtered.length} itens. Use a busca para filtrar resultados específicos.</td>`;
            storageTbody.appendChild(tr);
        }
    }

    // --- Otimizador do Cubo ---
    function renderCubeOptimization(inventory, cubeLevel) {
        const synthList = document.getElementById('synth-list');
        const alchemyList = document.getElementById('alchemy-list');
        const synthCount = document.getElementById('synth-count');
        const alchemyCount = document.getElementById('alchemy-count');
        const totalCount = document.getElementById('inv-total-count');

        synthList.innerHTML = '';
        alchemyList.innerHTML = '';

        let safeCount = 0;
        let dangerCount = 0;

        inventory.forEach(item => {
            const evaluation = statsEngine.evaluateCubeAction(cubeLevel, item.level);
            const li = document.createElement('li');
            li.className = 'item-entry';

            const tierClass = `badge-tier-${item.tier || 1}`;

            li.innerHTML = window.TTBH.safeHtml`
                <div class="item-left">
                    <span class="item-name">${item.name}</span>
                    <div>
                        <span class="item-grade-tag ${tierClass}">${item.grade} (T${item.tier || 1})</span>
                        <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 0.3rem;">ID: ${item.itemKey}</span>
                    </div>
                </div>
                <div class="item-right">
                    <div class="item-lvl">Lv.${item.level}</div>
                    <div class="item-desc">${evaluation.action === 'SÍNTESE' ? '100% EXP' : 'Penalidade'}</div>
                </div>
            `;

            if (evaluation.action === 'SÍNTESE') {
                safeCount++;
                synthList.appendChild(li);
            } else {
                dangerCount++;
                alchemyList.appendChild(li);
            }
        });

        synthCount.textContent = safeCount;
        alchemyCount.textContent = dangerCount;
        totalCount.textContent = inventory.length;

        if (safeCount === 0) {
            synthList.innerHTML = '<li style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">Nenhum item na margem de ±10 níveis.</li>';
        }
        if (dangerCount === 0) {
            alchemyList.innerHTML = '<li style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">Nenhum item fora da margem do cubo.</li>';
        }

        // Inicializa ou atualiza Simulador de Síntese
        initSynthesisSimulatorUI();
    }

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

            tbody.innerHTML = window.TTBH.safeHtml`
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
    function renderStageTelemetry(accountData) {
        if (!accountData) return;
        const stageInfo = accountData.currentStageInfo || {
            label: "3-9",
            formatted: accountData.currentStageFormatted || "Ato 3 - 3-9 Tormento",
            diffPt: "Tormento",
            name: "Núcleo do Abismo"
        };

        const stageNameEl = document.getElementById('telemetry-stage-name');
        const stageSubEl = document.getElementById('telemetry-stage-sub');
        const lastThreeEl = document.getElementById('telemetry-last-three');
        const avgTimeEl = document.getElementById('telemetry-avg-time');
        const avgSubEl = document.getElementById('telemetry-avg-sub');

        if (stageNameEl) stageNameEl.textContent = `Ato ${stageInfo.act || 3} - ${stageInfo.label || '3-9'}`;
        if (stageSubEl) stageSubEl.textContent = `${stageInfo.diffPt || 'Tormento'} • ${stageInfo.name || 'Núcleo do Abismo'}`;

        const clearStats = accountData.stageClearStats || {
            lastThree: [260],
            averageSeconds: 260
        };

        if (lastThreeEl) {
            lastThreeEl.textContent = (clearStats.lastThree && clearStats.lastThree.length > 0)
                ? clearStats.lastThree.map(s => `${s}s`).join(', ')
                : '260s';
        }

        const avg = clearStats.averageSeconds || 260;
        if (avgTimeEl) avgTimeEl.textContent = `${avg}s (~${(avg / 60).toFixed(1)} min)`;
        if (avgSubEl) {
            avgSubEl.textContent = avg < 150 ? '⚡ Limpeza Rápida (Ideal)' : (avg <= 300 ? '⚖️ Ritmo Estável' : '⏳ Gargalo de DPS');
        }

        if (inputClearTime) {
            inputClearTime.value = avg;
            updateBottleneckView(avg);
        }
    }

    // --- Eficiência de Farm ---
    function renderFarmProjections() {
        const farmProjections = statsEngine.calculateFarmEfficiency(1000, 250, 500);
        document.getElementById('bat-proj-exp').textContent = `+${Math.round(farmProjections.batStats.totalExp).toLocaleString()} EXP`;
        document.getElementById('watcher-proj-gold').textContent = `+${Math.round(farmProjections.watcherStats.totalGold).toLocaleString()} Ouro`;

        updateBottleneckView(parseFloat(inputClearTime.value) || 48);
    }

    function updateBottleneckView(seconds) {
        const bottleneck = statsEngine.analyzeBottleneck("Atual", seconds);
        const alertBox = document.getElementById('bottleneck-alert');
        const title = document.getElementById('bottleneck-title');
        const desc = document.getElementById('bottleneck-desc');

        if (bottleneck.isOptimal) {
            alertBox.className = "alert-box success";
            title.textContent = "Tempo Otimizado (< 60s)";
            desc.textContent = bottleneck.recommendation;
        } else {
            alertBox.className = "alert-box danger";
            title.textContent = "Gargalo Detectado (> 60s)";
            desc.textContent = bottleneck.recommendation;
        }
    }

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
            raw: { demo: true, message: "Save de Demonstração Interativo com 10 Tiers e Cores Oficiais" }
        };

        currentRawDecrypted = { PlayerSaveData: { value: JSON.stringify(normalized) } };
        currentParsedData = normalized;

        renderDashboard(normalized);

        statusDot.classList.add('active');
        statusText.textContent = "Modo Demonstração Ativo";
        btnResetSave.classList.remove('hidden');

        uploadSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
    }

    // --- Renderizador do BiS Finder ---
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

                tr.innerHTML = window.TTBH.safeHtml`
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
                li.innerHTML = window.TTBH.safeHtml`
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

    function initTimelineUI() {
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

                    tr.innerHTML = window.TTBH.safeHtml`
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
                farmingSuggestBox.innerHTML = window.TTBH.safeHtml`
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

                tr.innerHTML = window.TTBH.safeHtml`
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
                tr.innerHTML = window.TTBH.safeHtml`
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
                chestOptSuggestionCard.innerHTML = window.TTBH.safeHtml`
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

                tr.innerHTML = window.TTBH.safeHtml`
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
                    monteCarloSummaryText.innerHTML = window.TTBH.safeHtml`
                        Simulação de 100 aberturas para <strong>${res.chestName}</strong>: Custo: <strong>${res.totalCost.toLocaleString('pt-BR')} G</strong> |
                        Retorno Bruto: <strong>${res.totalSimulatedGold.toLocaleString('pt-BR')} G</strong> |
                        Lucro Líquido: <strong style="color:${res.netGold >= 0 ? '#4ade80' : '#f87171'};">${res.netGold.toLocaleString('pt-BR')} G</strong>
                    `;
                    monteCarloTbody.innerHTML = '';
                    Object.entries(res.distribution).forEach(([itemName, qty]) => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = window.TTBH.safeHtml`
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

    // --- Telemetria V2 (Player.log cross-ref & Live UI) ---
    setupPlayerTelemetryUI();

    function setupPlayerTelemetryUI() {
        const dropzone = document.getElementById('telemetry-log-dropzone');
        const fileInput = document.getElementById('telemetry-log-file-input');
        const medianCycleEl = document.getElementById('telemetry-median-cycle');
        const cooldownCountEl = document.getElementById('telemetry-cooldown-count');
        const waitCountdownEl = document.getElementById('telemetry-wait-countdown');
        const waitStatusEl = document.getElementById('telemetry-wait-status');
        const seedsEl = document.getElementById('telemetry-seeds');
        const clientBuildEl = document.getElementById('telemetry-client-build');
        const buildStatusEl = document.getElementById('telemetry-build-status');
        const stuckAlert = document.getElementById('telemetry-stuck-alert');
        const stuckDesc = document.getElementById('telemetry-stuck-desc');
        const eventDetailsEl = document.getElementById('telemetry-event-details');
        const btnApplyFarming = document.getElementById('btn-apply-telemetry-farming');

        let activeTelemetry = null;
        let countdownTimer = null;

        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => fileInput.click());
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = 'var(--accent-primary)';
            });
            dropzone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = 'var(--card-border)';
            });
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = 'var(--card-border)';
                if (e.dataTransfer.files.length) {
                    readLogFile(e.dataTransfer.files[0]);
                }
            });
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    readLogFile(e.target.files[0]);
                }
            });
        }

        function readLogFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                activeTelemetry = new PlayerTelemetry(text);
                updateTelemetryUI(activeTelemetry);
            };
            reader.readAsText(file);
        }

        function updateTelemetryUI(telemetry) {
            const data = telemetry.extract();
            const median = telemetry.medianCycleMs();
            window.__lastDetectedClientBuild = data.clientBuild;

            // 1. Ciclo médio
            if (medianCycleEl) {
                medianCycleEl.textContent = median > 0 ? `${median.toFixed(1)} ms` : "---";
            }
            if (cooldownCountEl) {
                cooldownCountEl.textContent = `${data.cooldownsMs.length} amostras coletadas`;
            }

            // 2. WaitQueue Countdown ao vivo
            if (countdownTimer) clearInterval(countdownTimer);
            if (data.waitQueue && data.waitQueue.endTime) {
                const tick = () => {
                    const remainingMs = telemetry.waitQueueRemainingMs(Date.now());
                    if (remainingMs <= 0) {
                        if (waitCountdownEl) {
                            waitCountdownEl.textContent = "00:00:00";
                            waitCountdownEl.style.color = "#4ade80";
                        }
                        if (waitStatusEl) {
                            waitStatusEl.textContent = "✅ Fila liberada!";
                            waitStatusEl.style.color = "#4ade80";
                        }
                    } else {
                        const totalSec = Math.floor(remainingMs / 1000);
                        const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
                        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
                        const s = String(totalSec % 60).padStart(2, '0');
                        if (waitCountdownEl) {
                            waitCountdownEl.textContent = `${h}:${m}:${s}`;
                            waitCountdownEl.style.color = "var(--accent-primary)";
                        }
                        if (waitStatusEl) {
                            waitStatusEl.textContent = `Expira em ${data.waitQueue.endTime}`;
                            waitStatusEl.style.color = "var(--text-secondary)";
                        }
                    }
                };
                tick();
                countdownTimer = setInterval(tick, 1000);
            } else {
                if (waitCountdownEl) waitCountdownEl.textContent = "---";
                if (waitStatusEl) waitStatusEl.textContent = "Sem fila ativa registrada";
            }

            // 3. Sementes (Seeds)
            if (seedsEl) {
                const pSeed = data.personalSeed !== null ? data.personalSeed : "N/D";
                const qSeed = data.waitQueue?.seed !== undefined ? data.waitQueue.seed : "N/D";
                seedsEl.textContent = `P: ${pSeed} | Q: ${qSeed}`;
            }

            // 4. Build do Client vs Suportado
            const supBuild = TBH_DB?.meta?.supportedClientBuild || "1.0.4";
            if (clientBuildEl) {
                clientBuildEl.textContent = data.clientBuild || "Não detectado";
            }
            if (buildStatusEl) {
                if (data.clientBuild) {
                    const isMatch = data.clientBuild.includes(supBuild);
                    buildStatusEl.textContent = isMatch ? `Compatível (${supBuild})` : `⚠️ Alerta: build difere de ${supBuild}`;
                    buildStatusEl.style.color = isMatch ? "#4ade80" : "#fef08a";
                } else {
                    buildStatusEl.textContent = `Suportado: v${supBuild}`;
                    buildStatusEl.style.color = "var(--text-secondary)";
                }
            }

            // 5. Stuck Stage Alert
            if (stuckAlert && stuckDesc) {
                if (data.stuckStageKey) {
                    stuckDesc.textContent = `Progresso travado na fase ${data.stuckStageKey}. O boss não pode ser acionado — o farm pode estar invalidado!`;
                    stuckAlert.classList.remove('hidden');
                } else {
                    stuckAlert.classList.add('hidden');
                }
            }

            // 6. Detalhes gerais
            if (eventDetailsEl) {
                eventDetailsEl.innerHTML = window.TTBH.safeHtml`
                    <div>💾 <strong>Eventos de Gravação de Save (ES3):</strong> ${data.saveWriteEvents} chamadas registradas</div>
                    <div>⏱️ <strong>Tempo Sugerido de Clear:</strong> ${telemetry.suggestClearTimeSec().toFixed(2)}s (baseado na mediana de CoolDown)</div>
                    ${data.waitQueue ? `<div>👥 <strong>SteamID da Fila:</strong> <code>${data.waitQueue.steamID}</code></div>` : ''}
                `;
            }
        }

        // Injeta tempo sugerido no input da aba Farming
        if (btnApplyFarming) {
            btnApplyFarming.addEventListener('click', () => {
                if (!activeTelemetry) {
                    alert('Carregue um Player.log primeiro para extrair a mediana dos ciclos.');
                    return;
                }
                const sec = activeTelemetry.suggestClearTimeSec();
                if (sec <= 0) {
                    alert('Nenhuma amostra de CoolDown encontrada no log carregado.');
                    return;
                }
                const farmClearInput = document.getElementById('farming-clear-time');
                if (farmClearInput) {
                    farmClearInput.value = sec.toFixed(1);
                    // Dispara evento para recalcular farming se houver
                    farmClearInput.dispatchEvent(new Event('input', { bubbles: true }));
                    btnApplyFarming.textContent = `✅ ${sec.toFixed(1)}s aplicado!`;
                    setTimeout(() => {
                        btnApplyFarming.innerHTML = window.TTBH.safeHtml`<span>⚡</span> Aplicar tempo real no Farming`;
                    }, 2500);
                }
            });
        }
    }
});
