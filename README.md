# Axie Lunacia Fall - Tactical Discovery Auto-Battler

> **Axie Vibeathon 2026 Entry**  
> Mobile-First One-Handed Tactical Auto-Battler built with Vanilla Web Technologies (ES Modules, Zero-Build).

---

## 🌟 Game Overview

**Axie Lunacia Fall** is a fast-paced, one-handed portrait auto-battler set in the Axie Infinity universe. Players draft Axies, manage a high-interest economy, position their squad on a tactical 3x4 grid, merge duplicates, and discover secret class cross-breeding mutations (Mech, Dusk, Dawn) to conquer 7 AI rivals and Titan Bosses.

---

## 🎮 Core Mechanics

1. **3-Star Merge Engine:**
   - 3 identical 1-Star (★) units automatically fuse into a 2-Star (★★) unit.
   - 3 identical 2-Star (★★) units automatically fuse into a 3-Star (★★★) unit with amplified stats and scaling abilities.
2. **Tactile Secret Breeding Mutations:**
   - Combine two different ★★ units of opposing species by dragging/selecting them together to breed secret mutation classes (**Mech**, **Dusk**, or **Dawn**).
   - Each secret class features distinct archetype variants, unique abilities, and high-impact traits.
3. **Player Level & Economy:**
   - Bank gold to earn **+1g interest per 10g** (up to +3g per round).
   - Progression through AXP unlocks deployment army capacity ($\min(6, \text{Level} + 1)$) and higher Axie tiers (T1–T5).
4. **Active Commander Boons (Round 1 Choice):**
   - **Captain Oak (Bastion):** Frontline units gain +40 Shield; loss damage reduced by 3.
   - **Ronin Shihan (Striker):** First battle crit deals +50% extra damage and awards +1 Gold.
   - **Chimera Alchemist (Breeder):** Merges grant +25 bonus AXP; higher-tier Axies unlock 1 level earlier.
5. **Combat Engine (Mana & Ultimates):**
   - Units start at 0/100 Mana, generating +25 on attack and +15 when struck.
   - At 100 Mana, units unleash active ultimates with custom procedural sound and visual effects.
   - Shields absorb incoming damage before health depletes.
6. **Boss Encounters & Runic Artifacts:**
   - Defeating Titan bosses on waves 5 and 10 rewards powerful artifacts (e.g. *Ronin Whetstone*, *Rose Quartz Bark*, *Star Shell Scope*) stored in a dedicated 2-slot stash for carry equipping.
7. **Procedural Web Audio:**
   - Built-in real-time Web Audio synthesizer generates dynamic retro audio effects (attacks, crits, level-ups, ultimates, purchases) without external audio file dependencies.

---

## 🛠️ Architecture & Tech Stack

- **Zero-Build Vanilla ES Modules:** Drag-and-drop deployable directly to GitHub Pages, Vercel, or Netlify.
- **Project Structure:**
  ```text
  axie-chess/
  ├── index.html              # Semantic HTML markup
  ├── css/
  │   └── style.css           # Glassmorphism, 100dvh layout, safe-area-insets, pointer-events locks
  ├── src/
  │   ├── config.js           # 20-Axie roster, 3-class mutation tables, boss data, shop odds
  │   ├── audio.js            # Procedural Web Audio synthesizer module
  │   ├── ui.js               # DOM rendering (board, bench, shop, modals, toasts, tooltips)
  │   ├── battle.js           # Tick-based combat loop, mana math, targeting, VFX triggers
  │   └── main.js             # State initialization, event delegation, drag/drop, upgrade logic
  └── README.md
  ```

---

## 📱 Mobile UI/UX Highlights
- **100dvh Responsive Layout:** Adapts to mobile browser address bars and notches via `env(safe-area-inset-*)`.
- **Event Delegation Architecture:** Static parent container delegation with `e.target.closest()` and pointer-events locks on child nodes to eliminate tap delays and node detachment race conditions.
- **Clean Tile Readability:** Compact card footer preventing text overlaps, with canonical Axie CDN sprite scaling (`max-height: 38px` board, `26px` bench).
- **Strict Modal Isolation:** Fully suppressed background interactions when sheets/overlays are closed.
