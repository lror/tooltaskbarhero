import { updateBottleneckView } from './market_view.js';
import { PlayerTelemetry } from '../player_telemetry.js';
import { TBH_DB } from '../gamedata.js';
// telemetry_view.js - Extraído de app.js

export function renderAggregatesPanel(aggregatesData) {
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

export function setupPlayerTelemetryUI() {
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
        const btnLoadSteamLog = document.getElementById('btn-load-steam-log');
        const btnLoadDemoLog = document.getElementById('btn-load-demo-log');

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
                eventDetailsEl.innerHTML = `
                    <div>💾 <strong>Eventos de Gravação de Save (ES3):</strong> ${data.saveWriteEvents} chamadas registradas</div>
                    <div>⏱️ <strong>Tempo Sugerido de Clear:</strong> ${telemetry.suggestClearTimeSec().toFixed(2)}s (baseado na mediana de CoolDown)</div>
                    ${data.waitQueue ? `<div>👥 <strong>SteamID da Fila:</strong> <code>${data.waitQueue.steamID}</code></div>` : ''}
                `;
            }

            // 7. [V1.1.0] Timeline de Erros de Servidor & Rede ao Longo do Tempo
            const timelineEl = document.getElementById('telemetry-errors-timeline');
            const errorBadge = document.getElementById('telemetry-error-count-badge');
            if (timelineEl) {
                const logLines = (telemetry.logText || '').split(/\r?\n/);
                const errorsFound = [];

                logLines.forEach((line, idx) => {
                    if (
                        line.includes('Curl error') ||
                        line.includes('Online Time Retrieve error') ||
                        line.includes('UnityWebRequest Error') ||
                        line.includes('StageCount Error') ||
                        line.includes('ProtocolError') ||
                        line.includes('NullReferenceException')
                    ) {
                        errorsFound.push({
                            lineNum: idx + 1,
                            text: line.trim()
                        });
                    }
                });

                if (errorBadge) {
                    errorBadge.textContent = `${errorsFound.length} ocorrência(s)`;
                    errorBadge.className = errorsFound.length > 0 ? 'gear-tag badge-tier-5' : 'gear-tag badge-tier-2';
                }

                if (errorsFound.length > 0) {
                    timelineEl.innerHTML = errorsFound.slice(0, 15).map(err => `
                        <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 0.4rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-family: monospace;">
                            <span style="color: #fca5a5; font-weight: bold;">[Linha ${err.lineNum}]</span>
                            <span style="color: #f1f5f9; margin-left: 0.4rem;">${err.text}</span>
                        </div>
                    `).join('');
                } else {
                    timelineEl.innerHTML = `
                        <div style="color: #4ade80; font-size: 0.85rem; padding: 0.4rem 0;">
                            ✅ Conexão íntegra: Nenhum erro de rede, timeout de requisição ou falha crítica de servidor registrado.
                        </div>
                    `;
                }
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
                        btnApplyFarming.innerHTML = `<span>⚡</span> Aplicar tempo real no Farming`;
                    }, 2500);
                }
            });
        }

        // Carregamento de Player.log via Steam Linux
        if (btnLoadSteamLog) {
            btnLoadSteamLog.addEventListener('click', async () => {
                const origText = btnLoadSteamLog.innerHTML;
                btnLoadSteamLog.innerHTML = `<span>⏳</span> Lendo...`;
                try {
                    const res = await fetch('/steam_save/Player.log?t=' + Date.now());
                    if (!res.ok) {
                        // Fallback no fixture de teste versionado
                        const fallbackRes = await fetch('/tests/player_log_fixture.txt?t=' + Date.now());
                        if (!fallbackRes.ok) throw new Error('Player.log não encontrado no caminho padrão.');
                        const text = await fallbackRes.text();
                        activeTelemetry = new PlayerTelemetry(text);
                        updateTelemetryUI(activeTelemetry);
                    } else {
                        const text = await res.text();
                        activeTelemetry = new PlayerTelemetry(text);
                        updateTelemetryUI(activeTelemetry);
                    }
                    btnLoadSteamLog.innerHTML = `<span>✅</span> Log Carregado!`;
                    setTimeout(() => { btnLoadSteamLog.innerHTML = origText; }, 2000);
                } catch (err) {
                    console.error(err);
                    alert('Não foi possível ler o Player.log diretamente da Steam: ' + err.message + '\nPor favor, arraste o arquivo Player.log para a caixa abaixo.');
                    btnLoadSteamLog.innerHTML = origText;
                }
            });
        }

        // Carregamento de Player.log Demo embutido
        if (btnLoadDemoLog) {
            btnLoadDemoLog.addEventListener('click', async () => {
                const origText = btnLoadDemoLog.innerHTML;
                btnLoadDemoLog.innerHTML = `<span>⏳</span> Carregando...`;
                try {
                    const res = await fetch('/tests/player_log_fixture.txt?t=' + Date.now());
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const text = await res.text();
                    activeTelemetry = new PlayerTelemetry(text);
                    updateTelemetryUI(activeTelemetry);
                    btnLoadDemoLog.innerHTML = `<span>✅</span> Log Pronto!`;
                    setTimeout(() => { btnLoadDemoLog.innerHTML = origText; }, 2000);
                } catch (err) {
                    console.error(err);
                    alert('Erro ao carregar log de exemplo: ' + err.message);
                    btnLoadDemoLog.innerHTML = origText;
                }
            });
        }

        // Exporta função para atualização externa
        window.__updateTelemetryUI = updateTelemetryUI;
    }

export function updateTelemetryUI(telemetry) {
    if (typeof window.__updateTelemetryUI === 'function') {
        window.__updateTelemetryUI(telemetry);
    }
}

export function renderStageTelemetry(accountData) {
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

        const inputClearTime = document.getElementById('input-clear-time');
        if (inputClearTime) {
            inputClearTime.value = avg;
            updateBottleneckView(avg);
        }
    }

