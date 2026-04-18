# Pony Pastures

A cozy pixel-art horse farm for your pocket. Grow wildflowers, earn the trust of wild horses, and watch your little farm flourish.

8 flowers. 8 horses. A warm little world you tend at your own pace.

## Play

Open `localhost:8080` in Samsung Internet and tap "Add to Home Screen."

## Dev

```bash
cd Wildflowers-And-Horses
python -m http.server 8080
```

Open `localhost:8080` in your browser.

## Setup (Termux)

1. Install [Termux:Boot](https://f-droid.org/packages/com.termux.boot/)
2. Copy `termux/start-pony-pastures.sh` to `~/.termux/boot/`
3. Reboot — the server starts automatically
4. Add `localhost:8080` to home screen once

## Icons

PWA icons live at `assets/icon-192.png` and `assets/icon-512.png`.

To regenerate: `node generate-icons.js` (creates warm-color placeholder PNGs)
For proper drawn icons: open `generate-icons.html` in any browser, click Save.

## Showcase

- [showcase.html](showcase.html) — animated feature showcase (open in browser)

## Docs

- [Game Vision](docs/overview.md) — what Pony Pastures is and feels like
- [Architecture](docs/architecture.md) — technical plan and phase history
- [Dev Notes](docs/CLAUDE.md) — rules, conventions, and architecture notes
