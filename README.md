# Pony Pastures

A cozy pixel-art horse farm for your pocket. Grow wildflowers, earn the trust of wild horses, and watch your little farm flourish.

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

## Docs

- [Game Vision](docs/overview.md) — what Pony Pastures is and feels like
- [Architecture](docs/architecture.md) — technical plan and file structure
- [Dev Notes](docs/CLAUDE.md) — rules and conventions for development
