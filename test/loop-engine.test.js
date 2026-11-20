'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { LoopEngine } = require('../src/lib/loop-engine');

describe('LoopEngine', () => {
  function make(env, instrument = 'cello') {
    return {
      instrument,
      envelope: Float32Array.from(env),
      durationMs: 2000,
      bars: 1,
      beats: 4,
    };
  }

  function dist(a, b) {
    return Math.hypot(a.slot.x - b.slot.x, a.slot.y - b.slot.y);
  }

  it('seats each layer in a different stage slot, including duplicate instruments', () => {
    const engine = new LoopEngine();
    const a = engine.addLayer(make([0, 1, 0], 'cello')).layer;
    const b = engine.addLayer(make([0, 1, 0], 'cello')).layer;
    const c = engine.addLayer(make([0, 1, 0], 'flute')).layer;
    assert.equal(engine.layers.length, 3);
    assert.notEqual(a.slot.id, b.slot.id);
    assert.equal(a.instrument, 'cello');
    assert.equal(b.instrument, 'cello');
    assert.equal(c.instrument, 'flute');
  });

  it('keeps duplicates in the same section so the group stays together', () => {
    const engine = new LoopEngine();
    const celloA = engine.addLayer(make([0, 1, 0], 'cello')).layer;
    const celloB = engine.addLayer(make([0, 1, 0], 'cello')).layer;
    const piano = engine.addLayer(make([0, 1, 0], 'piano')).layer;
    const drums = engine.addLayer(make([0, 1, 0], 'drums')).layer;
    assert.ok(dist(celloA, celloB) < dist(celloA, piano));
    assert.ok(dist(celloA, celloB) < dist(celloA, drums));
    assert.ok(drums.slot.y < celloA.slot.y);
    assert.equal(drums.slot.riser, true);
    assert.ok(piano.slot.x > celloA.slot.x);
  });

  it('mutes a player to silence and undo removes the last layer', () => {
    const engine = new LoopEngine();
    const first = engine.addLayer(make([0, 1, 0])).layer;
    const second = engine.addLayer(make([0, 0.5, 0], 'violin')).layer;
    engine.mute(first.id, true);
    assert.equal(engine.envelopeAt(first, 1000), 0);
    assert.ok(engine.envelopeAt(second, 1000) > 0.2);
    engine.undo();
    assert.equal(engine.layers.length, 1);
    assert.equal(engine.layers[0].id, first.id);
    engine.remove(first.id);
    assert.equal(engine.layers.length, 0);
  });

  it('loops the envelope in time and interpolates between samples', () => {
    const engine = new LoopEngine();
    const layer = engine.addLayer(make([0, 1], 'flute')).layer;
    assert.equal(engine.envelopeAt(layer, 0), 0);
    assert.ok(Math.abs(engine.envelopeAt(layer, 1000) - 1) < 1e-6);
    assert.ok(Math.abs(engine.envelopeAt(layer, 500) - 0.5) < 1e-6);
    assert.ok(Math.abs(engine.envelopeAt(layer, 2500) - 0.5) < 1e-6);
  });

  it('plays back a recorded pulse envelope with the loop', () => {
    const engine = new LoopEngine();
    const layer = engine.addLayer({
      ...make([0, 1], 'drums'),
      pulseEnvelope: Float32Array.from([0, 1]),
    }).layer;
    assert.ok(Math.abs(engine.pulseAt(layer, 1000) - 1) < 1e-6);
    engine.mute(layer.id, true);
    assert.equal(engine.pulseAt(layer, 1000), 0.48);
  });

  it('rejects a ninth layer', () => {
    const engine = new LoopEngine({ maxLayers: 8 });
    for (let i = 0; i < 8; i += 1) {
      assert.equal(engine.addLayer(make([0, 1])).error, null);
    }
    assert.equal(engine.addLayer(make([0, 1])).error, 'full');
  });
});
