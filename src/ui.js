import { SVG_ICONS, PLAYER_LEVELS, SECRET_MUTATION_TABLE, SYNERGY_INFO } from './config.js';
import { AudioEngine } from './audio.js';

let toastTimer = null;

export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(-4px)';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(0)';
  }, 1900);
}

export function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

export function createUnitEl(unit, isSelected, highlightedTrait = null, customId = '') {
  const hpPct = Math.max(0, Math.min(100, (unit.currentHp / unit.maxHp) * 100));
  const shieldPct = Math.min(100, ((unit.shield || 0) / unit.maxHp) * 100);
  const manaPct = Math.min(100, ((unit.mana || 0) / 100) * 100);

  const div = document.createElement('div');
  const uType = unit.type || unit.species;
  const isGlowing = highlightedTrait && (uType === highlightedTrait || unit.role === highlightedTrait);
  const isManaReady = (unit.mana || 0) >= 100;
  div.className = `unit ${uType} ${isSelected ? 'unit-selected' : ''} ${isGlowing ? 'syn-glow' : ''} ${isManaReady ? 'mana-ready' : ''}`;
  div.dataset.unitName = unit.name;
  div.dataset.unitLevel = unit.level || 1;
  if (customId) div.id = customId;

  const starTxt = unit.level === 3 ? '★★★' : (unit.level === 2 ? '★★' : '★');
  const runeIcon = unit.equippedArtifact ? `<span class="unit-rune-badge">${unit.equippedArtifact.icon}</span>` : '';
  const cleanName = unit.name.split(' ')[0];

  div.innerHTML = `
    <div class="unit-card-header">
      <span class="unit-star-badge">${starTxt}</span>
      <div class="badge-container">
        <span class="svg-badge">${SVG_ICONS[uType] || ''}</span>
        <span class="svg-badge">${SVG_ICONS[unit.role] || ''}</span>
      </div>
    </div>
    <div class="sprite-anchor">
      <div class="sprite-shadow"></div>
      <img src="${unit.img}" alt="${unit.name}" />
    </div>
    ${runeIcon}
    <div class="unit-footer">
      <div class="unit-name-strip">${cleanName}</div>
      <div class="unit-stat-chip">
        <span style="color:#22c55e">❤️${unit.currentHp}</span>
        <span style="color:#f59e0b">⚔️${unit.atk}</span>
      </div>
      <div class="bar-container">
        <div class="hp-bar">
          <div class="hp-fill" style="width:${hpPct}%"></div>
          <div class="shield-fill" style="width:${shieldPct}%"></div>
        </div>
        <div class="mana-bar">
          <div class="mana-fill" style="width:${manaPct}%"></div>
        </div>
      </div>
    </div>
  `;
  return div;
}

export function renderBench(state) {
  for (let i = 0; i < state.bench.length; i++) {
    const slot = document.querySelector(`.bench-slot[data-idx="${i}"]`);
    if (!slot) continue;
    slot.innerHTML = '';
    const unit = state.bench[i];
    if (unit) {
      const isSelected = state.selectedSource?.type === 'bench' && state.selectedSource?.index === i;
      slot.appendChild(createUnitEl(unit, isSelected, state.highlightedTrait));
    }
  }
}

export function renderBoard(state, checkSecretFusionFn) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
      if (!cell) continue;
      cell.classList.remove('highlight-target', 'highlight-fusion');
      const unit = state.board[r][c];

      if (r >= 2 && state.selectedSource) {
        const sUnit = state.selectedSource.type === 'bench'
          ? state.bench[state.selectedSource.index]
          : state.board[state.selectedSource.index.r][state.selectedSource.index.c];
        if (!unit) cell.classList.add('highlight-target');
        else if (checkSecretFusionFn && checkSecretFusionFn(sUnit, unit)) cell.classList.add('highlight-fusion');
      }

      const existingUnitEl = cell.querySelector('.unit');

      if (!unit) {
        if (existingUnitEl) cell.innerHTML = '';
        continue;
      }

      // During active battle, preserve DOM element to keep animations running, updating bars/stats in-place
      const isSameUnit = existingUnitEl && 
                         existingUnitEl.dataset.unitName === unit.name && 
                         Number(existingUnitEl.dataset.unitLevel) === unit.level;

      if (state.isBattling && isSameUnit) {
        const hpPct = Math.max(0, Math.min(100, (unit.currentHp / unit.maxHp) * 100));
        const shieldPct = Math.min(100, ((unit.shield || 0) / unit.maxHp) * 100);
        const manaPct = Math.min(100, ((unit.mana || 0) / 100) * 100);

        const hpBar = existingUnitEl.querySelector('.hp-fill');
        if (hpBar) hpBar.style.width = `${hpPct}%`;
        const shieldBar = existingUnitEl.querySelector('.shield-fill');
        if (shieldBar) shieldBar.style.width = `${shieldPct}%`;
        const manaBar = existingUnitEl.querySelector('.mana-fill');
        if (manaBar) manaBar.style.width = `${manaPct}%`;

        const statChip = existingUnitEl.querySelector('.unit-stat-chip');
        if (statChip) {
          statChip.innerHTML = `
            <span style="color:#22c55e">❤️${unit.currentHp}</span>
            <span style="color:#f59e0b">⚔️${unit.atk}</span>
          `;
        }
        if ((unit.mana || 0) >= 100) existingUnitEl.classList.add('mana-ready');
        else existingUnitEl.classList.remove('mana-ready');
      } else {
        cell.innerHTML = '';
        const isSelected = state.selectedSource?.type === 'board' && state.selectedSource?.index.r === r && state.selectedSource?.index.c === c;
        cell.appendChild(createUnitEl(unit, isSelected, state.highlightedTrait, `unit-${r}-${c}`));
      }
    }
  }
}

export function renderShop(state) {
  const el = document.getElementById('shop-container');
  if (!el) return;
  el.innerHTML = '';
  state.shopItems.forEach((item, idx) => {
    if (!item) {
      el.innerHTML += `<div class="shop-card" style="opacity:0.22; font-size:8px;">SOLD</div>`;
      return;
    }
    const canAfford = state.gold >= (item.cost || 2);
    const tierColor = `var(--tier-${item.tier || 1})`;
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.dataset.shopIdx = idx;
    card.innerHTML = `
      <div class="shop-card-header">
        <span class="shop-cost" style="${!canAfford ? 'background:#ef4444;color:#fff;' : ''}">${item.cost || 2}g</span>
        <div class="badge-container" style="display:flex; gap:1px;">
          <span class="svg-badge" style="width:10px; height:10px;">${SVG_ICONS[item.species] || ''}</span>
          <span class="svg-badge" style="width:10px; height:10px;">${SVG_ICONS[item.role] || ''}</span>
        </div>
        <span class="shop-tier" style="color:${tierColor}; border:1px solid ${tierColor}">T${item.tier || 1}</span>
      </div>
      <img src="${item.img}" alt="${item.name}" />
      <span class="shop-name">${item.name}</span>
      <div class="shop-stats">
        <span style="color:#22c55e">❤️${item.baseHP}</span>
        <span style="color:#f59e0b">⚔️${item.baseAttack}</span>
      </div>
    `;
    el.appendChild(card);
  });
}

export function renderArtifactStash(state) {
  for (let i = 0; i < 2; i++) {
    const slot = document.getElementById(`art-slot-${i}`);
    if (!slot) continue;
    slot.innerHTML = '';
    slot.classList.remove('selected');
    const art = state.artifactInventory[i];
    if (art) {
      if (state.selectedArtifactIdx === i) slot.classList.add('selected');
      slot.innerHTML = `
        <span>${art.icon}</span>
        <span class="artifact-label">${art.name.split(' ')[1] || 'Artifact'}</span>
      `;
    }
  }
}

export function updateStageRibbon(stage) {
  const ribbon = document.getElementById('stage-ribbon');
  if (!ribbon) return;
  ribbon.innerHTML = '';
  const start = Math.max(1, stage - 2);
  for (let r = start; r < start + 5; r++) {
    const isBoss = (r % 5 === 0);
    const node = document.createElement('div');
    node.className = `round-node ${r === stage ? 'active' : ''} ${isBoss ? 'boss-node' : ''} ${r < stage ? 'completed' : ''}`;
    node.innerText = isBoss ? `💀${r}` : `${r}`;
    ribbon.appendChild(node);
  }
}

export function updateSynergyBar(state, toggleTraitFn) {
  const bar = document.getElementById('synergy-bar');
  if (!bar) return;
  const { roleCounts, originCounts } = getUniqueSynergyCounts(state.board, 'player');

  const synergies = [
    { name: 'Vanguard', count: roleCounts['Vanguard'] || 0, req: 2, iconKey: 'Vanguard' },
    { name: 'Slasher',  count: roleCounts['Slasher'] || 0,  req: 2, iconKey: 'Slasher' },
    { name: 'Marksman', count: roleCounts['Marksman'] || 0, req: 2, iconKey: 'Marksman' },
    { name: 'Plant',    count: originCounts['Plant'] || 0,   req: 2, iconKey: 'Plant' },
    { name: 'Beast',    count: originCounts['Beast'] || 0,   req: 2, iconKey: 'Beast' },
    { name: 'Aqua',     count: originCounts['Aqua'] || 0,    req: 2, iconKey: 'Aqua' },
    { name: 'Bird',     count: originCounts['Bird'] || 0,    req: 2, iconKey: 'Bird' },
    { name: 'Bug',      count: originCounts['Bug'] || 0,     req: 2, iconKey: 'Bug' },
    { name: 'Reptile',  count: originCounts['Reptile'] || 0, req: 2, iconKey: 'Reptile' },
    { name: 'Mech',     count: originCounts['Mech'] || 0,    req: 1, iconKey: 'Mech' },
    { name: 'Dusk',     count: originCounts['Dusk'] || 0,    req: 1, iconKey: 'Dusk' },
    { name: 'Dawn',     count: originCounts['Dawn'] || 0,    req: 1, iconKey: 'Dawn' }
  ];

  bar.innerHTML = '';
  synergies.forEach(s => {
    if (s.count > 0) {
      const active = s.count >= s.req;
      const tag = document.createElement('div');
      tag.className = `syn-tag ${active ? 'active' : ''}`;
      const synInfo = SYNERGY_INFO[s.name];
      const bonusBrief = synInfo ? synInfo.bonus.split('.')[0] : '';
      tag.title = `${s.name}: ${bonusBrief}`;
      tag.innerHTML = `
        <span class="svg-badge" style="width:10px; height:10px;">${SVG_ICONS[s.iconKey] || ''}</span>
        <span>${s.name} (${s.count}/${s.req})</span>
      `;
      tag.onclick = (e) => {
        e.stopPropagation();
        toggleTraitFn(s.name);
        openSynergyGuideModal(state, s.name);
      };
      bar.appendChild(tag);
    }
  });

  if (bar.innerHTML === '') {
    bar.innerHTML = '<span style="color:#64748b; font-size:7.5px; cursor:pointer;" id="empty-syn-hint">⚡ Tap to view all Team Synergies & Buffs</span>';
    const hint = bar.querySelector('#empty-syn-hint');
    if (hint) hint.onclick = (e) => { e.stopPropagation(); openSynergyGuideModal(state); };
  }
}

export function openSynergyGuideModal(state, focusTrait = null) {
  try { AudioEngine.tap(); } catch (e) {}
  renderSynergyGuideList(state, focusTrait);
  openModal('synergy-guide-modal');
  if (focusTrait) {
    setTimeout(() => {
      const targetCard = document.getElementById(`syn-card-${focusTrait}`);
      if (targetCard) targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  }
}

export function renderSynergyGuideList(state, focusTrait = null) {
  const container = document.getElementById('synergy-guide-list');
  if (!container) return;
  container.innerHTML = '';

  const { roleCounts, originCounts } = getUniqueSynergyCounts(state.board, 'player');

  Object.keys(SYNERGY_INFO).forEach(traitKey => {
    const info = SYNERGY_INFO[traitKey];
    const currentCount = (info.category === 'Role') ? (roleCounts[traitKey] || 0) : (originCounts[traitKey] || 0);
    const isActive = currentCount >= info.req;
    const isFocused = focusTrait === traitKey;

    const card = document.createElement('div');
    card.id = `syn-card-${traitKey}`;
    card.className = `synergy-guide-card ${isActive ? 'active-team' : ''} ${isFocused ? 'highlighted' : ''}`;

    card.innerHTML = `
      <div class="synergy-card-top">
        <div class="synergy-card-title">
          <span class="svg-badge" style="width:14px; height:14px;">${SVG_ICONS[traitKey] || '⚡'}</span>
          <span>${traitKey}</span>
          <span class="synergy-badge-chip">${info.badge}</span>
        </div>
        <div class="synergy-count-status">
          ${currentCount > 0 ? (isActive ? `<b style="color:var(--accent-gold);">ACTIVE (${currentCount}/${info.req})</b>` : `<span style="color:#94a3b8;">DEPLOYED: ${currentCount}/${info.req}</span>`) : `<span style="color:#64748b;">(Req: ${info.req})</span>`}
        </div>
      </div>
      <div class="synergy-bonus-text">✨ ${info.bonus}</div>
      <div class="synergy-detail-text">${info.details}</div>
    `;

    card.onclick = (e) => {
      e.stopPropagation();
      showToast(`Trait Filter: Highlighting <b>${traitKey}</b> units`);
    };

    container.appendChild(card);
  });
}

export function updateLobbyDrawer(tournamentPlayers) {
  const list = document.getElementById('lobby-list');
  if (!list) return;
  list.innerHTML = '';
  const sorted = [...tournamentPlayers].sort((a, b) => b.hp - a.hp);

  sorted.forEach((p, rank) => {
    const el = document.createElement('div');
    el.className = `lobby-item ${p.id === 'player' ? 'is-player' : ''} ${!p.isAlive ? 'eliminated' : ''}`;
    el.innerHTML = `
      <div><b>#${rank + 1}</b> ${p.name}</div>
      <div style="font-weight:900; color:${p.hp > 30 ? '#22c55e' : '#ef4444'}">${p.isAlive ? `${p.hp} HP` : '💀 DEFEATED'}</div>
    `;
    list.appendChild(el);
  });

  const activeCount = tournamentPlayers.filter(p => p.isAlive).length;
  const lobbyBtn = document.getElementById('open-lobby-btn');
  if (lobbyBtn) lobbyBtn.innerText = `🏆 (${activeCount}/8)`;
}

export function updateOnboardingTip(state) {
  const msgEl = document.getElementById('onboard-msg');
  if (!msgEl) return;
  const deployed = getDeployedCount(state.board);
  const cap = Math.min(6, state.playerLevel + 1);
  const benchUnits = state.bench.filter(Boolean);

  if (state.stage === 1 && deployed === 0 && benchUnits.length === 0) {
    msgEl.innerHTML = "<b>Step 1:</b> Tap an Axie in the shop (2g) to draft them to your bench.";
  } else if (deployed === 0 && benchUnits.length > 0) {
    msgEl.innerHTML = "<b>Step 2:</b> Tap an Axie on your bench, then tap your arena zone (bottom 2 rows) to deploy!";
  } else if (deployed > 0 && deployed < cap && benchUnits.length > 0) {
    msgEl.innerHTML = `<b>Deploy Reinforcement:</b> Squad capacity is <b>${deployed}/${cap}</b>. Tap bench Axie to deploy!`;
  } else if (state.stage === 1 && deployed >= 1) {
    msgEl.innerHTML = "<b>Ready!</b> Tap <b>CLASH</b> to start Round 1. Vanguards absorb blows, Marksmen snipe from back.";
  } else if (state.stage === 2 && Object.values(state.discoveredFusions).every(v => !v)) {
    msgEl.innerHTML = "<b>Merging:</b> 3 identical units auto-fuse to ★★. Drag two ★★ opposites to breed Secret Classes!";
  } else if (state.gold >= 20 && Math.floor(state.gold / 10) >= 2) {
    const intGold = Math.min(3, Math.floor(state.gold / 10));
    msgEl.innerHTML = `<b>Interest Active:</b> You will earn <b>+${intGold}g bonus interest</b> at the end of this round!`;
  } else {
    msgEl.innerHTML = "Tap <b>CLASH</b> when your formation and synergies are ready for battle.";
  }
}

export function getUniqueSynergyCounts(board, team = 'player') {
  const uniqueUnits = new Set();
  const roleCounts = {}, originCounts = {};

  const startRow = team === 'player' ? 2 : 0;
  const endRow = team === 'player' ? 3 : 1;

  for (let r = startRow; r <= endRow; r++) {
    for (let c = 0; c < 3; c++) {
      const u = board[r][c];
      if (u && u.team === team && !uniqueUnits.has(u.name)) {
        uniqueUnits.add(u.name);
        roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
        originCounts[u.type] = (originCounts[u.type] || 0) + 1;
      }
    }
  }
  return { roleCounts, originCounts };
}

export function getDeployedCount(board) {
  let count = 0;
  for (let r = 2; r <= 3; r++) {
    for (let c = 0; c < 3; c++) if (board[r][c]) count++;
  }
  return count;
}

export function openInspectModal(unit) {
  if (!unit) return;
  try { AudioEngine.tap(); } catch (e) {}
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  setTxt('insp-name', unit.name);
  setTxt('insp-hp', `${unit.currentHp} / ${unit.maxHp} ${unit.shield > 0 ? `(+${unit.shield} 🛡️)` : ''}`);
  setTxt('insp-atk', unit.atk);
  setTxt('insp-star', unit.level === 3 ? '★★★' : (unit.level === 2 ? '★★' : '★'));
  setTxt('insp-tier', `Tier ${unit.tier || 1}`);
  setTxt('insp-part', unit.bodyPart || unit.part || 'Standard');
  setTxt('insp-tags', `${unit.type || unit.species} • ${unit.role}`);
  setTxt('insp-artifact', unit.equippedArtifact ? unit.equippedArtifact.name : 'None Equipped');
  setTxt('insp-ability', unit.ability || 'Battle Readiness');
  setTxt('insp-ability-desc', unit.abilityDesc || 'Fights with standard combat modifiers.');
  openModal('inspect-modal');
}

export function renderDiscoveryLog(discoveredFusions) {
  const list = document.getElementById('discovery-list');
  if (!list) return;
  list.innerHTML = '';
  ['Mech', 'Dusk', 'Dawn'].forEach(speciesKey => {
    const mutData = SECRET_MUTATION_TABLE[speciesKey];
    const isFound = discoveredFusions[speciesKey];
    const card = document.createElement('div');
    card.className = `log-card ${isFound ? 'unlocked' : ''}`;
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:900; color:${isFound ? 'var(--accent-gold)' : '#94a3b8'}">
          ${isFound ? `✓ ${speciesKey.toUpperCase()} MUTATIONS` : `??? UNKNOWN MUTATION (${speciesKey.toUpperCase()})`}
        </span>
        <span style="font-size:7.5px; padding:1px 3px; border-radius:2px; background:#1e293b;">${isFound ? 'DISCOVERED' : 'LOCKED'}</span>
      </div>
      <div style="color:#cbd5e1; font-size:8.5px; line-height:1.35;">
        ${isFound ? `<b>Known Variants:</b> ${mutData.variants.map(v => v.name).join(', ')}` : `<b>Hint:</b> <i>"${mutData.hint}"</i>`}
      </div>
    `;
    list.appendChild(card);
  });
}

export function updateUI(state, checkSecretFusionFn, toggleTraitFn) {
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  setTxt('gold', state.gold);
  setTxt('hp', state.playerHp);
  const deployed = getDeployedCount(state.board);
  const cap = Math.min(6, state.playerLevel + 1);
  setTxt('cap-txt', `${deployed}/${cap}`);

  const currentInterest = Math.min(3, Math.floor(state.gold / 10));
  setTxt('interest-hint', `(+${currentInterest}g int)`);

  const hpFill = document.getElementById('hp-fill');
  if (hpFill) hpFill.style.width = `${Math.max(0, state.playerHp)}%`;

  const levelConfig = PLAYER_LEVELS.find(l => l.level === state.playerLevel) || PLAYER_LEVELS[0];
  const req = levelConfig ? levelConfig.reqAXP : 100;
  setTxt('player-level', state.playerLevel);
  setTxt('current-axp', state.currentAXP);
  setTxt('next-axp', req);

  const axpFill = document.getElementById('axp-fill');
  if (axpFill) {
    const axpPct = Math.min(100, Math.round((state.currentAXP / req) * 100));
    axpFill.style.width = `${axpPct}%`;
  }

  let effectiveLevel = state.playerLevel;
  if (state.activeCommander === 'chimera') effectiveLevel += 1;
  const cfg = PLAYER_LEVELS.find(l => l.level === effectiveLevel) || PLAYER_LEVELS[PLAYER_LEVELS.length - 1];
  const maxT = cfg ? cfg.maxTier : 1;
  setTxt('tier-badge', `T1-${maxT}`);

  const playerEntry = state.tournamentPlayers.find(p => p.id === 'player');
  if (playerEntry) {
    playerEntry.hp = state.playerHp;
    if (state.playerHp <= 0) playerEntry.isAlive = false;
  }

  const cmdBadge = document.getElementById('cmd-badge');
  if (cmdBadge) {
    if (state.activeCommander === 'oak') cmdBadge.innerText = '🛡️ Oak';
    else if (state.activeCommander === 'ronin') cmdBadge.innerText = '⚔️ Ronin';
    else if (state.activeCommander === 'chimera') cmdBadge.innerText = '🧪 Chimera';
    else cmdBadge.innerText = '👑 Cmd';
  }

  const rerollBtn = document.getElementById('reroll-btn');
  if (rerollBtn) {
    if (state.freeRerollAvailable) {
      rerollBtn.innerHTML = `🔄 <b>FREE</b>`;
      rerollBtn.style.borderColor = 'var(--accent-gold)';
      rerollBtn.style.color = 'var(--accent-gold)';
    } else {
      rerollBtn.innerHTML = `🔄 2g`;
      rerollBtn.style.borderColor = 'var(--panel-border)';
      rerollBtn.style.color = '#cbd5e1';
    }
  }

  const interestHint = document.getElementById('interest-hint');
  if (interestHint) {
    interestHint.style.color = currentInterest > 0 ? 'var(--accent-gold)' : 'var(--text-muted)';
    interestHint.style.fontWeight = currentInterest > 0 ? '900' : '700';
  }

  const sellBtn = document.getElementById('sell-btn');
  if (sellBtn) {
    if (state.selectedSource && !state.isBattling) {
      let target = state.selectedSource.type === 'bench' 
        ? state.bench[state.selectedSource.index] 
        : state.board[state.selectedSource.index.r][state.selectedSource.index.c];
      const refund = target ? (target.cost || 2) : 2;
      sellBtn.innerText = `SELL (+${refund}g)`;
      sellBtn.style.display = 'flex';
    } else {
      sellBtn.style.display = 'none';
    }
  }

  updateStageRibbon(state.stage);
  updateSynergyBar(state, toggleTraitFn);
  updateLobbyDrawer(state.tournamentPlayers);
  updateOnboardingTip(state);
}
