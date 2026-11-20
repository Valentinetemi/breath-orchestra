'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { BreathCalibrator, percentile } = require('../src/lib/calibration');

describe('percentile', () => {
  it('returns 0 for an empty list', () => {
    assert.equal(percentile([], 0.5), 0);
  });

  it('interpolates the 5th and 95th percentiles', () => {
    const values = Array.from({ length: 101 }, (_, i) => i);
    assert.equal(percentile(values, 0.05), 5);
    assert.equal(percentile(values, 0.95), 95);
    assert.equal(percentile(values, 0.5), 50);
  });
});

describe('BreathCalibrator', () => {
  function feedSine(cal, { seconds, hz, amplitude, baseline, start = 0 }) {
    const dt = 1000 / hz;
    let state;
    for (let t = 0; t <= seconds * 1000; t += dt) {
      const env = 0.5 - 0.5 * Math.cos((2 * Math.PI * (t / 1000)) / 5);
      state = cal.addSample(baseline + env * amplitude, start + t);
    }
    return state;
  }

  it('completes after 15 seconds and maps a shallow breath to a full 0-1 range', () => {
    const cal = new BreathCalibrator({ durationMs: 15000, smooth: 0.5 });
    const state = feedSine(cal, { seconds: 15, hz: 30, amplitude: 0.12, baseline: 0.4 });
    assert.equal(state.complete, true);
    const low = cal.normalize(cal.p5);
    const high = cal.normalize(cal.p95);
    assert.ok(low <= 0.05, `low was ${low}`);
    assert.ok(high >= 0.95, `high was ${high}`);
  });

  it('gives shallow and deep breathers a comparable dynamic range', () => {
    const shallow = new BreathCalibrator({ durationMs: 15000 });
    const deep = new BreathCalibrator({ durationMs: 15000 });
    feedSine(shallow, { seconds: 15, hz: 30, amplitude: 0.08, baseline: 0.3 });
    feedSine(deep, { seconds: 15, hz: 30, amplitude: 0.6, baseline: 0.3 });
    const midShallow = shallow.normalize((shallow.p5 + shallow.p95) / 2);
    const midDeep = deep.normalize((deep.p5 + deep.p95) / 2);
    assert.ok(Math.abs(midShallow - 0.5) < 0.08);
    assert.ok(Math.abs(midDeep - 0.5) < 0.08);
  });

  it('detects inhale and exhale with hysteresis instead of flickering', () => {
    const cal = new BreathCalibrator({ durationMs: 2000, smooth: 0.4, onThreshRatio: 0.02, offThreshRatio: 0.008 });
    for (let i = 0; i <= 20; i += 1) cal.addSample(0.2 + i * 0.03, i * 40);
    assert.equal(cal.phase, 'inhale');
    const mid = cal.samples[cal.samples.length - 1].v;
    for (let i = 1; i <= 12; i += 1) cal.addSample(mid, 800 + i * 40);
    assert.equal(cal.phase, 'hold');
    const start = mid;
    for (let i = 1; i <= 20; i += 1) cal.addSample(start - i * 0.03, 1400 + i * 40);
    assert.equal(cal.phase, 'exhale');
  });

  it('expands the range slowly after a later deeper breath, not from a single spike', () => {
    const cal = new BreathCalibrator({ durationMs: 15000, rollingExpand: 0.015, rollingShrink: 0.004 });
    feedSine(cal, { seconds: 15, hz: 30, amplitude: 0.2, baseline: 0.4 });
    const before = cal.p95;
    cal.addSample(cal.p95 + 2, 16000);
    const afterSpike = cal.p95;
    assert.ok(afterSpike - before < 0.2, 'a cough should not jump the scale');
    let t = 16040;
    for (let i = 0; i < 200; i += 1) {
      const env = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i / 30)) / 5);
      cal.addSample(0.4 + env * 0.45, t);
      t += 33;
    }
    assert.ok(cal.p95 > before, 'a sustained deeper breath should slowly widen the range');
  });

  it('can invert polarity so a falling trace still swells on inhale', () => {
    const cal = new BreathCalibrator({ durationMs: 15000, invert: true });
    feedSine(cal, { seconds: 15, hz: 30, amplitude: 0.3, baseline: 0.4 });
    assert.ok(cal.normalize(cal.p5) > 0.9);
    assert.ok(cal.normalize(cal.p95) < 0.1);
  });
});
