# Setup Guide

[Back to README](../../README.md)

## Local Run

```bash
npm install
npm start
```

That is all you need. Clawd now runs as a standalone desktop pet and no longer depends on Claude Code hooks, Codex logs, Cursor hooks, Gemini hooks, or any other external agent integration.

## Build

```bash
npm run build
npm run build:mac
npm run build:linux
```

## Behavior Overview

- Idle: Clawd follows your cursor with its eyes.
- Sleep: after 60 seconds without mouse movement, Clawd starts its sleep sequence.
- Wake: moving the mouse wakes Clawd up.
- Autonomous behavior: daytime every 2-5 minutes, late night every 10-20 minutes.
- Do Not Disturb: pauses only autonomous random behavior.

## Controls

- Single click: happy
- Double click: poke
- 4 rapid clicks: flail
- Right click: tease, Mini mode, Settings, Quit
- Tray: show/hide, tease, Mini mode, size, do-not-disturb, open-at-login, quit

## Themes

Clawd ships with built-in themes and still supports custom themes. Theme creation is unchanged; see [guide-theme-creation.md](guide-theme-creation.md).

## Platform Notes

- Windows: primary development target.
- macOS: source runs are supported; packaged builds may still need manual Gatekeeper approval if unsigned.
- Linux: source runs and packaged builds are supported; development mode still uses Electron sandbox workarounds where needed.
