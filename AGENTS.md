# AGENTS.md

This repository is now a standalone Electron desktop pet. Keep edits centered on the existing window/theme/state pipeline and avoid reintroducing external hook or agent integrations.

## Project Overview

Clawd is a pixel desktop pet with two built-in themes (`Clawd`, `Calico`), cursor-follow idle eyes, a sleep/wake sequence, click reactions, Mini mode, autonomous random behaviors, and a settings panel for appearance/theme/shortcut customization.

## Common Commands

```bash
npm install
npm start
npm test
npm run build
npm run build:mac
npm run build:linux
npm run build:all
npm run create-theme
```

## Runtime Summary

- Main flow: `src/main.js` -> `src/state.js` -> IPC -> `src/renderer.js`
- Input flow: `src/hit-renderer.js` -> IPC -> `src/main.js`
- Idle/sleep/eye tracking loop: `src/tick.js`
- Mini mode: `src/mini.js`
- Theme loading and validation: `src/theme-loader.js`
- Settings persistence: `src/prefs.js` + `src/settings-controller.js`

## Core Files

| File | Responsibility |
|------|------|
| `src/main.js` | Electron lifecycle, windows, menus, autonomous behavior wiring |
| `src/state.js` | State machine, sleep/wake, oneshot timing, Mini mapping |
| `src/tick.js` | Cursor polling, eye tracking, idle timing, Mini hover peek |
| `src/renderer.js` | Visual animation swap and eye movement |
| `src/hit-renderer.js` | Click counting, drag handling, right-click menu trigger |
| `src/menu.js` | Tray and pet context menus |
| `src/theme-loader.js` | Theme discovery, capability checks, renderer config |
| `src/settings-controller.js` | Single writer for persisted settings |
| `src/prefs.js` | Settings schema and validation |

## Constraints

- Do not modify SVG animation assets unless explicitly asked.
- Keep eye tracking and drag handling behavior intact unless the task directly targets them.
- Route visible animation changes through the state machine; do not manipulate the DOM from the main process.
- Settings store remains the source of truth; write through `settings-controller.js`.
- Resource paths should continue using `path.join(__dirname, ...)`.

## Testing

- Automated tests use the Node test runner: `npm test`
- Current tests focus on autonomous behavior, standalone menus, prefs cleanup, shortcut config, and DND sleep behavior
- GUI validation is still manual for:
  - `npm start` startup
  - transparent window behavior
  - drag / Mini mode transitions
  - system tray interaction

## High-Risk Gotchas

- `hitWin.focusable = true` remains important for Windows drag/input stability.
- During `miniTransitioning`, avoid concurrent position updates that can race window movement.
- Keep the renderer cache-busting `?_t=` behavior for animated SVG reloads.
- Do Not Disturb should pause autonomous random behavior only; it should not force sleep or disable manual interactions.
