'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { BreathSimulator } = require('../src/lib/breath-sim');

describe('BreathSimulator', () => {
  it('produces a cyclic waveform with distinct inhale and exhale halves', () => {
    const sim = new BreathSimulator({ bpm: 12, baseline: 0.4, amplitude: 0.4 });
    const values = [];
    for (let t = 0; t < 10000; t += 33) values.push(sim.tick(t).value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    assert.ok(max - min > 0.25, 'synthetic breath should have a usable range');
    assert.ok(values.some((v, i) => i > 0 && v > values[i - 1]));
    assert.ok(values.some((v, i) => i > 0 && v < values[i - 1]));
  });

  it('lets keyboard or mouse control override the automatic waveform', () => {
    const sim = new BreathSimulator();
    sim.tick(0);
    sim.inhale();
    let last = sim.tick(16).value;
    let rose = false;
    for (let t = 32; t <= 2000; t += 16) {
      const next = sim.tick(t).value;
      if (next > last) rose = true;
      last = next;
    }
    assert.ok(rose);
    sim.exhale();
    const peak = last;
    for (let t = 2016; t <= 4000; t += 16) last = sim.tick(t).value;
    assert.ok(last < peak);
  });
});
