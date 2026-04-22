const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert");
const path = require("path");

const themeLoader = require("../src/theme-loader");

themeLoader.init(path.join(__dirname, "..", "src"));
const theme = themeLoader.loadTheme("clawd");

function makeCtx(overrides = {}) {
  return {
    theme,
    doNotDisturb: false,
    miniTransitioning: false,
    miniMode: false,
    mouseOverPet: false,
    idlePaused: false,
    forceEyeResend: false,
    eyePauseUntil: 0,
    mouseStillSince: Date.now(),
    miniSleepPeeked: false,
    playSound: () => {},
    sendToRenderer: () => {},
    syncHitWin: () => {},
    sendToHitWin: () => {},
    miniPeekIn: () => {},
    miniPeekOut: () => {},
    buildContextMenu: () => {},
    buildTrayMenu: () => {},
    pendingPermissions: [],
    resolvePermissionEntry: () => {},
    showSessionId: false,
    focusTerminalWindow: () => {},
    processKill: () => {
      const err = new Error("ESRCH");
      err.code = "ESRCH";
      throw err;
    },
    getCursorScreenPoint: () => ({ x: 100, y: 100 }),
    t: (key) => key,
    ...overrides,
  };
}

describe("state standalone DND behavior", () => {
  let api;
  let ctx;

  beforeEach(() => {
    mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
    ctx = makeCtx();
    api = require("../src/state")(ctx);
  });

  afterEach(() => {
    api.cleanup();
    mock.timers.reset();
  });

  it("enabling do not disturb does not force the pet into a sleep state", () => {
    api.enableDoNotDisturb();
    assert.strictEqual(ctx.doNotDisturb, true);
    assert.strictEqual(api.getCurrentState(), "idle");
  });

  it("sleep transitions still work while do not disturb is enabled", () => {
    ctx.doNotDisturb = true;
    api.setState("yawning");
    assert.strictEqual(api.getCurrentState(), "yawning");
    mock.timers.tick(3000);
    assert.strictEqual(api.getCurrentState(), "collapsing");
  });

  it("disabling do not disturb only clears the flag", () => {
    api.enableDoNotDisturb();
    api.applyState("sleeping");
    api.disableDoNotDisturb();
    assert.strictEqual(ctx.doNotDisturb, false);
    assert.strictEqual(api.getCurrentState(), "sleeping");
  });
});
