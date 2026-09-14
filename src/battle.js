import { AXIE_ROSTER, BOSS_ARTIFACTS } from './config.js';
import { AudioEngine, triggerScreenShake } from './audio.js';
import { showToast, openModal, getUniqueSynergyCounts, renderBoard, updateUI } from './ui.js';

let battleCritTriggeredThisRound = false;

export function spawnEncounter(state) {
  state.board[0] = [null, null, null];
  state.board[1] = [null, null, null];
  const banner = document.getElementById('opponent-banner');
  if (!banner) return;

  if (state.stage % 5 === 0) {
    const bossTier = Math.min(5, Math.floor(state.stage / 5));
    const bossNames = ["Grave Goliath", "Venom Basilisk", "Lunacian Colossus", "Solar Colossus", "Void Chimera"];
    const bossName = bossNames[(bossTier - 1) % bossNames.length];
    const bossHp = 520 + (state.stage * 85);
    const bossAtk = 48 + (state.stage * 7);

    banner.className = 'boss-wave';
    banner.innerHTML = `⚠️ BOSS ENCOUNTER (ROUND ${state.stage}): ${bossName}`;
    state.board[0][1] = {
      type: 'Boss', species: 'Boss', role: 'Titan', name: bossName,
      img: 'https://axiecdn.axieinfinity.com/axies/10549074/axie/axie-full-transparent.png',
      maxHp: bossHp, currentHp: bossHp, shield: 0, mana: 0, maxMana: 100, atk: bossAtk,
      level: bossTier, tier: bossTier, partLabel: `Titan Shell L${bossTier} ★★★`, team: 'enemy'
    };
    return;
  }

  banner.className = '';
  const surviving = state.tournamentPlayers.filter(p => p.id !== 'player' && p.isAlive);
  const rival = surviving.length > 0
    ? surviving[Math.floor(Math.random() * surviving.length)]
    : { name: 'Shadow Champion', hp: 50, focus: 'Mixed' };

  banner.innerHTML = `ROUND ${state.stage}: VS ${rival.name} (${rival.hp} HP)`;

  const aiTeamCount = Math.min(6, 2 + Math.floor(state.stage / 3.2));
  let aiStarLevel = 1;
  if (state.stage >= 8 && Math.random() < 0.45) aiStarLevel = 3;
  else if (state.stage >= 4) aiStarLevel = 2;

  let maxEnemyTier = 1;
  if (state.stage >= 7) maxEnemyTier = 5;
  else if (state.stage >= 5) maxEnemyTier = 4;
  else if (state.stage >= 3) maxEnemyTier = 2;
  else maxEnemyTier = 1;

  let candidatePool = AXIE_ROSTER.filter(a => a.tier <= maxEnemyTier && (rival.focus === 'Mixed' || a.role === rival.focus));
  if (!candidatePool || candidatePool.length === 0) {
    candidatePool = AXIE_ROSTER.filter(a => a.tier <= maxEnemyTier);
  }
  if (!candidatePool || candidatePool.length === 0) candidatePool = [AXIE_ROSTER[0]];

  let placed = 0;
  let attempts = 0;
  while (placed < aiTeamCount && attempts < 50) {
    attempts++;
    const base = candidatePool[Math.floor(Math.random() * candidatePool.length)];

    const hpScale = state.stage >= 4 ? 1.3 : 1.0;
    const hpBonus = aiStarLevel === 3 ? 220 : (aiStarLevel === 2 ? 100 : 0);
    const atkBonus = aiStarLevel === 3 ? 55 : (aiStarLevel === 2 ? 26 : 0);

    const calculatedHp = Math.round((base.baseHP + hpBonus) * hpScale);
    const calculatedAtk = base.baseAttack + atkBonus;

    const targetRow = base.role === 'Vanguard' ? 1 : 0;
    const col = Math.floor(Math.random() * 3);

    if (!state.board[targetRow][col]) {
      let enemyItem = null;
      if (state.stage >= 6 && placed === 0) {
        const keys = ['whetstone', 'quartz', 'starshell'];
        enemyItem = BOSS_ARTIFACTS[keys[Math.floor(Math.random() * keys.length)]];
      }

      state.board[targetRow][col] = {
        ...base,
        type: base.species,
        maxHp: calculatedHp,
        currentHp: calculatedHp,
        shield: 0,
        mana: 0,
        maxMana: 100,
        atk: calculatedAtk,
        level: aiStarLevel,
        equippedArtifact: enemyItem,
        partLabel: `${base.bodyPart} ${aiStarLevel === 3 ? '★★★' : (aiStarLevel === 2 ? '★★' : '★')}`,
        team: 'enemy'
      };
      placed++;
    }
  }
}

export function simulateBackgroundRivals(tournamentPlayers) {
  tournamentPlayers.forEach(p => {
    if (p.id !== 'player' && p.isAlive) {
      let chip = 10 + Math.floor(Math.random() * 12);
      p.hp = Math.max(0, p.hp - chip);
      if (p.hp <= 0) p.isAlive = false;
    }
  });
}

export function presentBossArtifactSelection(onSelectCallback) {
  const list = document.getElementById('artifact-choices-list');
  if (!list) return;
  list.innerHTML = '';

  Object.keys(BOSS_ARTIFACTS).forEach(key => {
    const art = BOSS_ARTIFACTS[key];
    const card = document.createElement('div');
    card.className = 'artifact-choice-card';
    card.onclick = (e) => {
      e.stopPropagation();
      onSelectCallback(art);
    };
    card.innerHTML = `
      <div style="font-weight:900; font-size:11px; color:var(--accent-gold);">${art.name}</div>
      <div style="font-size:9.5px; color:#cbd5e1; line-height:1.3;">${art.desc}</div>
    `;
    list.appendChild(card);
  });

  openModal('artifact-modal');
}

export async function startBattle(state, callbacks) {
  if (state.isBattling) return;
  let hasUnits = state.board[2].some(Boolean) || state.board[3].some(Boolean);
  if (!hasUnits) return showToast("⚠️ Deploy at least 1 Axie!");

  state.selectedSource = null;
  state.selectedArtifactIdx = null;
  callbacks.renderArtifactStash();
  state.isBattling = true;
  battleCritTriggeredThisRound = false;

  const btn = document.getElementById('battle-btn');
  if (btn) {
    btn.innerText = "CLASHING...";
    btn.style.background = "#64748b";
  }

  const savedPlayerArmy = [];
  for (let r = 2; r <= 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (state.board[r][c]) {
        savedPlayerArmy.push({
          r, c,
          unit: {
            ...state.board[r][c],
            currentHp: state.board[r][c].maxHp,
            shield: 0,
            mana: 0
          }
        });
      }
    }
  }

  applyPreBattleSynergies(state);

  let battleOver = false;
  for (let t = 0; t < 25; t++) {
    await new Promise(r => setTimeout(r, 650));
    executeTick(state, t);

    let pAlive = 0, eAlive = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        if (state.board[r][c]?.team === 'player') pAlive++;
        if (state.board[r][c]?.team === 'enemy') eAlive++;
      }
    }

    if (eAlive === 0) {
      try { AudioEngine.win(); } catch (e) {}
      triggerScreenShake(true);

      const isBossWave = (state.stage % 5 === 0);
      const interestGold = Math.min(3, Math.floor(state.gold / 10));

      if (isBossWave) {
        state.gold += 12 + interestGold;
        callbacks.addAXP(200, "Boss Victory");
        showToast(`👑 <b>BOSS DEFEATED!</b><br>+${12 + interestGold}g & +200 AXP`);
        presentBossArtifactSelection(callbacks.chooseArtifact);
      } else {
        state.gold += 5 + interestGold;
        callbacks.addAXP(50, "Battle Victory");
        showToast(`🏆 <b>VICTORY!</b> +${5 + interestGold}g (+${interestGold}g int) & +50 AXP`);
      }

      state.stage++;
      simulateBackgroundRivals(state.tournamentPlayers);
      callbacks.updateUI();

      const remainingRivals = state.tournamentPlayers.filter(p => p.id !== 'player' && p.isAlive);
      if (remainingRivals.length === 0) {
        await new Promise(r => setTimeout(r, 600));
        document.getElementById('vic-level').innerText = state.playerLevel;
        document.getElementById('vic-stage').innerText = state.stage - 1;
        document.getElementById('vic-gold').innerText = state.gold;
        openModal('victory-modal');
        state.isBattling = false;
        return;
      }

      await new Promise(r => setTimeout(r, 800));
      restoreBoardAndEndRound(state, savedPlayerArmy, callbacks);
      battleOver = true;
      break;
    }

    if (pAlive === 0) {
      try { AudioEngine.lose(); } catch (e) {}
      let dmgTaken = 10 + (eAlive * 4);
      if (state.activeCommander === 'oak') dmgTaken = Math.max(4, dmgTaken - 3);

      const interestGold = Math.min(3, Math.floor(state.gold / 10));
      state.playerHp = Math.max(0, state.playerHp - dmgTaken);
      state.gold += 5 + interestGold;
      showToast(`💥 Round Lost! -${dmgTaken} HP (+${5 + interestGold}g)`);

      simulateBackgroundRivals(state.tournamentPlayers);
      callbacks.updateUI();

      await new Promise(r => setTimeout(r, 1000));

      if (state.playerHp <= 0) {
        document.getElementById('go-stage').innerText = state.stage;
        document.getElementById('go-level').innerText = state.playerLevel;
        document.getElementById('go-mutations').innerText = `${Object.values(state.discoveredFusions).filter(Boolean).length}/3`;
        document.getElementById('go-rivals').innerText = state.tournamentPlayers.filter(p => p.id !== 'player' && p.isAlive).length;
        openModal('gameover-modal');
        state.isBattling = false;
        return;
      }

      state.stage++;
      restoreBoardAndEndRound(state, savedPlayerArmy, callbacks);
      battleOver = true;
      break;
    }
  }

  if (!battleOver) {
    showToast("Draw! Round reset.");
    restoreBoardAndEndRound(state, savedPlayerArmy, callbacks);
  }
}

export function applyPreBattleSynergies(state) {
  const { roleCounts: pRoles, originCounts: pOrigins } = getUniqueSynergyCounts(state.board, 'player');
  const hasDawn = (pOrigins['Dawn'] || 0) >= 1;

  if ((pRoles['Vanguard'] || 0) >= 2) {
    for (let r = 2; r <= 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (state.board[r][c]?.role === 'Vanguard') {
          addShieldWithCap(state.board[r][c], 50);
        }
      }
    }
    showToast("🛡️ Vanguard (2): +50 Grey Shield!");
  }

  if (state.activeCommander === 'oak') {
    for (let c = 0; c < 3; c++) {
      if (state.board[2][c]) {
        addShieldWithCap(state.board[2][c], 30);
      }
    }
  }

  for (let r = 2; r <= 3; r++) {
    for (let c = 0; c < 3; c++) {
      const u = state.board[r][c];
      if (u?.equippedArtifact?.id === 'quartz') {
        addShieldWithCap(u, 75);
      }
    }
  }

  if ((pOrigins['Plant'] || 0) >= 2) {
    for (let r = 2; r <= 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (state.board[r][c]?.type === 'Plant') {
          addShieldWithCap(state.board[r][c], 40);
        }
      }
    }
    showToast("🌿 Plant (2): +40 Shield!");
  }

  if ((pRoles['Marksman'] || 0) >= 2) {
    for (let r = 2; r <= 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (state.board[r][c]?.role === 'Marksman') {
          state.board[r][c].atk += 18;
        }
      }
    }
    showToast("🏹 Marksman (2): +18 ATK!");
  }

  if (hasDawn) {
    for (let c = 0; c < 3; c++) {
      if (state.board[1][c]) state.board[1][c].blinded = true;
    }
    showToast("☀️ Dawn: Enemy Frontline Blinded!");
  }

  const { roleCounts: eRoles, originCounts: eOrigins } = getUniqueSynergyCounts(state.board, 'enemy');
  if ((eRoles['Vanguard'] || 0) >= 2) {
    for (let r = 0; r <= 1; r++) {
      for (let c = 0; c < 3; c++) {
        if (state.board[r][c]?.role === 'Vanguard') {
          addShieldWithCap(state.board[r][c], 50);
        }
      }
    }
  }
  if ((eOrigins['Plant'] || 0) >= 2) {
    for (let r = 0; r <= 1; r++) {
      for (let c = 0; c < 3; c++) {
        if (state.board[r][c]?.type === 'Plant') {
          addShieldWithCap(state.board[r][c], 40);
        }
      }
    }
  }
}

export function executeTick(state, tick) {
  const { originCounts: pOrigins } = getUniqueSynergyCounts(state.board, 'player');
  const { originCounts: eOrigins } = getUniqueSynergyCounts(state.board, 'enemy');

  // Aqua regeneration
  if ((pOrigins['Aqua'] || 0) >= 2) {
    for (let r = 2; r <= 3; r++) {
      for (let c = 0; c < 3; c++) {
        const u = state.board[r][c];
        if (u?.type === 'Aqua') u.currentHp = Math.min(u.maxHp, u.currentHp + 15);
      }
    }
  }
  if ((eOrigins['Aqua'] || 0) >= 2) {
    for (let r = 0; r <= 1; r++) {
      for (let c = 0; c < 3; c++) {
        const u = state.board[r][c];
        if (u?.type === 'Aqua') u.currentHp = Math.min(u.maxHp, u.currentHp + 15);
      }
    }
  }

  // 1. Frontline column clashes (Melee / Primary clash)
  for (let col = 0; col < 3; col++) {
    let p = null, e = null;
    for (let r = 2; r <= 3; r++) if (state.board[r][col]?.team === 'player') { p = { r, c: col }; break; }
    for (let r = 1; r >= 0; r--) if (state.board[r][col]?.team === 'enemy')  { e = { r, c: col }; break; }

    if (!e && p) e = findTarget(state.board, 'enemy', col);
    if (!p && e) p = findTarget(state.board, 'player', col);

    if (p && e) resolveClash(state, p, e, tick);
  }

  // 2. Backline Ranged Support: Any Row 3 player unit and Row 0 enemy unit whose column had a frontline unit in front
  // now also fires a ranged support shot so backline carries are never idle!
  for (let c = 0; c < 3; c++) {
    const pBack = state.board[3][c];
    if (pBack && state.board[2][c]) { // Backline unit with frontline standing ahead
      const targetEnemy = findTarget(state.board, 'enemy', c);
      if (targetEnemy && state.board[targetEnemy.r][targetEnemy.c]) {
        resolveRangedAttack(state, { r: 3, c }, targetEnemy, tick);
      }
    }

    const eBack = state.board[0][c];
    if (eBack && state.board[1][c]) { // Enemy backline with front standing ahead
      const targetPlayer = findTarget(state.board, 'player', c);
      if (targetPlayer && state.board[targetPlayer.r][targetPlayer.c]) {
        resolveRangedAttack(state, { r: 0, c }, targetPlayer, tick);
      }
    }
  }

  renderBoard(state);
}

function findTarget(board, team, fromCol) {
  // First search opposing frontline in same column, then adjacent columns, then backline
  const cols = [fromCol, (fromCol + 1) % 3, (fromCol + 2) % 3];
  if (team === 'enemy') {
    // Look at enemy front row (r = 1), then back row (r = 0)
    for (let r of [1, 0]) {
      for (let c of cols) {
        if (board[r][c]?.team === 'enemy' && board[r][c].currentHp > 0) return { r, c };
      }
    }
  } else {
    // Look at player front row (r = 2), then back row (r = 3)
    for (let r of [2, 3]) {
      for (let c of cols) {
        if (board[r][c]?.team === 'player' && board[r][c].currentHp > 0) return { r, c };
      }
    }
  }
  return null;
}

function triggerRoleVfx(cellEl, role) {
  if (!cellEl) return;
  if (role === 'Slasher') {
    const v = document.createElement('div');
    v.className = 'vfx-slash';
    cellEl.appendChild(v);
    setTimeout(() => v.remove(), 250);
  } else if (role === 'Vanguard') {
    const v = document.createElement('div');
    v.className = 'vfx-shield';
    cellEl.appendChild(v);
    setTimeout(() => v.remove(), 300);
  }
}

function addShieldWithCap(unit, amount) {
  if (!unit) return;
  const maxCap = Math.round((unit.maxHp || 200) * 0.55); // Shield can never exceed 55% of Max HP
  const current = unit.shield || 0;
  unit.shield = Math.min(maxCap, current + amount);
}

function applyDamageWithShield(unit, dmg) {
  if (!unit.shield) unit.shield = 0;
  if (unit.shield >= dmg) {
    unit.shield -= dmg;
    return { hpDmg: 0, shieldAbsorbed: dmg };
  } else {
    let absorbed = unit.shield;
    let remainder = dmg - absorbed;
    unit.shield = 0;
    unit.currentHp -= remainder;
    return { hpDmg: remainder, shieldAbsorbed: absorbed };
  }
}

export function showAbilityBanner(r, c, abilityName, icon = '⚡') {
  const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if (!cell) return;
  const banner = document.createElement('div');
  banner.className = 'floating-ability';
  banner.innerHTML = `${icon} ${abilityName}!`;
  cell.appendChild(banner);
  setTimeout(() => banner.remove(), 1100);
}

// Ranged support attack for backline carries
function resolveRangedAttack(state, attackerCoord, targetCoord, tick) {
  const atkU = state.board[attackerCoord.r][attackerCoord.c];
  const tgtU = state.board[targetCoord.r][targetCoord.c];
  if (!atkU || !tgtU || atkU.currentHp <= 0 || tgtU.currentHp <= 0) return;

  const aCell = document.querySelector(`.cell[data-r="${attackerCoord.r}"][data-c="${attackerCoord.c}"]`);
  const aEl = document.getElementById(`unit-${attackerCoord.r}-${attackerCoord.c}`);
  if (aEl) {
    const animCls = atkU.team === 'player' ? 'lunge-up' : 'lunge-down';
    aEl.classList.remove(animCls);
    void aEl.offsetWidth;
    aEl.classList.add(animCls);
  }

  atkU.mana = Math.min(100, (atkU.mana || 0) + 25);
  let isUlt = (atkU.mana >= 100);

  if (isUlt) {
    atkU.mana = 0;
    try { AudioEngine.ult(); } catch (err) {}
    showAbilityBanner(attackerCoord.r, attackerCoord.c, atkU.ability || 'Ultimate', '✨');
    if (aCell) {
      const v = document.createElement('div');
      v.className = 'vfx-ultimate';
      aCell.appendChild(v);
      setTimeout(() => v.remove(), 400);
    }
  }

  let dmg = Math.round(atkU.atk * 0.85 * (isUlt ? 1.4 : 1.0));
  if (atkU.equippedArtifact?.id === 'starshell') dmg += 16;
  applyDamageWithShield(tgtU, dmg);

  try { AudioEngine.hit(); } catch (err) {}
  showDamageText(targetCoord.r, targetCoord.c, dmg, false, isUlt ? '#38bdf8' : '#a78bfa');

  if (tgtU.currentHp <= 0) {
    state.board[targetCoord.r][targetCoord.c] = null;
  }
}

export function resolveClash(state, p, e, tick) {
  const pU = state.board[p.r][p.c], eU = state.board[e.r][e.c];
  if (!pU || !eU) return;

  if (eU.blinded && tick === 0) {
    showDamageText(e.r, e.c, "MISS", false);
    eU.blinded = false;
    return;
  }

  const pCell = document.querySelector(`.cell[data-r="${p.r}"][data-c="${p.c}"]`);
  const eCell = document.querySelector(`.cell[data-r="${e.r}"][data-c="${e.c}"]`);
  const pEl = document.getElementById(`unit-${p.r}-${p.c}`);
  const eEl = document.getElementById(`unit-${e.r}-${e.c}`);

  if (pEl) { pEl.classList.remove('lunge-up'); void pEl.offsetWidth; pEl.classList.add('lunge-up'); }
  if (eEl) { eEl.classList.remove('lunge-down'); void eEl.offsetWidth; eEl.classList.add('lunge-down'); }

  pU.mana = Math.min(100, (pU.mana || 0) + 25);
  eU.mana = Math.min(100, (eU.mana || 0) + 25);

  let pIsUlt = (pU.mana >= 100);
  let eIsUlt = (eU.mana >= 100);

  if (pIsUlt) {
    pU.mana = 0;
    try { AudioEngine.ult(); } catch (err) {}
    showAbilityBanner(p.r, p.c, pU.ability || 'Ultimate', '⚡');
    if (pCell) {
      const v = document.createElement('div');
      v.className = 'vfx-ultimate';
      pCell.appendChild(v);
      setTimeout(() => v.remove(), 400);
    }
    if (pU.ability && (pU.ability.includes('Shield') || pU.ability.includes('Armor') || pU.ability.includes('Bastion'))) {
      const baseShield = pU.level === 3 ? 120 : (pU.level === 2 ? 85 : 65);
      addShieldWithCap(pU, baseShield);
      showDamageText(p.r, p.c, "🛡️ SHIELD!", false, '#38bdf8');
    } else if (pU.ability === 'Tail Slap') {
      pU.currentHp = Math.min(pU.maxHp, pU.currentHp + 35);
      showDamageText(p.r, p.c, "+35 HP", false, '#22c55e');
    }
  }

  if (eIsUlt) {
    eU.mana = 0;
    showAbilityBanner(e.r, e.c, eU.ability || 'Ultimate', '💥');
    if (eU.ability && (eU.ability.includes('Shield') || eU.ability.includes('Armor'))) {
      const baseShield = eU.level === 3 ? 110 : (eU.level === 2 ? 80 : 60);
      addShieldWithCap(eU, baseShield);
      showDamageText(e.r, e.c, "🛡️ SHIELD!", false, '#38bdf8');
    }
  }

  const { roleCounts: pRoles, originCounts: pOrigins } = getUniqueSynergyCounts(state.board, 'player');
  const { roleCounts: eRoles, originCounts: eOrigins } = getUniqueSynergyCounts(state.board, 'enemy');

  const pType = pU.type || pU.species;
  const eType = eU.type || eU.species;

  let strikes = ((pOrigins['Bird'] || 0) >= 2 && pType === 'Bird' && tick === 0) ? 2 : 1;

  let pCritChance = 0;
  if ((pRoles['Slasher'] || 0) >= 2) pCritChance += 0.35;
  if ((pOrigins['Beast'] || 0) >= 2 && pType === 'Beast') pCritChance += 0.30;
  if (pU.equippedArtifact?.id === 'whetstone') pCritChance += 0.20;

  let isCrit = Math.random() < pCritChance || pType === 'Mech' || (pIsUlt && pU.ability && pU.ability.includes('Combat'));
  if (eType === 'Dusk') isCrit = false;

  let critMult = pType === 'Mech' ? 2.5 : 1.75;
  if (isCrit && state.activeCommander === 'ronin' && !battleCritTriggeredThisRound) {
    critMult *= 1.5;
    state.gold += 1;
    battleCritTriggeredThisRound = true;
    showToast("⚔️ Ronin Shihan: +1g on Crit Strike!");
  }

  let pDmg = Math.round(pU.atk * (isCrit ? critMult : 1.0) * (pIsUlt ? 1.4 : 1.0)) * strikes;
  if (pU.equippedArtifact?.id === 'starshell' || pU.ability === 'Shield Piercer') pDmg += 16;

  let eCritChance = 0;
  if ((eRoles['Slasher'] || 0) >= 2) eCritChance += 0.35;
  if ((eOrigins['Beast'] || 0) >= 2 && eType === 'Beast') eCritChance += 0.30;
  let isEnemyCrit = Math.random() < eCritChance;
  let eDmg = Math.round(eU.atk * (isEnemyCrit ? 1.75 : 1.0) * (eIsUlt ? 1.3 : 1.0));

  if ((pOrigins['Bug'] || 0) >= 2 && pType === 'Bug') eDmg = Math.round(eDmg * 0.7);
  if ((eOrigins['Bug'] || 0) >= 2 && eType === 'Bug') pDmg = Math.round(pDmg * 0.7);

  if (eU.role === 'Vanguard' && pU.ability !== 'Shield Piercer') {
    pDmg = Math.round(pDmg * 0.8);
    if (eCell) triggerRoleVfx(eCell, 'Vanguard');
  }
  if (pU.role === 'Vanguard') {
    eDmg = Math.round(eDmg * 0.8);
    if (pCell) triggerRoleVfx(pCell, 'Vanguard');
  }

  applyDamageWithShield(eU, pDmg);
  applyDamageWithShield(pU, eDmg);

  if (eU.equippedArtifact?.id === 'quartz' || eType === 'Reptile') {
    applyDamageWithShield(pU, Math.round(pDmg * 0.25));
  }

  if (pU.equippedArtifact?.id === 'whetstone') {
    [e.c - 1, e.c + 1].forEach(adjCol => {
      if (adjCol >= 0 && adjCol < 3) {
        for (let r = 1; r >= 0; r--) {
          if (state.board[r][adjCol]?.team === 'enemy') {
            applyDamageWithShield(state.board[r][adjCol], 10);
            showDamageText(r, adjCol, 10, false);
            break;
          }
        }
      }
    });
  }

  if (isCrit) {
    try { AudioEngine.crit(); } catch (err) {}
    triggerScreenShake(true);
    if (eCell) triggerRoleVfx(eCell, 'Slasher');
  } else {
    try { AudioEngine.hit(); } catch (err) {}
    triggerScreenShake(false);
  }

  if (pType === 'Mech' && eU.currentHp <= 0) {
    state.gold += 1;
    try { AudioEngine.buy(); } catch (err) {}
    showToast("⚙️ Mech Generated +1g!");
  }

  showDamageText(e.r, e.c, pDmg, isCrit, pIsUlt ? '#38bdf8' : null);
  showDamageText(p.r, p.c, eDmg, isEnemyCrit);

  if (eU.currentHp <= 0) state.board[e.r][e.c] = null;
  if (pU.currentHp <= 0) state.board[p.r][p.c] = null;
}

export function showDamageText(r, c, dmg, isCrit, customColor = null) {
  const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if (!cell) return;
  const txt = document.createElement('div');
  txt.className = 'floating-num';
  txt.style.color = customColor || (isCrit ? '#facc15' : '#f87171');
  txt.innerText = isCrit ? `💥 ${dmg}` : `-${dmg}`;
  cell.appendChild(txt);
  setTimeout(() => txt.remove(), 700);
}

function restoreBoardAndEndRound(state, savedPlayerArmy, callbacks) {
  state.isBattling = false;
  const btn = document.getElementById('battle-btn');
  if (btn) {
    btn.innerText = "CLASH";
    btn.style.background = "#10b981";
  }

  state.board[2] = [null, null, null];
  state.board[3] = [null, null, null];
  savedPlayerArmy.forEach(item => {
    state.board[item.r][item.c] = item.unit;
  });

  spawnEncounter(state);
  callbacks.generateShop();
  callbacks.renderAll();
  callbacks.updateUI();
}
