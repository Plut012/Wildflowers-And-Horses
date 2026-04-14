# CLAUDE.md

## Project

Pony Pastures — a cozy PWA pixel-art horse farm game. Vanilla JS + Canvas, no frameworks, no build step. Phases 1–5 complete.

## Dev Commands

- `python -m http.server 8080` — run locally
- Open `localhost:8080` in browser to play
- `node generate-icons.js` — regenerate PWA icons (placeholder PNGs, no npm needed)
- Open `generate-icons.html` in a browser for properly drawn icons

## Rules

- All game balance numbers go in `js/data.js` — one source of truth
- No frameworks, no bundlers, no npm. Vanilla JS with ES modules.
- Keep the file structure flat. One JS file per game system.
- Game state is a single object. Save/load goes through `js/save.js`.
- Pixel art rendered on Canvas. UI overlays (market, journal) are HTML/CSS.
- No timers, notifications, or punishment mechanics. This is a calm game.
- Day/night is cosmetic only (except Black Stallion perk).
- Test in Samsung Internet on Android — that's the target browser.
- Animation state for plots lives in `_plotAnims` (module-level in render.js). Call `triggerPlotAnim(index, type, extra)` from main.js.
- Tutorial hint is controlled by `state._showTutorial` (not persisted, resets on load if no save exists).
- Service worker cache version is `pony-pastures-v5` — bump on any file change.

## Architecture Notes (Phase 5)

**State structure (Phase 5):**
```
state.farm.plots[]         — array of land plots
  plot.id                  — plot index
  plot.gardenCount         — number of gardens (5, 10, 15, 20, or 25)
  plot.gardens[]           — array of garden objects (old "plot" objects)
    garden.index           — position within the plot
    garden.state           — PLOT_STATE: empty/planted/watered/ready
    garden.flowerId        — flower being grown
    garden.plantedAt       — timestamp when watered
    garden.growTime        — ms to full grow
    garden.waterTime       — ms after planting before watered stage
    garden.stage           — 0=seed, 1=sprout, 2=bloom
    garden.autoPlow        — timestamp of last auto-plow sparkle
state.farm.activePlot      — index of plot currently shown (zoomed in)
state.farm.viewMode        — 'plot' (zoomed in) or 'farm' (zoomed out)
```

**Garden layout:** Always 5 columns. 5 gardens = 1 row, 10 = 2 rows, up to 25 = 5x5.

**Zoom mechanic:** "Farm" button (top bar) zooms out; shows all plot tiles. Tap a tile to zoom in. The "+" tile buys a new plot. "Plot" button in farm view returns to active plot.

**Buy Garden button:** Visible when zoomed into a plot with fewer than 25 gardens. Costs: 50/100/200/400 coins per 5-garden batch.

**Migration:** `needsMigration(saved)` in save.js detects old Phase 1-4 saves (flat `garden.plots`) and `mergeState` in main.js wraps them in a single-plot farm.

**Rendering:**
- `computeLayout(canvasW, canvasH, gardenCount)` — layout for zoomed-in view, adapts to garden count
- `drawFarmView()` in render.js — zoomed-out view; `drawFarmTile()` + `drawBuyPlotTile()` for tiles
- Gardens use prairie-green base colors (not brown soil) — empty=fresh grass, planted=earthy, ready=lush

**Garden vs plot naming (Phase 5):**
- "Garden" = individual flower slot (what was called "plot" in phases 1-4)
- "Plot" or "land plot" = a purchasable piece of land containing 5-25 gardens

- `render.js` — `HORSE_SHAPES` table defines per-horse body shapes and markings. Add/change horse visuals there.
- `render.js` — Each flower type has a dedicated `draw*` function (drawDaisy, drawLavender, etc.) called from `drawBloom`.
- `render.js` — Campfire is drawn by `drawCampfire`, meadow flowers by `drawMeadowFlowers`.
- `generate-icons.js` + `generate-icons.html` — Two ways to regenerate icons if needed.
