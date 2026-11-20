'use strict';

(function (root) {
  const theory = (typeof module !== 'undefined' && module.exports)
    ? require('./music-theory')
    : root.BreathLib;

  const STEPS_PER_BAR = 16;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function densityFromPulseRate(rate, lockedTempo = theory.TEMPO_BPM) {
    if (!Number.isFinite(rate)) return 0.48;
    // Sparse when the pulse is slow, busier when it is quicker — but the
    // musical grid itself never leaves the locked tempo.
    const mid = lockedTempo;
    if (rate <= mid) return clamp(0.18 + (rate - 48) / (mid - 48) * 0.32, 0.12, 0.5);
    return clamp(0.5 + (rate - mid) / (110 - mid) * 0.48, 0.5, 0.98);
  }

  function stepAt(nowMs, transportStart, tempo = theory.TEMPO_BPM) {
    const elapsed = nowMs - transportStart;
    const stepMs = theory.msPerBeat(tempo) / 4;
    if (stepMs <= 0) return 0;
    return Math.floor(elapsed / stepMs);
  }

  function stepInBar(step) {
    const wrapped = step % STEPS_PER_BAR;
    return wrapped < 0 ? wrapped + STEPS_PER_BAR : wrapped;
  }

  function hitsForStep(step, options = {}) {
    const density = clamp(options.density ?? 0.5, 0, 1);
    const breath = clamp(options.breath ?? 0, 0, 1);
    const phase = options.phase || 'hold';
    const pulseAccent = Boolean(options.pulseAccent);
    const i = stepInBar(step);
    const hits = [];

    const kickOn = new Set([0]);
    if (density >= 0.35) kickOn.add(8);
    if (density >= 0.7) kickOn.add(6);
    if (density >= 0.85) kickOn.add(10);

    const snareOn = new Set();
    if (density < 0.35) snareOn.add(8);
    else {
      snareOn.add(4);
      snareOn.add(12);
    }
    if (density >= 0.8) snareOn.add(14);

    const hatEvery = density >= 0.75 ? 1 : density >= 0.4 ? 2 : 4;
    if (i % hatEvery === 0) {
      hits.push({ voice: 'hat', velocity: 0.28 + density * 0.25 + breath * 0.12 });
    }

    if (kickOn.has(i)) {
      hits.push({ voice: 'kick', velocity: 0.62 + density * 0.2 });
    }
    if (snareOn.has(i)) {
      const ghost = i === 14;
      hits.push({ voice: 'snare', velocity: ghost ? 0.28 : 0.58 + density * 0.18 });
    }

    const rideVel = 0.12 + breath * 0.55;
    if (i % 2 === 0 && breath > 0.12) {
      hits.push({ voice: 'ride', velocity: rideVel });
    }

    const bigInhale = breath >= 0.72 && phase === 'inhale';
    if (bigInhale && i >= 12) {
      hits.push({ voice: 'tom', velocity: 0.45 + (i - 12) * 0.12 });
    }
    if (bigInhale && i === 0) {
      hits.push({ voice: 'crash', velocity: 0.55 + breath * 0.35 });
    }

    return hits.map((hit) => ({
      ...hit,
      step: i,
      velocity: clamp(hit.velocity * (pulseAccent ? 1.18 : 1), 0.05, 1),
    }));
  }

  const exported = {
    STEPS_PER_BAR,
    densityFromPulseRate,
    stepAt,
    stepInBar,
    hitsForStep,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  root.BreathLib = Object.assign(root.BreathLib || {}, exported);
})(typeof window !== 'undefined' ? window : globalThis);
