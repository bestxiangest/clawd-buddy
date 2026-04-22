const { describe, it } = require("node:test");
const assert = require("node:assert");

const shortcutActions = require("../src/shortcut-actions");

describe("shortcut actions", () => {
  it("only keeps the standalone toggle action", () => {
    assert.deepStrictEqual(shortcutActions.SHORTCUT_ACTION_IDS, ["togglePet"]);
    assert.deepStrictEqual(Object.keys(shortcutActions.getDefaultShortcuts()), ["togglePet"]);
  });

  it("ignores obsolete shortcut keys when normalizing snapshots", () => {
    const normalized = shortcutActions.normalizeShortcuts({
      togglePet: "CommandOrControl+Shift+Alt+P",
      permissionAllow: "CommandOrControl+Shift+Y",
    });

    assert.deepStrictEqual(normalized, {
      togglePet: "CommandOrControl+Shift+Alt+P",
    });
  });
});
