# Architecture

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Rendering | HTML5 Canvas | Pixel art, animations, full visual control |
| Logic | Vanilla JS (ES modules) | No build step, no framework overhead |
| UI Overlay | HTML/CSS | Market, journal, stable — layered over canvas |
| Save Data | localStorage | Instant load, no server, persists across sessions |
| Deployment | PWA via Termux:Boot | Runs locally on localhost, launches like a native app |

No bundler. No transpiler. Open `index.html` and play.

## Repo Structure

```
pony-pastures/
├── index.html              # Entry point, canvas + UI overlay
├── manifest.json           # PWA manifest (standalone, fullscreen)
├── sw.js                   # Service worker (offline caching)
├── css/
│   └── style.css           # UI overlay styles
├── js/
│   ├── main.js             # Boot, game loop, state init
│   ├── garden.js            # Plot grid, planting, watering, harvesting
│   ├── horses.js           # Horse visits, trust, taming, leveling
│   ├── market.js           # Buy seeds, sell flowers
│   ├── journal.js          # Discovery log
│   ├── render.js           # Canvas drawing, animations, day/night
│   ├── save.js             # localStorage read/write
│   └── data.js             # Flower + horse definitions, balance numbers
├── assets/
│   ├── sprites/            # Pixel art spritesheets
│   └── audio/              # Ambient sounds (optional)
├── termux/
│   └── start-pony-pastures.sh  # Termux:Boot startup script
├── overview.md
├── architecture.md
├── README.md
├── CLAUDE.md
└── .gitignore
```

Flat where possible. `js/` has one file per system — no nested folders, no util directories.

## Data Flow

```
Game State (single object in memory)
  ├── garden: { plots: [...], season: null }
  ├── horses: { wild: [...], tamed: [...] }
  ├── inventory: { coins, seeds: {...}, flowers: {...} }
  ├── journal: { entries: [...] }
  └── time: { cycle: dayOrNight, elapsed }

On every tick:
  1. Update timers (flower growth, day/night cycle)
  2. Check horse visit logic (spawn/despawn wild visitors)
  3. Apply passive horse bonuses
  4. Render frame

On user tap:
  1. Hit-test: what did they tap? (plot, horse, UI button)
  2. Execute action (plant, water, harvest, feed, buy, sell)
  3. Update state
  4. Save to localStorage (debounced)
  5. Render
```

## Day/Night Cycle

Cosmetic palette shift on a gentle timer. Day is warm gold/green. Night washes to deep blue lit by campfire orange. The transition is slow and ambient — maybe 3-5 minutes per full cycle. Night feels like a cozy pause, not a mechanic.

The Black Stallion's perk (bonus coins at night) is the one exception where time-of-day touches gameplay.

## PWA Setup

**manifest.json:**
- `display: "standalone"` — no browser chrome
- `start_url: "/"` — loads index.html
- `theme_color` / `background_color` — warm earth tones
- Icon set for home screen

**Service Worker (sw.js):**
- Cache all assets on install
- Serve from cache first (offline-capable)
- Update cache on new version

**Termux:Boot deployment:**
```bash
# ~/.termux/boot/start-pony-pastures.sh
#!/bin/bash
termux-wake-lock
cd ~/pony-pastures
python -m http.server 8080 &
```

She adds `localhost:8080` to home screen once via Samsung Internet → "Add to Home Screen." After that, it's an app icon. Termux:Boot ensures the server starts on device boot.

## Game Balance Levers

All balance numbers live in `data.js` — one file to tune everything:

- Flower grow times (seconds)
- Flower sell prices
- Seed costs
- Horse trust thresholds (feeds to tame)
- Horse visit frequency
- Perk base values and scaling per level
- Day/night cycle duration

## MVP Plan

### Phase 1 — The Garden ✓ COMPLETE
Get the core tapping loop feeling good.
- Canvas rendering with warm pixel-art palette
- 4x3 plot grid, tap to plant/water/harvest
- 3-4 flower types with different grow times
- Coin economy: sell flowers, buy seeds
- Market UI overlay
- Day/night palette cycle (cosmetic)
- localStorage save/load

**Done when:** You can sit and tap-farm flowers for 10 minutes and it feels satisfying.

### Phase 2 — The Horses ✓ COMPLETE
Add the soul of the game.
- Wild horse visits (random, weighted by flowers in inventory) — `js/horses.js`
- Tap any canvas area when a horse is present to open the feed picker
- Trust mechanic: right flower = trust up, wrong = horse wanders off gently
- Horse taming at per-horse trust threshold (4–14 feeds depending on rarity)
- Stable view showing tamed horses with favorite flower and trust count
- Horse Whisper Journal: subtle log of what you've tried per horse
- 8 horses defined in `js/data.js` with favorite flowers, thresholds, and canvas colors
- Pixel-art horse rendering on canvas near the fence — scaled for screen size
- Unicorn horn on Starlight Unicorn
- Happy/shy reaction bubble on feeding
- Floating text feedback on tame/like/wander events
- Fence rendered along the top of the garden area
- Save system extended to persist horse state (tamed list, trust counts, journal entries)

**Files added/changed:**
- `js/data.js` — added HORSES, HORSE_LIST, horse visit balance constants
- `js/horses.js` — new: visit logic, trust, taming
- `js/journal.js` — new: journal + stable overlay logic
- `js/render.js` — added drawFence, drawHorse, drawWildHorse, drawUnicornHorn
- `js/save.js` — extended to persist horses + journal
- `js/main.js` — wired horse tick, feed picker, horse floating texts
- `index.html` — added top button row, feed/stable/journal overlays
- `css/style.css` — styles for new overlays

**Done when:** You've discovered a horse's favorite flower through experimentation and tamed it. It felt magical.

### Phase 3 — The Infinity Loop ✓ COMPLETE
Add the cookie-clicker depth.
- Passive horse perks activate on tame
- Perk leveling: feed tamed horses to level up their bonus
- All 8 horses and 8 flowers balanced and in game
- Visual progression: farm looks richer as bonuses stack
- Perk effects visible (auto-plowed plots, sparkles, gold glow, grow tint)

**Perks implemented:**
- Chestnut Mare (Daisy) — Auto-Plow: plows N empty plots after each harvest
- Appaloosa (Clover) — Market Eye: flowers sell for +5% per level more
- Golden Palomino (Lavender) — Golden Touch: chance to double harvest (4% per level, cap 80%)
- Paint Horse (Rosehip) — Swift Growth: flowers grow faster (3% per level, cap 75%)
- Black Stallion (Bluebell) — Night Bounty: bonus coins per flower sold at night (+3 per level)
- Frost Pony (Sunflower) — Frost Seeds: chance for free seed on harvest (6% per level, cap 90%)
- Shadow Runner (Marigold) — Hidden Coins: random bonus coins on harvest (max 4× level)
- Starlight Unicorn (Moonpetal) — Star Blessing: global coin multiplier (×(1 + 0.1× level))

**Perk leveling:** Tamed horses can revisit (30% of visits are tamed horses). Feeding a tamed horse its favorite flower levels up its perk. The feed picker shows current perk level and "feed X to level up" hint.

**Visual feedback:**
- Paint Horse: gentle green shimmer on watered plots
- Golden Palomino: gold glow on ready-to-harvest plots
- Chestnut Mare: sparkle flash on auto-plowed plots
- Floating text on harvest: perk triggers shown (+N coins!, double harvest, free seed, auto-plowed)

**Stable overlay:** Shows perk name, level badge, current effect description, and "feed X to level up" hint for each tamed horse.

**Files changed:**
- `js/data.js` — added 4 new flowers (rosehip, bluebell, marigold, moonpetal), updated horse favorite flowers for uniqueness, added PERKS export with all 8 perk definitions
- `js/horses.js` — added perkLevels to state, tamed-horse revisit logic in pickVisitor, perk level-up branch in feedHorse, isTamed/getPerkLevel helpers
- `js/garden.js` — added harvestPlotWithPerks (applies Palomino, Frost Pony, Shadow Runner, Chestnut Mare), Paint Horse grow speed in tickGarden
- `js/market.js` — applies Appaloosa sell bonus, Black Stallion night bonus, Starlight Unicorn global multiplier in sellFlowers
- `js/render.js` — drawPlots passes horses, perk visual effects in drawSinglePlot
- `js/journal.js` — stable overlay shows perk level, description, and level-up hint
- `js/save.js` — perkLevels persisted in save
- `js/main.js` — uses harvestPlotWithPerks, passes horses to tickGarden, handles leveledUp result in doFeedHorse, HORSES/PERKS imported for feed picker hint
- `css/style.css` — stable perk row styles added

**Done when:** Opening the app after a break and seeing your passive farm humming feels warm and rewarding.

### Phase 4 — Polish ✓ COMPLETE
Make it feel like a gift.

**Visual improvements:**
- All 8 flowers have distinct pixel-art bloom shapes: daisy (8-petal), lavender (spike), sunflower (large rays + dark center), clover (3-lobe), rosehip (5-petal rose), bluebell (hanging bells), marigold (dense layered), moonpetal (6-petal with glow)
- All 8 horses have distinct character: body shapes, markings/spots/patches, hoof colors, mane widths (via HORSE_SHAPES table in render.js)
- Campfire element at night: logs, layered flames, sparks floating up, warm orange ground glow
- Meadow wildflowers in the background grass strip (bobbing gently)
- Better fence: rail highlight, post caps, shadow
- Sky gradient (day warm, night deep blue)
- Twinkling stars at night

**Animations:**
- Planting: seed drops into soil (triggerPlotAnim)
- Harvest: 8-particle color burst (triggerPlotAnim with flowerId stored)
- Grow stages: seed small, sprout scaled, bloom full
- Harvest sparkle changed to cross-shape; "needs water" drip animates
- Floating texts: bouncy scale pop on spawn, ease upward, color-coded (gold for coins, green for seeds)
- Horse reaction bubble: bounce offset on happy reactions
- Unicorn horn: animated sparkle orbit + spiral stripe

**UI polish:**
- All close buttons and action buttons have min-height 40-48px (comfortable touch targets)
- Seed buttons improved: active glow, scale-down tap feedback
- Feed buttons larger padding (48px min-height)
- Top buttons: larger padding, subtle drop shadow

**Tutorial:**
- On very first play (no save data), a pulsing golden arrow + "Tap a plot to plant!" hint appears above the first plot. Dismissed on first plant or harvest.

**PWA icons:**
- `assets/icon-192.png` and `assets/icon-512.png` generated (solid warm-brown placeholder)
- `generate-icons.js` — Node script to regenerate icons (uses canvas npm if available, else writes valid placeholder PNGs)
- `generate-icons.html` — Browser page for generating proper drawn icons without npm

**Service worker:**
- Updated to `pony-pastures-v4`, now caches `horses.js` and `journal.js` which were missing

**Balance tuning:**
- Starting coins: 30 → 40; starting seeds: 3 daisy → 4 daisy + 2 clover
- Daisy seed cost: 5 → 4 (more accessible)
- Moonpetal sell price: 65 → 70 (more rewarding for long grow time)
- Grow times tweaked slightly for better pacing

**Files changed:**
- `js/render.js` — major rewrite: distinct flowers, horse shapes, campfire, meadow, animations, tutorial hint
- `js/main.js` — triggerPlotAnim calls, bouncy floating text, tutorial flag, color-coded texts
- `js/data.js` — balance tuning (starting coins, seed costs, grow times)
- `sw.js` — cache version bump to v4, added horses.js + journal.js
- `css/style.css` — touch targets, button feedback, seed button active glow
- `assets/icon-192.png` — generated placeholder PWA icon
- `assets/icon-512.png` — generated placeholder PWA icon
- `generate-icons.js` — icon generation script (new)
- `generate-icons.html` — browser icon generator (new)

**Done when:** You'd be proud to hand her the phone.

## Save System

Single JSON blob in localStorage under `pony-pastures-save`. Saved on every meaningful action (debounced to ~1s). Loaded on boot. No cloud sync — it lives on her phone.

Save includes: garden state, inventory, horse trust levels, horse perk levels, journal entries, total playtime.
