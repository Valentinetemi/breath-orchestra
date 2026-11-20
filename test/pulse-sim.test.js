'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PulseSimulator, PulseTracker, readPulseMetrics } = require('../src/lib/pulse-sim');

describe('readPulseMetrics', () => {
  it('reads pulse rate and the arterial-pressure trace from a metrics payload', () => {
    const read = readPulseMetrics({
      cardio: {
        pulseRate: [{ value: 74 }],
        arterialPressureTrace: [{ value: 0.2 }, { value: 0.8 }],
      },
    });
    assert.equal(read.rate, 74);
    assert.deepEqual(read.samples, [0.2, 0.8]);
    assert.equal(read.last, 0.8);
  });
});

describe('PulseTracker', () => {
  it('marks a beat at a peak in the arterial-pressure trace', () => {
    const tracker = new PulseTracker();
    tracker.ingest({ cardio: { pulseRate: [{ value: 68 }], arterialPressureTrace: [{ value: 0.1 }] } });
    tracker.ingest({ cardio: { arterialPressureTrace: [{ value: 0.4 }, { value: 0.9 }] } });
    const peak = tracker.ingest({ cardio: { arterialPressureTrace: [{ value: 0.7 }] } });
    assert.equal(peak.rate, 68);
    assert.equal(peak.beat, true);
  });
});

describe('PulseSimulator', () => {
  it('produces a wandering rate and regular beats around the chosen tempo', () => {
    const sim = new PulseSimulator({ bpm: 70 });
    let beats = 0;
    const rates = [];
    for (let t = 0; t <= 8000; t += 16) {
      const sample = sim.tick(t);
      rates.push(sample.rate);
      if (sample.beat) beats += 1;
    }
    assert.ok(beats >= 7 && beats <= 12, `expected about 9 beats in 8s, got ${beats}`);
    const mid = rates.reduce((a, b) => a + b, 0) / rates.length;
    assert.ok(mid > 64 && mid < 76, `mean rate ${mid}`);
  });
});
