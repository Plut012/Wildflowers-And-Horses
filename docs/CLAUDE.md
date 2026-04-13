# CLAUDE.md

## Project

Pony Pastures — a cozy PWA pixel-art horse farm game. Vanilla JS + Canvas, no frameworks, no build step.

## Dev Commands

- `python -m http.server 8080` — run locally
- Open `localhost:8080` in browser to play

## Rules

- All game balance numbers go in `js/data.js` — one source of truth
- No frameworks, no bundlers, no npm. Vanilla JS with ES modules.
- Keep the file structure flat. One JS file per game system.
- Game state is a single object. Save/load goes through `js/save.js`.
- Pixel art rendered on Canvas. UI overlays (market, journal) are HTML/CSS.
- No timers, notifications, or punishment mechanics. This is a calm game.
- Day/night is cosmetic only (except Black Stallion perk).
- Test in Samsung Internet on Android — that's the target browser.
