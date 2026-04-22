"use strict";

const NORMAL_INTERVAL_MIN_MS = 2 * 60 * 1000;
const NORMAL_INTERVAL_MAX_MS = 5 * 60 * 1000;
const NIGHT_INTERVAL_MIN_MS = 10 * 60 * 1000;
const NIGHT_INTERVAL_MAX_MS = 20 * 60 * 1000;
const TRANSIENT_MIN_MS = 3 * 1000;
const TRANSIENT_MAX_MS = 6 * 1000;

const DEFAULT_POOL = Object.freeze([
  "attention",
  "thinking",
  "working",
  "sweeping",
  "carrying",
]);

const MINI_SAFE_POOL = Object.freeze([
  "attention",
  "thinking",
  "working",
]);

const SLEEP_STATES = new Set([
  "yawning",
  "dozing",
  "collapsing",
  "sleeping",
  "waking",
  "mini-sleep",
  "mini-enter-sleep",
]);

function isNightTime(dateLike) {
  const hour = dateLike.getHours();
  return hour >= 23 || hour < 6;
}

function randomBetween(min, max, random) {
  const span = Math.max(0, max - min);
  return min + Math.round(span * random());
}

function normalizeDuration(durationMs, random) {
  if (Number.isFinite(durationMs) && durationMs > 0) {
    return Math.round(durationMs);
  }
  return randomBetween(TRANSIENT_MIN_MS, TRANSIENT_MAX_MS, random);
}

module.exports = function createAutonomousBehavior(options = {}) {
  const now = typeof options.now === "function" ? options.now : Date.now;
  const random = typeof options.random === "function" ? options.random : Math.random;
  const setTimeoutFn = options.setTimeout || setTimeout;
  const clearTimeoutFn = options.clearTimeout || clearTimeout;
  const getCurrentState = typeof options.getCurrentState === "function"
    ? options.getCurrentState
    : () => "idle";
  const getMiniMode = typeof options.getMiniMode === "function"
    ? options.getMiniMode
    : () => false;
  const isMiniTransitioning = typeof options.isMiniTransitioning === "function"
    ? options.isMiniTransitioning
    : () => false;
  const isBlocked = typeof options.isBlocked === "function"
    ? options.isBlocked
    : () => false;
  const playState = typeof options.playState === "function"
    ? options.playState
    : () => {};
  const returnToIdle = typeof options.returnToIdle === "function"
    ? options.returnToIdle
    : () => {};
  const resetIdleTimer = typeof options.resetIdleTimer === "function"
    ? options.resetIdleTimer
    : () => {};

  let started = false;
  let paused = false;
  let nextTimer = null;
  let returnTimer = null;
  let activeToken = 0;

  function clearNextTimer() {
    if (!nextTimer) return;
    clearTimeoutFn(nextTimer);
    nextTimer = null;
  }

  function clearReturnTimer() {
    if (!returnTimer) return;
    clearTimeoutFn(returnTimer);
    returnTimer = null;
  }

  function getScheduleWindow(nowValue) {
    const date = nowValue instanceof Date
      ? nowValue
      : new Date(Number.isFinite(nowValue) ? nowValue : now());
    return isNightTime(date)
      ? [NIGHT_INTERVAL_MIN_MS, NIGHT_INTERVAL_MAX_MS]
      : [NORMAL_INTERVAL_MIN_MS, NORMAL_INTERVAL_MAX_MS];
  }

  function pickPool() {
    return getMiniMode() ? MINI_SAFE_POOL : DEFAULT_POOL;
  }

  function pickState() {
    const pool = pickPool();
    return pool[Math.floor(random() * pool.length)];
  }

  function canAutoplay() {
    if (paused || isBlocked() || isMiniTransitioning()) return false;
    return !SLEEP_STATES.has(getCurrentState());
  }

  function scheduleNext(nowValue) {
    clearNextTimer();
    if (!started || paused) return null;
    const [min, max] = getScheduleWindow(nowValue);
    const delay = randomBetween(min, max, random);
    nextTimer = setTimeoutFn(() => {
      nextTimer = null;
      if (!started || paused) return;
      if (!canAutoplay()) {
        scheduleNext();
        return;
      }
      const chosenState = pickState();
      playTransient(chosenState, null, { source: "auto" });
    }, delay);
    return delay;
  }

  function playTransient(state, durationMs, options = {}) {
    if (!state || isBlocked() || isMiniTransitioning()) return false;
    clearReturnTimer();
    activeToken += 1;
    const token = activeToken;
    const duration = normalizeDuration(durationMs, random);

    resetIdleTimer();
    playState(state, duration, options);

    returnTimer = setTimeoutFn(() => {
      returnTimer = null;
      if (token !== activeToken) return;
      returnToIdle(state, options);
    }, duration);

    scheduleNext();
    return true;
  }

  function tease(source = "manual") {
    const state = pickState();
    return playTransient(state, null, { source, manual: true }) ? state : null;
  }

  function start() {
    if (started) return;
    started = true;
    scheduleNext();
  }

  function stop() {
    started = false;
    clearNextTimer();
    clearReturnTimer();
  }

  function setPaused(nextPaused) {
    paused = !!nextPaused;
    if (paused) {
      clearNextTimer();
      return;
    }
    if (started) scheduleNext();
  }

  return {
    start,
    stop,
    setPaused,
    scheduleNext,
    playTransient,
    tease,
  };
};

module.exports.__test = {
  DEFAULT_POOL,
  MINI_SAFE_POOL,
  SLEEP_STATES,
  isNightTime,
  randomBetween,
};
