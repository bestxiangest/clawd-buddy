const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));

describe("package build config", () => {
  it("removes hook installation scripts", () => {
    assert.strictEqual("install:claude-hooks" in pkg.scripts, false);
    assert.strictEqual("uninstall:claude-hooks" in pkg.scripts, false);
    assert.strictEqual("install:gemini-hooks" in pkg.scripts, false);
    assert.strictEqual("install:cursor-hooks" in pkg.scripts, false);
    assert.strictEqual("install:kiro-hooks" in pkg.scripts, false);
  });

  it("does not package agent, hook, or extension bundles", () => {
    assert.ok(!pkg.build.files.includes("hooks/**/*"));
    assert.ok(!pkg.build.files.includes("agents/**/*"));
    assert.ok(!pkg.build.files.includes("extensions/**/*"));
    assert.ok(!pkg.build.asarUnpack.includes("hooks/**/*"));
    assert.ok(!pkg.build.asarUnpack.includes("extensions/**/*"));
  });
});
