import { stashValueEngine } from '../stash_value.js';
import { StatisticsEngine } from '../statistics_engine.js';
const statsEngine = new StatisticsEngine();
// storage_view.js - Extraído de app.js

export function filterAndRenderStorage() {
        const storageTbody = document.getElementById("storage-tbody");
        const storageSearch = document.getElementById("storage-search");
        const storageFilterType = document.getElementById("storage-filter-type");
        const storageFilteredCount = document.getElementById("storage-filtered-count");
        if (!storageTbody) return;

        const query = (storageSearch ? storageSearch.value : "").trim().toLowerCase();
        const filterType = storageFilterType ? storageFilterType.value : "ALL";

        const allItems = window.__allCurrentStorageItems || [];
        const filtered = allItems.filter(item => {
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
            tr.innerHTML = `<td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum item corresponde aos filtros selecionados.</td>`;
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

            tr.innerHTML = `
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
            tr.innerHTML = `<td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 0.75rem; font-size: 0.8rem; background: rgba(0,0,0,0.2);">Exibindo os primeiros 300 de ${filtered.length} itens. Use a busca para filtrar resultados específicos.</td>`;
            storageTbody.appendChild(tr);
        }
    }

export function renderPetsTab(petsData) {
            const petsContainer = document.getElementById('pets-container');
            const petSumExp = document.getElementById('pet-sum-exp');
            const petSumGold = document.getElementById('pet-sum-gold');
            const petSumNormalChest = document.getElementById('pet-sum-normal-chest');
            const petSumBossChest = document.getElementById('pet-sum-boss-chest');
        if (!petsData) return;

        const tb = petsData.totalBuffs || {};
        (document.getElementById('pet-sum-exp') || {}).textContent = `+${tb.expPercent || 0}%`;
        (document.getElementById('pet-sum-gold') || {}).textContent = `+${tb.goldPercent || 0}%`;
        (document.getElementById('pet-sum-normal-chest') || {}).textContent = `+${tb.normalChestPercent || 0}%`;
        (document.getElementById('pet-sum-boss-chest') || {}).textContent = `+${tb.bossChestPercent || 0}%`;

        (document.getElementById('pets-container') || {}).innerHTML = '';
        (petsData.all || []).forEach(pet => {
            const card = document.createElement('div');
            card.className = `pet-card ${pet.isActive ? 'active' : ''} ${!pet.isUnlocked ? 'locked' : ''}`;

            const statusBadge = pet.isActive 
                ? '<span class="pet-badge-active">ATIVO NA PARTY</span>'
                : (pet.isUnlocked ? '<span style="font-size: 0.7rem; color: var(--success); font-weight: 700;">DESBLOQUEADO</span>' : '<span style="font-size: 0.7rem; color: var(--text-muted);">BLOQUEADO</span>');

            const buffItems = (pet.buffs && pet.buffs.length > 0)
                ? pet.buffs.map(b => `<div class="pet-buff-entry">⚡ ${b}</div>`).join('')
                : `<div class="pet-buff-entry" style="color: var(--text-muted);">${pet.desc || 'Sem bônus registrado'}</div>`;

            card.innerHTML = `
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

            (document.getElementById('pets-container') || {}).appendChild(card);
        });
    }

export function renderCubeOptimization(inventory, cubeLevel) {
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

            li.innerHTML = `
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
        if (window.__initSynthesisSimulatorUI) window.__initSynthesisSimulatorUI();
    }

