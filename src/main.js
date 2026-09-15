import { PLAYER_LEVELS, SHOP_ODDS, AXIE_ROSTER, SECRET_MUTATION_TABLE, BOSS_ARTIFACTS } from './config.js';
import { AudioEngine, triggerScreenShake } from './audio.js';
import {
  showToast,
  openModal,
  closeModal,
  renderBoard,
  renderBench,
  renderShop,
  renderArtifactStash,
  openInspectModal,
  renderDiscoveryLog,
  updateUI,
  getDeployedCount
} from './ui.js';
import { spawnEncounter, startBattle } from './battle.js';

export const state = {
  activeCommander: null,
  playerHp: 100,
  gold: 10,
  stage: 1,
  currentAXP: 0,
  playerLevel: 1,
  isBattling: false,
  selectedSource: null,
  selectedArtifactIdx: null,
  highlightedTrait: null,
  discoveredFusions: { Mech: false, Dusk: false, Dawn: false },
  tournamentPlayers: [
    { id: 'player', name: 'You (Lunacian)', hp: 100, isAlive: true },
    { id: 'cpu1', name: 'RoninChad', hp: 100, isAlive: true, focus: 'Slasher' },
    { id: 'cpu2', name: 'PlantShield', hp: 100, isAlive: true, focus: 'Vanguard' },
    { id: 'cpu3', name: 'AquaSniper', hp: 100, isAlive: true, focus: 'Marksman' },
    { id: 'cpu4', name: 'BirdRage', hp: 100, isAlive: true, focus: 'Marksman' },
    { id: 'cpu5', name: 'ToxicSpikes', hp: 100, isAlive: true, focus: 'Vanguard' },
    { id: 'cpu6', name: 'BugMaster', hp: 100, isAlive: true, focus: 'Slasher' },
    { id: 'cpu7', name: 'ChimeraKing', hp: 100, isAlive: true, focus: 'Mixed' }
  ],
  board: [
    [null, null, null],
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ],
  bench: [null, null, null, null, null],
  artifactInventory: [null, null],
  shopItems: [],
  freeRerollAvailable: true
};

export function getMaxDeployCap() {
  return Math.min(6, state.playerLevel + 1);
}

export function getCurrentMaxTier() {
  let effectiveLevel = state.playerLevel;
  if (state.activeCommander === 'chimera') effectiveLevel += 1;
  const config = PLAYER_LEVELS.find(l => l.level === effectiveLevel) || PLAYER_LEVELS[PLAYER_LEVELS.length - 1];
  return config ? config.maxTier : 1;
}

export function addAXP(amount, sourceLabel = "") {
  state.currentAXP += amount;
  const config = PLAYER_LEVELS.find(l => l.level === state.playerLevel) || PLAYER_LEVELS[PLAYER_LEVELS.length - 1];

  if (state.currentAXP >= config.reqAXP && state.playerLevel < 10) {
    state.currentAXP -= config.reqAXP;
    state.playerLevel++;
    try { AudioEngine.levelUp(); } catch (e) {}
    triggerScreenShake(true);
    showToast(`⭐ <b>PLAYER LEVEL UP!</b><br>LEVEL ${state.playerLevel} • UNLOCKED: TIER 1–${getCurrentMaxTier()}`);
  } else if (sourceLabel) {
    showToast(`+${amount} AXP (${sourceLabel})`);
  }
  syncUI();
}

export function getShopPool(level) {
  let effectiveLevel = level;
  if (state.activeCommander === 'chimera') effectiveLevel = Math.min(10, level + 1);
  const odds = SHOP_ODDS[effectiveLevel] || SHOP_ODDS[1];
  const roll = Math.random() * 100;
  let accumulated = 0;
  let chosenTier = 1;

  for (let t = 0; t < odds.length; t++) {
    accumulated += odds[t];
    if (roll <= accumulated) {
      chosenTier = t + 1;
      break;
    }
  }

  let candidates = AXIE_ROSTER.filter(a => a.tier === chosenTier);
  if (!candidates || candidates.length === 0) candidates = AXIE_ROSTER.filter(a => a.tier <= getCurrentMaxTier());
  if (!candidates || candidates.length === 0) candidates = [AXIE_ROSTER[0]];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function generateShop() {
  state.shopItems = [
    getShopPool(state.playerLevel),
    getShopPool(state.playerLevel),
    getShopPool(state.playerLevel),
    getShopPool(state.playerLevel)
  ];
  renderShop(state);
}

export function rerollShop() {
  if (state.isBattling) return;
  if (state.freeRerollAvailable) {
    state.freeRerollAvailable = false;
    showToast("✨ <b>FREE REROLL USED!</b>");
  } else {
    if (state.gold < 2) {
      showToast("⚠️ Need 2g to reroll!");
      return;
    }
    state.gold -= 2;
  }
  try { AudioEngine.reroll(); } catch (e) {}
  generateShop();
  syncUI();
}

export function buyToBench(shopIdx) {
  if (state.isBattling) return;
  const item = state.shopItems[shopIdx];
  if (!item) return;

  const itemCost = item.cost || 2;
  if (state.gold < itemCost) return showToast(`⚠️ Need ${itemCost}g!`);
  const emptyIdx = state.bench.findIndex(s => s === null);
  if (emptyIdx === -1) return showToast("⚠️ Bench Full! Deploy or sell an Axie.");

  state.gold -= itemCost;
  state.bench[emptyIdx] = {
    ...item,
    type: item.species,
    maxHp: item.baseHP,
    currentHp: item.baseHP,
    shield: 0,
    mana: 0,
    maxMana: 100,
    atk: item.baseAttack,
    level: 1,
    equippedArtifact: null,
    partLabel: `${item.bodyPart || 'Part'} ★`,
    team: 'player'
  };
  state.shopItems[shopIdx] = null;
  try { AudioEngine.buy(); } catch (e) {}

  renderShop(state);
  renderBench(state);
  syncUI();
  runAutoUpgradeEngine();
}

export function runAutoUpgradeEngine() {
  let upgraded = false;
  const allPlayerUnits = [];
  for (let r = 2; r <= 3; r++) {
    for (let c = 0; c < 3; c++) if (state.board[r][c]) allPlayerUnits.push({ loc: 'board', r, c, unit: state.board[r][c] });
  }
  for (let i = 0; i < state.bench.length; i++) {
    if (state.bench[i]) allPlayerUnits.push({ loc: 'bench', idx: i, unit: state.bench[i] });
  }

  for (let checkLevel = 1; checkLevel <= 2; checkLevel++) {
    const grouped = {};
    allPlayerUnits.forEach(item => {
      if (item.unit.level === checkLevel) {
        const key = item.unit.name;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      }
    });

    for (let key in grouped) {
      if (grouped[key].length >= 3) {
        const three = grouped[key].slice(0, 3);
        three.sort((a, b) => (a.loc === 'board' ? -1 : 1));
        const targetSlot = three[0];
        const primaryUnit = targetSlot.unit;

        let preservedArtifact = primaryUnit.equippedArtifact;
        for (let i = 1; i < 3; i++) {
          const victim = three[i];
          if (victim.unit.equippedArtifact) {
            if (preservedArtifact) addArtifactToStash(victim.unit.equippedArtifact);
            else preservedArtifact = victim.unit.equippedArtifact;
          }
          if (victim.loc === 'board') state.board[victim.r][victim.c] = null;
          else state.bench[victim.idx] = null;
        }

        primaryUnit.equippedArtifact = preservedArtifact;
        primaryUnit.level += 1;
        primaryUnit.maxHp += (primaryUnit.level === 2 ? 80 : 160);
        primaryUnit.currentHp = primaryUnit.maxHp;
        primaryUnit.atk += (primaryUnit.level === 2 ? 22 : 44);
        const starStr = primaryUnit.level === 2 ? '★★' : '★★★';
        primaryUnit.partLabel = `${primaryUnit.bodyPart || primaryUnit.part} ${starStr}`;

        try { AudioEngine.evolve(); } catch (e) {}
        triggerScreenShake(primaryUnit.level === 3);

        let axpReward = primaryUnit.level === 2 ? 60 : 140;
        if (state.activeCommander === 'chimera') axpReward += 25;
        addAXP(axpReward, `${primaryUnit.name} Auto-Merge!`);
        showToast(`✨ <b>AUTO-MERGE!</b><br>${primaryUnit.name} evolved to ${starStr}!`);

        upgraded = true;
        break;
      }
    }
    if (upgraded) break;
  }

  if (upgraded) {
    renderBoard(state, checkSecretFusion);
    renderBench(state);
    renderArtifactStash(state);
    syncUI();
    setTimeout(runAutoUpgradeEngine, 150);
  }
}

export function rollRngSecretMutation(speciesKey) {
  const data = SECRET_MUTATION_TABLE[speciesKey];
  if (!data || !data.variants) return null;
  const list = data.variants;
  const roll = Math.random();
  if (roll < 0.40) return list[0];
  if (roll < 0.75) return list[1];
  return list[2];
}

export function checkSecretFusion(u1, u2) {
  if (!u1 || !u2 || u1.level < 2 || u2.level < 2) return null;
  const t1 = u1.type || u1.species;
  const t2 = u2.type || u2.species;

  const isGroup1 = (t) => ['Beast', 'Bug'].includes(t);
  const isGroup2 = (t) => ['Aqua', 'Bird'].includes(t);
  const isGroup3 = (t) => ['Plant', 'Reptile'].includes(t);

  if ((isGroup1(t1) && isGroup2(t2)) || (isGroup2(t1) && isGroup1(t2))) return rollRngSecretMutation('Mech');
  if ((isGroup3(t1) && isGroup2(t2)) || (isGroup2(t1) && isGroup3(t2))) return rollRngSecretMutation('Dusk');
  if ((isGroup3(t1) && isGroup1(t2)) || (isGroup1(t1) && isGroup3(t2))) return rollRngSecretMutation('Dawn');
  return null;
}

export function openMutationDiscoveryShowcase(mutUnit) {
  try { AudioEngine.fanfare(); } catch (e) {}
  triggerScreenShake(true);

  const imgEl = document.getElementById('mut-showcase-img');
  const nameEl = document.getElementById('mut-showcase-name');
  const specEl = document.getElementById('mut-showcase-species');
  const abEl = document.getElementById('mut-showcase-ability');

  if (imgEl) imgEl.src = mutUnit.img;
  if (nameEl) nameEl.innerText = `✨ ${mutUnit.name} (★★★) ✨`;
  if (specEl) specEl.innerText = `${mutUnit.species} • ${mutUnit.role}`;
  if (abEl) abEl.innerHTML = `<b>${mutUnit.ability}:</b> ${mutUnit.abilityDesc}<br><i style="color:#f59e0b;">${mutUnit.desc}</i>`;

  showToast(`🧬 <b>SECRET MUTATION DISCOVERED!</b><br>${mutUnit.name} has awakened!`);
  openModal('mutation-discovery-modal');
}

export function handleBenchClick(idx) {
  if (state.isBattling) return;
  try { AudioEngine.tap(); } catch (e) {}

  if (state.selectedArtifactIdx !== null && state.bench[idx]) {
    tryEquipSelectedArtifact(state.bench[idx]);
    return;
  }

  if (state.selectedSource) {
    if (state.selectedSource.type === 'bench' && state.selectedSource.index === idx) {
      // Second tap / double click on selected unit opens inspection modal!
      if (state.bench[idx]) openInspectModal(state.bench[idx]);
      state.selectedSource = null;
    } else {
      moveOrMerge('bench', idx);
    }
  } else {
    if (state.bench[idx]) state.selectedSource = { type: 'bench', index: idx };
  }
  renderBench(state);
  renderBoard(state, checkSecretFusion);
  syncUI();
}

export function handleBoardClick(r, c) {
  if (state.isBattling) return;
  try { AudioEngine.tap(); } catch (e) {}

  if (r < 2) {
    if (state.board[r][c]) openInspectModal(state.board[r][c]);
    return;
  }

  if (state.selectedArtifactIdx !== null && state.board[r][c]) {
    tryEquipSelectedArtifact(state.board[r][c]);
    return;
  }

  if (state.selectedSource) {
    if (state.selectedSource.type === 'board' && state.selectedSource.index.r === r && state.selectedSource.index.c === c) {
      // Second tap / double click on selected unit opens inspection modal!
      if (state.board[r][c]) openInspectModal(state.board[r][c]);
      state.selectedSource = null;
    } else {
      moveOrMerge('board', { r, c });
    }
  } else {
    if (state.board[r][c]) state.selectedSource = { type: 'board', index: { r, c } };
  }
  renderBench(state);
  renderBoard(state, checkSecretFusion);
  syncUI();
}

export function moveOrMerge(destType, destCoord) {
  let sourceUnit = state.selectedSource.type === 'bench'
    ? state.bench[state.selectedSource.index]
    : state.board[state.selectedSource.index.r][state.selectedSource.index.c];

  let destUnit = destType === 'bench'
    ? state.bench[destCoord]
    : state.board[destCoord.r][destCoord.c];

  if (!sourceUnit) { state.selectedSource = null; return; }

  if (state.selectedSource.type === 'bench' && destType === 'board' && !destUnit) {
    const currentDeployed = getDeployedCount(state.board);
    const maxCap = getMaxDeployCap();
    if (currentDeployed >= maxCap) {
      showToast(`⚠️ <b>DEPLOYMENT FULL (${maxCap}/${maxCap})</b><br>Gain AXP to expand team size.`);
      state.selectedSource = null;
      renderBench(state);
      renderBoard(state, checkSecretFusion);
      return;
    }
  }

  const secretEvolve = checkSecretFusion(sourceUnit, destUnit);
  if (secretEvolve) {
    const speciesCategory = secretEvolve.name.includes('Mech') ? 'Mech' : (secretEvolve.name.includes('Dusk') ? 'Dusk' : 'Dawn');
    const evolvedUnit = {
      ...secretEvolve,
      species: speciesCategory,
      type: speciesCategory,
      maxHp: secretEvolve.hp,
      currentHp: secretEvolve.hp,
      shield: 0,
      mana: 0,
      maxMana: 100,
      atk: secretEvolve.atk,
      level: 3,
      tier: 5,
      img: 'https://axiecdn.axieinfinity.com/axies/10549077/axie/axie-full-transparent.png',
      equippedArtifact: sourceUnit.equippedArtifact || destUnit.equippedArtifact || null,
      partLabel: `${secretEvolve.part} ★★★`,
      team: 'player'
    };

    if (destType === 'bench') state.bench[destCoord] = evolvedUnit;
    else state.board[destCoord.r][destCoord.c] = evolvedUnit;

    if (state.selectedSource.type === 'bench') state.bench[state.selectedSource.index] = null;
    else state.board[state.selectedSource.index.r][state.selectedSource.index.c] = null;

    state.discoveredFusions[speciesCategory] = true;
    addAXP(200, "Secret Mutation Discovered!");
    openMutationDiscoveryShowcase(evolvedUnit);

    state.selectedSource = null;
    renderBench(state);
    renderBoard(state, checkSecretFusion);
    syncUI();
    return;
  }

  if (!destUnit) {
    if (destType === 'bench') state.bench[destCoord] = sourceUnit;
    else state.board[destCoord.r][destCoord.c] = sourceUnit;

    if (state.selectedSource.type === 'bench') state.bench[state.selectedSource.index] = null;
    else state.board[state.selectedSource.index.r][state.selectedSource.index.c] = null;
    state.selectedSource = null;
  } else {
    if (state.selectedSource.type === 'bench' && destType === 'bench') {
      state.bench[state.selectedSource.index] = destUnit; state.bench[destCoord] = sourceUnit;
    } else if (state.selectedSource.type === 'board' && destType === 'board') {
      state.board[state.selectedSource.index.r][state.selectedSource.index.c] = destUnit; state.board[destCoord.r][destCoord.c] = sourceUnit;
    } else if (state.selectedSource.type === 'bench' && destType === 'board') {
      state.bench[state.selectedSource.index] = destUnit; state.board[destCoord.r][destCoord.c] = sourceUnit;
    } else if (state.selectedSource.type === 'board' && destType === 'bench') {
      state.board[state.selectedSource.index.r][state.selectedSource.index.c] = destUnit; state.bench[destCoord] = sourceUnit;
    }
    state.selectedSource = null;
  }

  renderBench(state);
  renderBoard(state, checkSecretFusion);
  syncUI();
  runAutoUpgradeEngine();
}

export function sellSelected() {
  if (!state.selectedSource || state.isBattling) return;
  let target = state.selectedSource.type === 'bench' ? state.bench[state.selectedSource.index] : state.board[state.selectedSource.index.r][state.selectedSource.index.c];

  if (target && target.equippedArtifact) {
    addArtifactToStash(target.equippedArtifact);
    showToast(`Recovered <b>${target.equippedArtifact.name}</b> back to stash!`);
  }

  if (state.selectedSource.type === 'bench') state.bench[state.selectedSource.index] = null;
  else state.board[state.selectedSource.index.r][state.selectedSource.index.c] = null;

  state.gold += 2;
  state.selectedSource = null;
  try { AudioEngine.buy(); } catch (e) {}
  showToast("Sold for +2g");
  renderBench(state);
  renderBoard(state, checkSecretFusion);
  renderArtifactStash(state);
  renderShop(state);
  syncUI();
}

export function addArtifactToStash(art) {
  const emptyIdx = state.artifactInventory.findIndex(s => s === null);
  if (emptyIdx !== -1) {
    state.artifactInventory[emptyIdx] = art;
    renderArtifactStash(state);
    return true;
  }
  showToast("⚠️ Artifact Stash Full (2 Max)!");
  return false;
}

export function chooseArtifact(art) {
  closeModal('artifact-modal');
  if (addArtifactToStash(art)) {
    try { AudioEngine.evolve(); } catch (e) {}
    showToast(`Stored <b>${art.name}</b> in Artifact Stash!<br>Tap charm then tap Axie to equip.`);
  }
}

export function handleArtifactSlotClick(idx) {
  if (state.isBattling) return;
  try { AudioEngine.tap(); } catch (e) {}
  if (!state.artifactInventory[idx]) {
    state.selectedArtifactIdx = null;
    renderArtifactStash(state);
    return;
  }
  if (state.selectedArtifactIdx === idx) {
    state.selectedArtifactIdx = null;
  } else {
    state.selectedArtifactIdx = idx;
    showToast(`Selected <b>${state.artifactInventory[idx].name}</b>!<br>Tap an Axie to equip.`);
  }
  renderArtifactStash(state);
}

export function tryEquipSelectedArtifact(targetUnit) {
  if (state.selectedArtifactIdx === null || !state.artifactInventory[state.selectedArtifactIdx]) return false;

  const art = state.artifactInventory[state.selectedArtifactIdx];
  if (targetUnit.equippedArtifact) {
    const prev = targetUnit.equippedArtifact;
    targetUnit.equippedArtifact = art;
    state.artifactInventory[state.selectedArtifactIdx] = prev;
    showToast(`Swapped with <b>${prev.name}</b>!`);
  } else {
    targetUnit.equippedArtifact = art;
    state.artifactInventory[state.selectedArtifactIdx] = null;
    showToast(`Equipped <b>${art.name}</b> on ${targetUnit.name}!`);
  }

  state.selectedArtifactIdx = null;
  try { AudioEngine.evolve(); } catch (e) {}
  renderBoard(state, checkSecretFusion);
  renderBench(state);
  renderArtifactStash(state);
  return true;
}

export function toggleTraitHighlight(traitName) {
  try { AudioEngine.tap(); } catch (e) {}
  if (state.highlightedTrait === traitName) {
    state.highlightedTrait = null;
  } else {
    state.highlightedTrait = traitName;
    showToast(`Highlighting ${traitName} units!`);
  }
  renderBoard(state, checkSecretFusion);
  renderBench(state);
  syncUI();
}

export function syncUI() {
  updateUI(state, checkSecretFusion, toggleTraitHighlight);
}

export function renderAll() {
  renderShop(state);
  renderBench(state);
  renderBoard(state, checkSecretFusion);
  renderArtifactStash(state);
}

export function setupDelegatedEvents() {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  };

  bind('start-btn', () => {
    try { AudioEngine.init(); AudioEngine.buy(); } catch (e) {}
    const menu = document.getElementById('main-menu');
    if (menu) menu.style.display = 'none';
    openModal('commander-modal');
  });

  bind('close-mut-btn', () => {
    try { AudioEngine.tap(); } catch(e){}
    closeModal('mutation-discovery-modal');
  });

  bind('open-guide-btn', () => { try { AudioEngine.tap(); } catch(e){} openModal('guide-modal'); });
  bind('close-guide-btn', () => { try { AudioEngine.tap(); } catch(e){} closeModal('guide-modal'); });
  bind('open-log-btn', () => {
    try { AudioEngine.tap(); } catch(e){}
    renderDiscoveryLog(state.discoveredFusions);
    openModal('discovery-modal');
  });
  bind('close-discovery-btn', () => { try { AudioEngine.tap(); } catch(e){} closeModal('discovery-modal'); });
  bind('open-lobby-btn', () => { try { AudioEngine.tap(); } catch(e){} openModal('lobby-modal'); });
  bind('close-lobby-btn', () => { try { AudioEngine.tap(); } catch(e){} closeModal('lobby-modal'); });
  bind('close-inspect-btn', () => { try { AudioEngine.tap(); } catch(e){} closeModal('inspect-modal'); });

  bind('reroll-btn', rerollShop);
  bind('sell-btn', sellSelected);
  bind('battle-btn', () => {
    startBattle(state, {
      addAXP,
      updateUI: syncUI,
      renderAll,
      generateShop,
      renderArtifactStash: () => renderArtifactStash(state),
      chooseArtifact
    });
  });

  document.querySelectorAll('.modal-sheet').forEach(sheet => {
    sheet.addEventListener('click', (e) => e.stopPropagation());
  });

  document.querySelectorAll('.commander-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const cmd = card.getAttribute('data-cmd');
      if (cmd) {
        state.activeCommander = cmd;
        try { AudioEngine.evolve(); } catch (e) {}
        closeModal('commander-modal');
        generateShop();
        spawnEncounter(state);
        renderAll();
        syncUI();
        const names = { oak: 'Captain Oak (Bastion)', ronin: 'Ronin Shihan (Striker)', chimera: 'Chimera Alchemist (Breeder)' };
        showToast(`👑 <b>Commander Chosen:</b><br>${names[cmd]}`);
      }
    });
  });

  const arena = document.getElementById('arena');
  if (arena) {
    arena.addEventListener('click', (e) => {
      const cell = e.target.closest('.cell');
      if (cell) {
        e.stopPropagation();
        handleBoardClick(Number(cell.dataset.r), Number(cell.dataset.c));
      }
    });
  }

  const benchContainer = document.getElementById('bench-container');
  if (benchContainer) {
    benchContainer.addEventListener('click', (e) => {
      const slot = e.target.closest('.bench-slot');
      if (slot) {
        e.stopPropagation();
        handleBenchClick(Number(slot.dataset.idx));
      }
    });
  }

  const stash = document.getElementById('artifact-stash');
  if (stash) {
    stash.addEventListener('click', (e) => {
      const slot = e.target.closest('.artifact-slot');
      if (slot) {
        e.stopPropagation();
        handleArtifactSlotClick(Number(slot.dataset.art));
      }
    });
  }

  const shopContainer = document.getElementById('shop-container');
  if (shopContainer) {
    shopContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.shop-card');
      if (card) {
        e.stopPropagation();
        buyToBench(Number(card.dataset.shopIdx));
      }
    });
  }

  // Play again handlers
  const vicPlayBtn = document.getElementById('vic-play-btn');
  if (vicPlayBtn) vicPlayBtn.addEventListener('click', () => location.reload());
  const goPlayBtn = document.getElementById('go-play-btn');
  if (goPlayBtn) goPlayBtn.addEventListener('click', () => location.reload());

  // Global clear selection ONLY if clicking dead space
  document.addEventListener('click', () => {
    if (state.selectedSource || state.selectedArtifactIdx !== null) {
      state.selectedSource = null;
      state.selectedArtifactIdx = null;
      renderBench(state);
      renderBoard(state, checkSecretFusion);
      renderArtifactStash(state);
      syncUI();
    }
  });
}

let isInitialized = false;
export function init() {
  if (isInitialized) return;
  isInitialized = true;
  setupDelegatedEvents();
  renderAll();
  syncUI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
window.addEventListener('load', init);
