# Axie Lunacia Fall - Tactical Discovery Auto-Battler

> **Axie Vibeathon 2026 Entry**  
> **One-Sentence Pitch:** A mobile-first, one-handed tactical auto-battler where players draft Axies, optimize interest economies, merge star tiers, and cross-breed opposing classes to unlock secret mutations in an 8-player arena against Titan Bosses.

---

## 🔗 Quick Links

- 🎮 **Play Online (Playable Link):** [https://axie-chess.vercel.app](https://axie-chess.vercel.app) *(Opens in new tab)*
- 📦 **GitHub Repository:** [https://github.com/ryanlarosa/axie-chess.git](https://github.com/ryanlarosa/axie-chess.git)
- 📋 **Full Submission Kit:** [SUBMISSION.md](file:///c:/Git%20Repos/axie-chess/SUBMISSION.md)

---

## 📖 Descriptions

### Short Description
**Axie Lunacia Fall** is a fast-paced, mobile-optimized tactical auto-battler built for vertical, one-handed play. Draft authentic Axie archetypes, manage interest economy, merge duplicates into 2-star and 3-star powerhouses, and discover secret class cross-breeding mutations (Mech, Dusk, Dawn). Face off against 7 AI rivals, defeat Titan Bosses on waves 5 & 10 to earn game-changing Runic Artifacts, and become the last survivor in the Lunacian Arena!

### Full Description
In **Axie Lunacia Fall**, players step into the arena of Lunacia in an 8-participant battle royale tournament. Inspired by classic auto-chess and autobattlers (Teamfight Tactics, Hearthstone Battlegrounds) but reimagined specifically for rapid mobile sessions, the game combines deep tactical depth with streamlined, frictionless touch controls.

Position tanky Vanguards on the frontline to absorb damage while backline Slashers and Marksmen unleash ranged support barrages and deadly critical strikes. Manage interest gold (+1g per 10g banked) to level up your squad capacity and tier access. Discover secret cross-species mutations by fusing opposite ★★ units together, choose active Commander Boons, and conquer towering Titan Bosses to claim legendary Runic Artifacts.

---

## 🕹️ Controls & First-Play Instructions

| Action | Control (Desktop & Mobile) |
| :--- | :--- |
| **Draft Axie** | Tap any Axie card in the bottom 4-card shop to recruit to your bench (costs 2g–5g). |
| **Deploy / Move** | Tap an Axie on your bench or board, then tap a valid tile on your half of the board (Rows 2–3) to place or swap. |
| **Inspect Axie** | **Double-tap / click** any Axie card on the board, bench, or shop to view full stats, abilities, and lore. |
| **Reroll Shop** | Tap **🔄 2g** to refresh the shop offering based on your level odds. |
| **Sell Unit** | Tap an Axie to select it, then tap the red **SELL (+Gold)** button to refund gold. |
| **Equip Artifact** | Defeat a Boss on Round 5/10, pick an artifact into your 2-slot stash, select the artifact, and tap any Axie to equip it. |
| **Trigger Combat** | Tap the green **CLASH** button when your squad is ready! |

### First-Play Beginner's Guide:
1. **Round 1:** Choose your Commander Boon (*Captain Oak* for defense, *Ronin Shihan* for crits, or *Chimera Alchemist* for leveling/fusions).
2. **Draft:** Buy 1 or 2 Axies from the shop. Place a **Vanguard** (Plant/Reptile) in the front row and a **Marksman/Slasher** (Bird/Aqua/Beast) in the back row.
3. **Synergy:** Match 2 of the same Origin or Role to activate team synergies (e.g., +50 Vanguard Shield, +18 Marksman ATK, +35% Slasher Crit).
4. **Economy:** Try to keep at least 10–30 gold in reserve to maximize your +1g to +3g passive interest every round.
5. **Breeding Mutation:** Once you have two ★★ units of opposite species, drag them together to unlock a secret Mech, Dusk, or Dawn hybrid!

---

## 🤖 AI Tools Used & Fit with "Axie Core"

### AI Tools Disclosure
- **Google Antigravity / Gemini 2.0 Pro:** Used for architectural design, procedural Web Audio synthesizer programming, responsive mobile 100dvh CSS styling, balance curve simulation, and zero-build vanilla ES modules refactoring.
- **Axie Infinity CDN Assets:** Official Axie Infinity render assets and vector body part aesthetics.

### How Axie Lunacia Fall Fits "Axie Core"
1. **Faithful Lore & Taxonomy:**
   - Incorporates the core Axie Infinity six primary classes (*Plant, Beast, Aqua, Bird, Bug, Reptile*) alongside the canonical secret tri-classes (*Mech, Dusk, Dawn*).
   - Features signature body parts and ability behaviors matching Axie identity (e.g., *Pumpkin Oak Shield Wall*, *Ronin Nut Single Combat*, *Nimo Fin Tail Slap*, *Kestrel Wing Air Superiority*).
2. **Breeding & Genetics Philosophy:**
   - Transposes the core Axie breeding mechanic into an active, tactile auto-battler discovery loop. Merging duplicate genes yields star ascensions, while cross-breeding opposing classes discovers mutations.
3. **Web3 & Ronin-Ready Mobile Ergonomics:**
   - Zero-build architecture makes it seamlessly embeddable in mobile dApp browsers, Ronin Waypoint, or Telegram/Farcaster mini-apps without heavy framework bundles or download gates.
4. **Player Progression & AXP:**
   - Incorporates Axie Experience Points (AXP) as the player leveling mechanic, driving army cap increases and high-tier Axie access.

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
  ├── SUBMISSION.md           # Official Vibeathon Submission Kit
  └── README.md               # Repository documentation
  ```
