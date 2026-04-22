"use strict";

const { app, BrowserWindow, Menu, Tray, nativeImage } = require("electron");
const path = require("path");

const isMac = process.platform === "darwin";
const isWin = process.platform === "win32";

const WIN_TOPMOST_LEVEL = "pop-up-menu";

const SIZES = {
  S: { width: 200, height: 200 },
  M: { width: 280, height: 280 },
  L: { width: 360, height: 360 },
};

const { createTranslator } = require("./i18n");

module.exports = function initMenu(ctx) {
  const t = createTranslator(() => ctx.lang);

  function isMiniSupported() {
    const caps = typeof ctx.getActiveThemeCapabilities === "function"
      ? ctx.getActiveThemeCapabilities()
      : null;
    if (caps && typeof caps.miniMode === "boolean") return caps.miniMode;
    return true;
  }

  function buildMiniModeMenuItem() {
    const miniSupported = isMiniSupported();
    const inMiniMode = ctx.getMiniMode();
    return {
      label: inMiniMode ? t("exitMiniMode") : t("miniMode"),
      enabled: !ctx.getMiniTransitioning() && (inMiniMode || miniSupported),
      click: () => inMiniMode ? ctx.exitMiniMode() : ctx.enterMiniViaMenu(),
    };
  }

  function buildSizeSubmenu() {
    return [
      {
        label: t("small"),
        type: "radio",
        checked: ctx.currentSize === "S",
        click: () => resizeWindow("S"),
      },
      {
        label: t("medium"),
        type: "radio",
        checked: ctx.currentSize === "M",
        click: () => resizeWindow("M"),
      },
      {
        label: t("large"),
        type: "radio",
        checked: ctx.currentSize === "L",
        click: () => resizeWindow("L"),
      },
    ];
  }

  function createTray() {
    if (ctx.tray) return;
    let icon;
    if (isMac) {
      icon = nativeImage.createFromPath(path.join(__dirname, "../assets/tray-iconTemplate.png"));
      icon.setTemplateImage(true);
    } else {
      icon = nativeImage.createFromPath(path.join(__dirname, "../assets/tray-icon.png")).resize({ width: 32, height: 32 });
    }
    ctx.tray = new Tray(icon);
    ctx.tray.setToolTip("Clawd Desktop Pet");
    buildTrayMenu();
  }

  function destroyTray() {
    if (!ctx.tray) return;
    ctx.tray.destroy();
    ctx.tray = null;
  }

  function applyDockVisibility() {
    if (!isMac) return;
    if (ctx.showDock) {
      app.setActivationPolicy("regular");
      if (app.dock) app.dock.show();
    } else {
      app.setActivationPolicy("accessory");
      if (app.dock) app.dock.hide();
    }
    ctx.reapplyMacVisibility();
  }

  function buildTrayMenu() {
    if (!ctx.tray) return;
    const items = [
      {
        label: ctx.petHidden ? t("showPet") : t("hidePet"),
        click: () => ctx.togglePetVisibility(),
      },
      {
        label: t("teasePet"),
        click: () => ctx.teasePet("tray"),
      },
      buildMiniModeMenuItem(),
      {
        label: t("size"),
        submenu: buildSizeSubmenu(),
      },
      {
        label: t("doNotDisturb"),
        type: "checkbox",
        checked: ctx.doNotDisturb,
        click: (menuItem) => menuItem.checked ? ctx.enableDoNotDisturb() : ctx.disableDoNotDisturb(),
      },
      {
        label: t("startOnLogin"),
        type: "checkbox",
        checked: ctx.openAtLogin,
        click: (menuItem) => { ctx.openAtLogin = menuItem.checked; },
      },
      { type: "separator" },
      {
        label: t("quit"),
        click: () => requestAppQuit(),
      },
    ];
    ctx.tray.setContextMenu(Menu.buildFromTemplate(items));
  }

  function rebuildAllMenus() {
    buildTrayMenu();
    buildContextMenu();
  }

  function requestAppQuit() {
    ctx.isQuitting = true;
    app.quit();
  }

  function ensureContextMenuOwner() {
    if (ctx.contextMenuOwner && !ctx.contextMenuOwner.isDestroyed()) return ctx.contextMenuOwner;
    if (!ctx.win || ctx.win.isDestroyed()) return null;

    ctx.contextMenuOwner = new BrowserWindow({
      parent: ctx.win,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      focusable: true,
      closable: false,
      minimizable: false,
      maximizable: false,
      hasShadow: false,
    });

    ctx.contextMenuOwner.loadURL("data:text/html,%3C!doctype%20html%3E");
    ctx.reapplyMacVisibility();

    ctx.contextMenuOwner.on("close", (event) => {
      if (!ctx.isQuitting) {
        event.preventDefault();
        ctx.contextMenuOwner.hide();
      }
    });

    ctx.contextMenuOwner.on("closed", () => {
      ctx.contextMenuOwner = null;
    });

    return ctx.contextMenuOwner;
  }

  function popupMenuAt(menu) {
    if (ctx.menuOpen) return;
    const owner = ensureContextMenuOwner();
    if (!owner) return;

    const cursor = require("electron").screen.getCursorScreenPoint();
    owner.setBounds({ x: cursor.x, y: cursor.y, width: 1, height: 1 });
    owner.show();
    owner.focus();

    ctx.menuOpen = true;
    menu.popup({
      window: owner,
      callback: () => {
        ctx.menuOpen = false;
        if (owner && !owner.isDestroyed()) owner.hide();
        if (ctx.win && !ctx.win.isDestroyed()) {
          ctx.win.showInactive();
          if (isMac) {
            ctx.reapplyMacVisibility();
          } else if (isWin) {
            ctx.win.setAlwaysOnTop(true, WIN_TOPMOST_LEVEL);
          }
        }
      },
    });
  }

  function buildContextMenu() {
    const template = [
      {
        label: t("teasePet"),
        click: () => ctx.teasePet("context-menu"),
      },
      { type: "separator" },
      buildMiniModeMenuItem(),
      { type: "separator" },
      {
        label: t("settings"),
        click: () => ctx.openSettingsWindow(),
      },
      { type: "separator" },
      {
        label: t("quit"),
        click: () => requestAppQuit(),
      },
    ];
    ctx.contextMenu = Menu.buildFromTemplate(template);
  }

  function showPetContextMenu() {
    if (!ctx.win || ctx.win.isDestroyed()) return;
    buildContextMenu();
    popupMenuAt(ctx.contextMenu);
  }

  function resizeWindow(sizeKey, options = {}) {
    const mode = options.mode || (options.persist === false ? "preview" : "commit");
    const persist = mode !== "preview";
    if (persist) ctx.currentSize = sizeKey;
    const size = (typeof ctx.getPixelSizeFor === "function")
      ? ctx.getPixelSizeFor(sizeKey)
      : (SIZES[sizeKey] || ctx.getCurrentPixelSize());
    if (!ctx.miniHandleResize(sizeKey)) {
      if (ctx.win && !ctx.win.isDestroyed()) {
        const { x, y } = ctx.getPetWindowBounds();
        const clamped = ctx.clampToScreenVisual(x, y, size.width, size.height);
        ctx.applyPetWindowBounds({ ...clamped, width: size.width, height: size.height });
      }
    }
    if (mode !== "preview") {
      ctx.syncHitWin();
      ctx.repositionBubbles();
      if (persist) ctx.flushRuntimeStateToPrefs();
    }
  }

  return {
    t,
    buildContextMenu,
    buildTrayMenu,
    rebuildAllMenus,
    createTray,
    destroyTray,
    applyDockVisibility,
    ensureContextMenuOwner,
    popupMenuAt,
    showPetContextMenu,
    resizeWindow,
    requestAppQuit,
  };
};
