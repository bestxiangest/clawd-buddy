const { describe, it } = require("node:test");
const assert = require("node:assert");

const prefs = require("../src/prefs");

describe("standalone prefs schema", () => {
  it("drops deprecated hook, bubble, session, and agent fields", () => {
    const snapshot = prefs.validate({
      manageClaudeHooksAutomatically: true,
      autoStartWithClaude: true,
      bubbleFollowPet: true,
      hideBubbles: true,
      showSessionId: true,
      agents: { codex: { enabled: false } },
      openAtLogin: true,
      soundMuted: true,
    });

    assert.strictEqual("manageClaudeHooksAutomatically" in snapshot, false);
    assert.strictEqual("autoStartWithClaude" in snapshot, false);
    assert.strictEqual("bubbleFollowPet" in snapshot, false);
    assert.strictEqual("hideBubbles" in snapshot, false);
    assert.strictEqual("showSessionId" in snapshot, false);
    assert.strictEqual("agents" in snapshot, false);
    assert.strictEqual(snapshot.openAtLogin, true);
    assert.strictEqual(snapshot.soundMuted, true);
  });

  it("migration backfills themeOverrides without reintroducing agents", () => {
    const migrated = prefs.migrate({ version: null, theme: "clawd" });

    assert.strictEqual(migrated.version, 1);
    assert.deepStrictEqual(migrated.themeOverrides, {});
    assert.strictEqual("agents" in migrated, false);
  });
});
