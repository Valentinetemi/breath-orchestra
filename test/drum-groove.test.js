'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  STEPS_PER_BAR,
  densityFromPulseRate,
  stepAt,
  stepInBar,
  hitsForStep,
} = require('../src/lib/drum-groove');
const { TEMPO_BPM, msPerBeat } = require('../src/lib/music-theory');

describe('densityFromPulseRate', () => {
  it('gets busier as the pulse quickens, without changing the locked tempo', () => {
    const slow = densityFromPulseRate(52);
    const mid = densityFromPulseRate(72);
    const fast = densityFromPulseRate(100);
    assert.ok(slow < mid && mid < fast);
    assert.equal(TEMPO_BPM, 72);
    assert.ok(slow >= 0.12 && fast <= 0.98);
  });
});

describe('stepAt', () => {
  it('lands only on the 72 BPM sixteenth-note grid', () => {
    const stepMs = msPerBeat(72) / 4;
    assert.equal(stepAt(0, 0), 0);
    assert.equal(stepAt(stepMs * 4, 0), 4);
    assert.equal(stepInBar(stepAt(stepMs * 16, 0)), 0);
    assert.equal(STEPS_PER_BAR, 16);
  });
});

describe('hitsForStep', () => {
  function voicesAt(density, breath = 0.3, phase = 'hold', pulseAccent = false) {
    const out = [];
    for (let step = 0; step < 16; step += 1) {
      hitsForStep(step, { density, breath, phase, pulseAccent }).forEach((hit) => {
        out.push({ ...hit, abs: step });
      });
    }
    return out;
  }

  it('stays on the grid and uses a lighter pattern when the pulse is slow', () => {
    const hits = voicesAt(0.2, 0.2, 'hold');
    assert.ok(hits.every((hit) => hit.step === stepInBar(hit.abs)));
    const kicks = hits.filter((hit) => hit.voice === 'kick');
    const snares = hits.filter((hit) => hit.voice === 'snare');
    assert.deepEqual(kicks.map((hit) => hit.step), [0]);
    assert.deepEqual(snares.map((hit) => hit.step), [8]);
  });

  it('adds a backbeat and busier hats when the pulse is quicker', () => {
    const mid = voicesAt(0.5);
    const busy = voicesAt(0.9);
    const hats = (list) => list.filter((hit) => hit.voice === 'hat').length;
    assert.ok(mid.some((hit) => hit.voice === 'kick' && hit.step === 8));
    assert.ok(mid.some((hit) => hit.voice === 'snare' && hit.step === 4));
    assert.ok(hats(busy) > hats(mid));
  });

  it('adds a fill and a crash on a big inhale, and a pulse accent only raises velocity', () => {
    const fill = voicesAt(0.5, 0.85, 'inhale');
    assert.ok(fill.some((hit) => hit.voice === 'tom' && hit.step >= 12));
    assert.ok(fill.some((hit) => hit.voice === 'crash' && hit.step === 0));

    const plain = hitsForStep(0, { density: 0.5, breath: 0.3, pulseAccent: false });
    const accented = hitsForStep(0, { density: 0.5, breath: 0.3, pulseAccent: true });
    assert.deepEqual(plain.map((hit) => hit.voice), accented.map((hit) => hit.voice));
    const kickPlain = plain.find((hit) => hit.voice === 'kick').velocity;
    const kickAcc = accented.find((hit) => hit.voice === 'kick').velocity;
    assert.ok(kickAcc > kickPlain);
  });
});
