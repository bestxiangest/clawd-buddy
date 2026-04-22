const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert");

const createAutonomousBehavior = require("../src/autonomous-behavior");

describe("autonomous behavior", () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ["setTimeout", "Date"] });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it("schedules 2-5 minute intervals during the day and plays a transient state", () => {
    const played = [];
    const returned = [];
    const randomValues = [0, 0, 0];
    const behavior = createAutonomousBehavior({
      now: () => new Date("2026-04-22T12:00:00+08:00").getTime(),
      random: () => randomValues.shift() ?? 0,
      playState: (state, duration, options) => played.push({ state, duration, options }),
      returnToIdle: (state, options) => returned.push({ state, options }),
      getCurrentState: () => "idle",
      getMiniMode: () => false,
    });

    behavior.start();
    mock.timers.tick(2 * 60 * 1000);

    assert.deepStrictEqual(played, [
      { state: "attention", duration: 3000, options: { source: "auto" } },
    ]);

    mock.timers.tick(3000);
    assert.deepStrictEqual(returned, [
      { state: "attention", options: { source: "auto" } },
    ]);
  });

  it("uses 10-20 minute intervals at night", () => {
    const behavior = createAutonomousBehavior({
      now: () => new Date("2026-04-22T23:30:00+08:00").getTime(),
      random: () => 1,
      playState: () => {},
      returnToIdle: () => {},
    });

    behavior.start();
    const delay = behavior.scheduleNext(new Date("2026-04-22T23:30:00+08:00").getTime());
    assert.strictEqual(delay, 20 * 60 * 1000);
  });

  it("skips autoplay while sleeping and reschedules instead", () => {
    let playCount = 0;
    const randomValues = [0, 0, 0, 0];
    let currentState = "sleeping";
    const behavior = createAutonomousBehavior({
      now: () => new Date("2026-04-22T12:00:00+08:00").getTime(),
      random: () => randomValues.shift() ?? 0,
      playState: () => { playCount += 1; },
      returnToIdle: () => {},
      getCurrentState: () => currentState,
    });

    behavior.start();
    mock.timers.tick(2 * 60 * 1000);
    assert.strictEqual(playCount, 0);

    currentState = "idle";
    mock.timers.tick(2 * 60 * 1000);
    assert.strictEqual(playCount, 1);
  });

  it("manual playback still works while paused and mini tease uses the mini-safe pool", () => {
    const played = [];
    const randomValues = [0.99, 0];
    const behavior = createAutonomousBehavior({
      now: () => new Date("2026-04-22T12:00:00+08:00").getTime(),
      random: () => randomValues.shift() ?? 0,
      playState: (state, duration, options) => played.push({ state, duration, options }),
      returnToIdle: () => {},
      getCurrentState: () => "idle",
      getMiniMode: () => true,
    });

    behavior.setPaused(true);
    const state = behavior.tease("context-menu");

    assert.strictEqual(state, "working");
    assert.deepStrictEqual(played, [
      { state: "working", duration: 3000, options: { source: "context-menu", manual: true } },
    ]);
  });
});
