# Runtime Architecture

This repository now runs as a standalone desktop pet. There is no hook server, no agent registry, and no external event ingestion path.

## Main Flow

```text
AutonomousBehavior timer / user interaction
  -> src/main.js
  -> src/state.js
  -> IPC
  -> src/renderer.js
```

## Core Modules

- `src/main.js`
  - Electron app lifecycle
  - window creation
  - tray / context menus
  - settings wiring
  - autonomous behavior scheduling
- `src/state.js`
  - logical animation state machine
  - sleep / wake sequence
  - mini-mode state mapping
  - oneshot timing and auto-return
- `src/tick.js`
  - cursor polling
  - eye tracking
  - idle timing
  - Mini mode hover peek
- `src/renderer.js`
  - animation asset swapping
  - eye tracking transforms
  - click / drag reaction rendering
- `src/hit-renderer.js`
  - pointer capture
  - click counting
  - drag lifecycle

## Autonomous Behavior

`AutonomousBehavior` is driven from the main process and is responsible for:

- choosing the next random interval
- switching between daytime and late-night cadence
- suppressing autoplay while sleeping
- pausing and resuming under Do Not Disturb
- running transient happy / thinking / working / sweeping / carrying animations
- handling manual “tease” and single-click happy triggers

The main process still routes all visible state changes through `src/state.js`; it does not manipulate the DOM directly.

## What Was Removed

- HTTP `/state` and `/permission` server
- external hooks and plugin sync
- session tracking and terminal focus as runtime features
- agent registry and log monitors
- permission bubble runtime

## Window Model

The dual-window model remains:

- render window: visual-only, click-through
- hit window: pointer events, drag, clicks, right-click menu trigger

This preserves the mature drag behavior and transparent hit-testing fixes already in the project.
