// hero_view.js - Extraído de app.js

export function renderHeroes(heroes) {
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

            card.innerHTML = `
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

export function openHeroModal(hero) {
    if (typeof window !== "undefined") window.openHeroModal = openHeroModal;
    if (!hero) return;

    const heroModal = document.getElementById('hero-modal');
    const modalHeroIcon = document.getElementById('modal-hero-icon');
    const modalHeroName = document.getElementById('modal-hero-name');
    const modalHeroSubtitle = document.getElementById('modal-hero-subtitle');
    const modalHeroStats = document.getElementById('modal-hero-stats');
    const modalHeroSkills = document.getElementById('modal-hero-skills');
    const modalHeroTalents = document.getElementById('modal-hero-talents');
    const modalTalentsCountBadge = document.getElementById('modal-talents-count-badge');
    const modalHeroGear = document.getElementById('modal-hero-gear');

    if (!heroModal) return;

    if (modalHeroIcon) modalHeroIcon.textContent = hero.icon || '🛡️';
    if (modalHeroName) modalHeroName.textContent = `${hero.name} (${hero.cls || hero.className || ''})`;
    if (modalHeroSubtitle) modalHeroSubtitle.textContent = `Nível ${hero.level || 1} • AP Alocado: ${hero.allocatedAP || 0} • Status: ${hero.inParty ? 'Party Ativa' : (hero.isUnlocked ? 'Reserva' : 'Bloqueado')}`;

        // Atributos Reais de Combate com Detalhamento Transparente
        const st = hero.baseStats || {};
        const bd = hero.statBreakdowns || {};

        modalHeroStats.innerHTML = `
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
                item.innerHTML = `
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

                item.innerHTML = `
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
                slotEl.innerHTML = `
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
                slotEl.innerHTML = `
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

