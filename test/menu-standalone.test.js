const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");

const menuPath = require.resolve("../src/menu");

function loadMenuWithElectronMock(store) {
  const previousMenu = require.cache[menuPath];
  const originalLoad = Module._load;

  class FakeBrowserWindow {
    constructor() {
      this.destroyed = false;
    }
    isDestroyed() { return this.destroyed; }
    loadURL() {}
    on() {}
    hide() {}
    show() {}
    focus() {}
    setBounds() {}
  }

  class FakeTray {
    setToolTip() {}
    setContextMenu(menu) {
      store.trayMenu = menu;
    }
    destroy() {}
  }

  const electronMock = {
    app: {
      setActivationPolicy() {},
      dock: { show() {}, hide() {} },
      quit() { store.quitRequested = true; },
    },
    BrowserWindow: FakeBrowserWindow,
    Menu: {
      buildFromTemplate(template) {
        return {
          template,
          popup() {},
        };
      },
    },
    Tray: FakeTray,
    nativeImage: {
      createFromPath() {
        return {
          resize() { return this; },
          setTemplateImage() {},
        };
      },
    },
    screen: {
      getCursorScreenPoint: () => ({ x: 0, y: 0 }),
    },
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "electron") return electronMock;
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[menuPath];
  const initMenu = require("../src/menu");

  return {
    initMenu,
    restore() {
      Module._load = originalLoad;
      if (previousMenu) require.cache[menuPath] = previousMenu;
      else delete require.cache[menuPath];
    },
  };
}

function makeCtx(store) {
  return {
    lang: "en",
    currentSize: "M",
    petHidden: false,
    doNotDisturb: false,
    openAtLogin: false,
    tray: null,
    menuOpen: false,
    isQuitting: false,
    contextMenuOwner: null,
    contextMenu: null,
    win: {
      isDestroyed: () => false,
      showInactive() {},
      setAlwaysOnTop() {},
    },
    getMiniMode: () => false,
    getMiniTransitioning: () => false,
    getActiveThemeCapabilities: () => ({ miniMode: true }),
    togglePetVisibility: () => { store.togglePetCalls += 1; },
    teasePet: (source) => { store.teaseSources.push(source); },
    enableDoNotDisturb: () => { store.enableDndCalls += 1; },
    disableDoNotDisturb: () => { store.disableDndCalls += 1; },
    enterMiniViaMenu: () => { store.enterMiniCalls += 1; },
    exitMiniMode: () => { store.exitMiniCalls += 1; },
    miniHandleResize: () => false,
    getPetWindowBounds: () => ({ x: 10, y: 20, width: 280, height: 280 }),
    clampToScreenVisual: (x, y) => ({ x, y }),
    applyPetWindowBounds: () => {},
    getPixelSizeFor: (sizeKey) => ({ width: { S: 200, M: 280, L: 360 }[sizeKey], height: { S: 200, M: 280, L: 360 }[sizeKey] }),
    syncHitWin: () => { store.syncHitWinCalls += 1; },
    repositionBubbles: () => { store.repositionCalls += 1; },
    flushRuntimeStateToPrefs: () => { store.flushCalls += 1; },
    openSettingsWindow: () => { store.openSettingsCalls += 1; },
    reapplyMacVisibility() {},
  };
}

describe("standalone menus", () => {
  let store;
  let cleanup;

  beforeEach(() => {
    store = {
      togglePetCalls: 0,
      teaseSources: [],
      enableDndCalls: 0,
      disableDndCalls: 0,
      enterMiniCalls: 0,
      exitMiniCalls: 0,
      syncHitWinCalls: 0,
      repositionCalls: 0,
      flushCalls: 0,
      openSettingsCalls: 0,
      quitRequested: false,
      trayMenu: null,
    };
    const { initMenu, restore } = loadMenuWithElectronMock(store);
    cleanup = restore;
    const ctx = makeCtx(store);
    const menu = initMenu(ctx);
    menu.createTray();
    menu.buildContextMenu();
    store.menu = menu;
    store.ctx = ctx;
  });

  afterEach(() => {
    if (cleanup) cleanup();
    cleanup = null;
  });

  it("builds the standalone tray menu", () => {
    const labels = store.trayMenu.template.map((item) => item.label || item.type);
    assert.deepStrictEqual(labels, [
      "Hide Clawd",
      "Tease Clawd",
      "Mini Mode",
      "Size",
      "Do Not Disturb",
      "Start on Login",
      "separator",
      "Quit",
    ]);

    const sizeItem = store.trayMenu.template.find((item) => item.label === "Size");
    assert.deepStrictEqual(sizeItem.submenu.map((item) => item.label), ["Small (S)", "Medium (M)", "Large (L)"]);

    sizeItem.submenu[0].click();
    assert.strictEqual(store.syncHitWinCalls, 1);
    assert.strictEqual(store.flushCalls, 1);
  });

  it("builds the standalone context menu", () => {
    const labels = store.ctx.contextMenu.template.map((item) => item.label || item.type);
    assert.deepStrictEqual(labels, [
      "Tease Clawd",
      "separator",
      "Mini Mode",
      "separator",
      "Settings…",
      "separator",
      "Quit",
    ]);

    store.ctx.contextMenu.template[0].click();
    assert.deepStrictEqual(store.teaseSources, ["context-menu"]);
  });
});
