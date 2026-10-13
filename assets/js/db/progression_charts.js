/**
 * [FEAT-1103-B] Módulo de Gráficos de Progressão
 * Renderiza gráficos SVG simples baseados nos dados do IndexedDB
 * Sem dependências externas (zero libs)
 */
window.ProgressionCharts = window.ProgressionCharts || {
    // Gráfico de linha simples em SVG
    renderLineChart(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container || !data || data.length === 0) {
            if (container) container.innerHTML = '<p style="color: #8b9bb4; text-align: center; padding: 2rem;">Dados insuficientes para exibir o gráfico. Faça upload de mais saves ao longo do tempo.</p>';
            return;
        }

        const width = options.width || 600;
        const height = options.height || 200;
        const padding = 40;
        const color = options.color || '#3b82f6';
        const label = options.label || 'Progressão';

        // Extrair valores
        const values = data.map(d => d[options.dataKey || 'currentStage']);
        const labels = data.map(d => new Date(d.timestamp).toLocaleDateString('pt-BR'));
        
        const maxVal = Math.max(...values) * 1.1;
        const minVal = Math.min(...values) * 0.9;
        const range = maxVal - minVal || 1;

        // Construir SVG
        let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: rgba(0,0,0,0.2); border-radius: 8px;">`;
        
        // Grid lines
        for (let i = 0; i <= 4; i++) {
            const y = padding + (height - 2 * padding) * (i / 4);
            const val = Math.round(maxVal - (range * i / 4));
            svg += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
            svg += `<text x="${padding - 10}" y="${y + 4}" fill="#8b9bb4" font-size="10" text-anchor="end">${val}</text>`;
        }

        // Line path
        const points = values.map((val, i) => {
            const x = padding + (width - 2 * padding) * (i / (values.length - 1 || 1));
            const y = padding + (height - 2 * padding) * (1 - (val - minVal) / range);
            return `${x},${y}`;
        });

        svg += `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;
        
        // Data points
        values.forEach((val, i) => {
            const x = padding + (width - 2 * padding) * (i / (values.length - 1 || 1));
            const y = padding + (height - 2 * padding) * (1 - (val - minVal) / range);
            svg += `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`;
            svg += `<title>${labels[i]}: ${val}</title>`;
        });

        // Label
        svg += `<text x="${width / 2}" y="${height - 10}" fill="#8b9bb4" font-size="11" text-anchor="middle">${label}</text>`;
        svg += `</svg>`;

        container.innerHTML = svg;
    },

    // Renderizar todos os gráficos de progressão
    async renderAll() {
        if (!window.TTBH_HistoryDB) return;
        
        try {
            const data = await window.TTBH_HistoryDB.getProgressionData();
            
            // Gráfico de Stage
            this.renderLineChart('chart-stage', data, { 
                dataKey: 'currentStage', 
                label: '📈 Progressão de Stage ao Longo do Tempo',
                color: '#3b82f6'
            });
            
            // Gráfico de Ouro
            this.renderLineChart('chart-gold', data, { 
                dataKey: 'gold', 
                label: '💰 Acúmulo de Ouro',
                color: '#fbbf24'
            });
            
            // Gráfico de Tier 7+
            this.renderLineChart('chart-tier7', data, { 
                dataKey: 'tier7ItemsCount', 
                label: '⚔️ Itens Tier 7+ Obtidos',
                color: '#a855f7'
            });

            // Stats cards
            if (data.length >= 2) {
                const first = data[0];
                const last = data[data.length - 1];
                const statsEl = document.getElementById('progression-stats');
                if (statsEl) {
                    statsEl.innerHTML = `
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;">
                            <div style="background: rgba(59, 130, 246, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.3);">
                                <div style="font-size: 0.75rem; color: #8b9bb4;">Sessões Registradas</div>
                                <div style="font-size: 1.5rem; font-weight: bold; color: #60a5fa;">${data.length}</div>
                            </div>
                            <div style="background: rgba(168, 85, 247, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.3);">
                                <div style="font-size: 0.75rem; color: #8b9bb4;">Stage Inicial → Final</div>
                                <div style="font-size: 1.5rem; font-weight: bold; color: #c084fc;">${first.currentStage} → ${last.currentStage}</div>
                            </div>
                            <div style="background: rgba(251, 191, 36, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.3);">
                                <div style="font-size: 0.75rem; color: #8b9bb4;">Crescimento Ouro</div>
                                <div style="font-size: 1.5rem; font-weight: bold; color: #fbbf24;">+${(last.gold - first.gold).toLocaleString()}</div>
                            </div>
                            <div style="background: rgba(16, 185, 129, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
                                <div style="font-size: 0.75rem; color: #8b9bb4;">Tier 7+ Adquiridos</div>
                                <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">+${last.tier7ItemsCount - first.tier7ItemsCount}</div>
                            </div>
                        </div>
                    `;
                }
            }
        } catch (err) {
            console.warn('[ProgressionCharts] Erro ao renderizar:', err);
        }
    }
};

window.TTBH_ProgressionCharts = ProgressionCharts;
