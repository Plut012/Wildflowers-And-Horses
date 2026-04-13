# CLAUDE.md

## Project

Pony Pastures — a cozy PWA pixel-art horse farm game. Vanilla JS + Canvas, no frameworks, no build step. Phases 1–4 complete.

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
- Service worker cache version is `pony-pastures-v4` — bump on any file change.

## Architecture Notes (Phase 4)

- `render.js` — `HORSE_SHAPES` table defines per-horse body shapes and markings. Add/change horse visuals there.
- `render.js` — Each flower type has a dedicated `draw*` function (drawDaisy, drawLavender, etc.) called from `drawBloom`.
- `render.js` — Campfire is drawn by `drawCampfire`, meadow flowers by `drawMeadowFlowers`.
- `generate-icons.js` + `generate-icons.html` — Two ways to regenerate icons if needed.
