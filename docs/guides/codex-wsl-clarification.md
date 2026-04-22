# Codex + WSL Clarification

Last verified: April 19, 2026

This note separates three questions that are easy to conflate:

1. Whether OpenAI officially supports running Codex in WSL.
2. Whether OpenAI currently supports Codex hooks on Windows.
3. Whether Clawd can currently auto-detect Codex sessions that live inside WSL.

Those answers are not the same. Most confusion comes from mixing the official Codex product support story with Clawd's current integration boundaries.

## TL;DR

- OpenAI officially supports running Codex in WSL2.
- OpenAI's current Hooks documentation still says Codex hooks are temporarily disabled on Windows.
- Clawd currently integrates with Codex by polling `~/.codex/sessions` JSONL logs, not by using Codex hooks.
- When Clawd runs on Windows while Codex runs inside WSL with the default Linux home directory, Clawd does not automatically see `/home/<user>/.codex/sessions`.
- So "Codex does not support WSL" is inaccurate. The more accurate statement is: "Codex officially supports WSL2, but Clawd does not currently auto-discover Codex sessions that stay in WSL's separate Linux home, and our docs did not explain that boundary clearly enough."

## 1. OpenAI's current official position

### Codex officially supports WSL2

OpenAI's Windows documentation for Codex includes a dedicated WSL section and explicit instructions for installing and running Codex CLI inside WSL2:

- <https://developers.openai.com/codex/windows>

That page includes:

- a `Windows Subsystem for Linux` section
- a `Use Codex CLI with WSL` section
- explicit steps for `wsl --install`, installing Node.js inside WSL, `npm i -g @openai/codex`, and then running `codex`

At the product level, this means "Codex supports WSL2" is true.

### WSL1 is no longer supported

OpenAI's Windows documentation also states:

- WSL1 was supported through Codex `0.114`
- starting in Codex `0.115`, the Linux sandbox moved to `bubblewrap`, so WSL1 is no longer supported

References:

- <https://developers.openai.com/codex/windows>
- <https://developers.openai.com/codex/app/windows>

So the precise statement is "supports WSL2", not just "supports WSL".

### Codex hooks are still disabled on Windows

OpenAI's Hooks documentation currently says:

- hooks are experimental
- Windows support is temporarily disabled
- hooks are currently disabled on Windows

Reference:

- <https://developers.openai.com/codex/hooks>

This is the key reason Clawd does not treat Codex on Windows the same way it treats hook-based agents like Claude Code.

### WSL and Windows do not share `.codex` by default

OpenAI's Windows app documentation also explains that:

- the Windows app uses `%USERPROFILE%\.codex`
- Codex CLI inside WSL uses Linux `~/.codex` by default
- as a result, configuration, cached auth, and session history are not shared automatically

OpenAI documents this sharing option:

```bash
export CODEX_HOME=/mnt/c/Users/<windows-user>/.codex
```

Reference:

- <https://developers.openai.com/codex/app/windows>

That matters because it confirms that a default WSL Codex session writes into Linux home unless the user explicitly changes `CODEX_HOME`.

## 2. Clawd's current implementation

### Clawd uses JSONL polling for Codex, not hooks

In this repository, Codex integration is configured in [`agents/codex.js`](../../agents/codex.js):

- `eventSource: "log-poll"`
- `sessionDir: "~/.codex/sessions"`

The monitor implementation is in [`agents/codex-log-monitor.js`](../../agents/codex-log-monitor.js).

That monitor expands `~` using the current process's own `os.homedir()`. In practice:

- if Clawd runs on Windows, it polls `C:\Users\<user>\.codex\sessions`
- if Clawd runs on Linux, it polls `/home/<user>/.codex/sessions`

So a Windows-hosted Clawd does not automatically poll `/home/<user>/.codex/sessions` inside WSL.

### Clawd currently has no dedicated "Codex on WSL" auto-discovery path

The current main process starts the Codex monitor with that default config in [`src/main.js`](../../src/main.js). There is no user-facing WSL session directory setting, and no default `\\wsl$\...` path scan.

That means:

- `Codex native on Windows + Clawd on Windows`: works out of the box
- `Codex in WSL2 + Clawd on Windows + default Linux home`: does not work by default
- `Codex in WSL2 + shared Windows Codex home via CODEX_HOME`: inferred to be workable, because both sides would then point at the same session directory

The last point is an inference from OpenAI's documented `CODEX_HOME` sharing flow plus Clawd's current polling behavior.

### Clawd already has a remote-side monitor pattern, but not a WSL-native one

This repo includes [`hooks/codex-remote-monitor.js`](../../hooks/codex-remote-monitor.js), which polls `~/.codex/sessions` on the other side and POSTs state changes back to local Clawd.

Today that script is documented for remote SSH scenarios, not as an out-of-the-box WSL path.

So the repo already contains a "logs live somewhere else, send states back" pattern, but that is not the same as automatic WSL discovery in the desktop app.

## 3. Why the current docs are easy to misread

### The README wording is broader than the current Codex-on-WSL reality

The current README says:

- `Claude Code and Codex CLI work out of the box`
- the setup guide also covers `remote SSH, WSL, and platform-specific notes`

Reference:

- [`README.md`](../../README.md)

That wording is reasonable for many cases, but it does not distinguish between:

- Codex running natively on Windows
- Codex running inside WSL2 while keeping a separate Linux home

### The WSL section in the setup guide mainly discusses Claude Code

The existing WSL section in [`docs/guides/setup-guide.md`](./setup-guide.md) primarily explains:

- running Claude Code inside WSL
- copying hook files into WSL
- registering Claude hooks inside WSL

By contrast, Codex appears mainly in the remote SSH section via `codex-remote-monitor.js`.

So the docs do mention WSL, but they do not clearly spell out the support boundary for `Codex + WSL`.

## 4. The most accurate current conclusion

As of April 19, 2026:

1. OpenAI officially supports Codex in WSL2.
2. OpenAI still documents Codex hooks as disabled on Windows.
3. Clawd therefore uses JSONL polling for Codex on Windows instead of hooks.
4. Clawd currently polls the host machine's own `~/.codex/sessions`.
5. So if Codex runs inside WSL2 and still uses Linux `~/.codex`, Clawd does not auto-detect those sessions by default.
6. The current documentation problem is not "WSL is never mentioned". The problem is that `Codex + WSL` boundaries were not explained explicitly enough.

## 5. Suggested external wording

If you need one concise explanation for users or issue threads, this is the safest wording:

> OpenAI officially supports running Codex in WSL2. However, as of April 19, 2026, OpenAI's Hooks documentation still says Codex hooks are temporarily disabled on Windows. Clawd therefore integrates with Codex by polling `~/.codex/sessions`. If Clawd runs on Windows while Codex runs in WSL with Linux's default home directory, Clawd will not automatically see those session logs. The current issue is better described as a Clawd integration and documentation boundary, not as OpenAI failing to support Codex on WSL.

## 6. Current workable paths

If the goal is "make Windows Clawd react to Codex running in WSL", the realistic paths today are:

1. Use OpenAI's documented sharing approach and point WSL `CODEX_HOME` at the Windows `%USERPROFILE%\.codex`.
2. Reuse the repo's existing remote-side pattern from [`hooks/codex-remote-monitor.js`](../../hooks/codex-remote-monitor.js) and actively send state back to the Windows host.
3. Extend Clawd itself to support an explicit `\\wsl$\...` session directory.

Those options are not equivalent:

- option 1 is an OpenAI-documented sharing flow
- option 2 is already aligned with this repo's remote-monitor pattern
- option 3 would be a new Clawd feature, not current default behavior

## References

OpenAI documentation:

- Codex Windows: <https://developers.openai.com/codex/windows>
- Codex Hooks: <https://developers.openai.com/codex/hooks>
- Codex app on Windows: <https://developers.openai.com/codex/app/windows>

Repo files:

- [`README.md`](../../README.md)
- [`docs/guides/setup-guide.md`](./setup-guide.md)
- [`agents/codex.js`](../../agents/codex.js)
- [`agents/codex-log-monitor.js`](../../agents/codex-log-monitor.js)
- [`hooks/codex-remote-monitor.js`](../../hooks/codex-remote-monitor.js)
