'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { TEMPO_BPM, BEATS_PER_BAR, msPerBar, msPerBeat } = require('../src/lib/music-theory');
const {
  barAndBeat,
  nextBarTime,
  quantizeDurationMs,
  resampleEnvelope,
  EnvelopeRecorder,
} = require('../src/lib/quantize');

describe('barAndBeat', () => {
  it('counts 4/4 bars at 72 BPM from a shared transport start', () => {
    const start = 1_000_000;
    const barMs = msPerBar();
    const beatMs = msPerBeat();
    assert.deepEqual(
      { ...barAndBeat(start, start), beatFrac: 0 },
      { bar: 1, beat: 1, beatFrac: 0, totalBeats: 0 },
    );
    const intoBar2Beat3 = start + barMs + 2 * beatMs;
    const pos = barAndBeat(intoBar2Beat3, start);
    assert.equal(pos.bar, 2);
    assert.equal(pos.beat, 3);
  });
});

describe('nextBarTime', () => {
  it('arms recording on the upcoming bar line', () => {
    const start = 0;
    const barMs = msPerBar();
    assert.equal(nextBarTime(barMs * 1.2, start), barMs * 2);
    assert.equal(nextBarTime(barMs * 2, start), barMs * 3);
  });
});

describe('quantizeDurationMs', () => {
  it('snaps a take to whole bars, at least one and at most eight', () => {
    const barMs = msPerBar(TEMPO_BPM, BEATS_PER_BAR);
    assert.deepEqual(quantizeDurationMs(barMs * 0.2), { bars: 1, durationMs: barMs, beats: 4 });
    assert.deepEqual(quantizeDurationMs(barMs * 2.4), { bars: 2, durationMs: barMs * 2, beats: 8 });
    assert.deepEqual(quantizeDurationMs(barMs * 2.6), { bars: 3, durationMs: barMs * 3, beats: 12 });
    assert.equal(quantizeDurationMs(barMs * 40).bars, 8);
  });
});

describe('resampleEnvelope', () => {
  it('interpolates irregular samples onto a fixed grid', () => {
    const samples = [
      { t: 0, v: 0 },
      { t: 500, v: 1 },
      { t: 1000, v: 0 },
    ];
    const env = resampleEnvelope(samples, 1000, 4);
    assert.equal(env.length, 4);
    assert.ok(env[0] < 0.05);
    assert.ok(env[1] > 0.6);
    assert.ok(env[env.length - 1] < 0.05);
  });
});

describe('EnvelopeRecorder', () => {
  it('quantizes a recorded take and writes silence while paused', () => {
    const rec = new EnvelopeRecorder();
    const start = 0;
    rec.start(start);
    for (let t = 0; t <= 2000; t += 50) rec.add(0.8, t);
    rec.setPaused(true);
    for (let t = 2050; t <= 4000; t += 50) rec.add(0.8, t);
    const barMs = msPerBar();
    const take = rec.stop(barMs * 2, TEMPO_BPM);
    assert.equal(take.bars, 2);
    assert.equal(take.durationMs, barMs * 2);
    const midFirst = take.envelope[Math.floor(take.envelope.length * 0.15)];
    const midPause = take.envelope[Math.floor(take.envelope.length * 0.7)];
    assert.ok(midFirst > 0.5);
    assert.ok(midPause < 0.15);
  });
});
