'use strict';

const { INSTRUMENT_ORDER } = require('../src/lib/music-theory');

function stubTone() {
  const nodes = [];

  class Param {
    constructor(value = 0) {
      this.value = value;
    }

    rampTo(value) {
      this.value = value;
    }
  }

  class Node {
    constructor(name, opts = {}) {
      this.name = name;
      this.opts = opts;
      this.connections = [];
      this.started = false;
      this.attacks = 0;
      this.frequency = new Param(opts.frequency || 440);
      this.gain = new Param(0);
      this.volume = new Param(opts.volume || 0);
      nodes.push(this);
    }

    connect(dest) {
      this.connections.push(dest);
      return dest;
    }

    toDestination() {
      this.connections.push('destination');
      return this;
    }

    start() {
      this.started = true;
      return this;
    }

    dispose() {
      this.disposed = true;
    }

    triggerAttack() {
      this.attacks += 1;
    }

    triggerAttackRelease() {
      this.attacks += 1;
    }

    releaseAll() {}
  }

  class PolySynth extends Node {
    constructor(_Voice, opts) {
      super('PolySynth', opts);
    }
  }

  class Reverb extends Node {
    constructor(opts) {
      super('Reverb', opts);
      this.ready = Promise.resolve();
    }
  }

  function ctor(name) {
    return function Factory(arg) {
      const node = new Node(name, typeof arg === 'object' && arg ? arg : { value: arg });
      if (name === 'Gain' && typeof arg === 'number') node.gain.value = arg;
      return node;
    };
  }

  return {
    nodes,
    now: () => 0,
    start: async () => {},
    Transport: { bpm: { value: 0 }, timeSignature: 4, start() {} },
    Frequency: () => ({ toFrequency: () => 440 }),
    Gain: ctor('Gain'),
    Filter: ctor('Filter'),
    Oscillator: ctor('Oscillator'),
    Noise: ctor('Noise'),
    Vibrato: ctor('Vibrato'),
    Reverb,
    Synth: ctor('Synth'),
    PolySynth,
    MembraneSynth: ctor('MembraneSynth'),
    NoiseSynth: ctor('NoiseSynth'),
    MetalSynth: ctor('MetalSynth'),
  };
}

globalThis.Tone = stubTone();
const { Orchestra } = require('../src/renderer/orchestra');

async function main() {
  const orchestra = new Orchestra();
  await orchestra.start();
  if (!orchestra.started || !orchestra.master) {
    throw new Error('Orchestra did not start an audio graph');
  }

  const results = {};
  for (const kind of INSTRUMENT_ORDER) {
    orchestra.setLiveInstrument(kind);
    orchestra.setLiveEnvelope(0.8, 8, {
      nowMs: 1000,
      transportStart: 0,
      density: 0.75,
      phase: 'inhale',
      pulseAccent: true,
      env: 0.8,
    });
    if (kind === 'drums') {
      const stepMs = 60000 / 72 / 4;
      orchestra.setLiveEnvelope(0.85, 8, {
        nowMs: 1000 + stepMs,
        transportStart: 0,
        density: 0.75,
        phase: 'inhale',
        pulseAccent: false,
        env: 0.85,
      });
    }
    const graph = orchestra.describeLive();
    results[kind] = graph;
    if (graph.kind !== kind) throw new Error(`${kind}: live voice is ${graph.kind}`);
    if (!graph.hasGain) throw new Error(`${kind}: missing gain node`);
    if (!graph.nodes.length) throw new Error(`${kind}: no source nodes in the graph`);
    if (kind === 'piano' && !graph.nodes.includes('synth')) {
      throw new Error(`piano: expected a synth, got ${graph.nodes.join(',')}`);
    }
    if (kind === 'drums' && !graph.nodes.includes('kick')) {
      throw new Error(`drums: expected a kick, got ${graph.nodes.join(',')}`);
    }
    if (kind !== 'drums' && kind !== 'piano') {
      const osc = orchestra.live && orchestra.live.source && orchestra.live.source.osc;
      if (!osc || !osc.started) throw new Error(`${kind}: oscillator did not start`);
    }
    if (kind === 'piano') {
      const attacks = (orchestra.live.source.synth.attacks || 0)
        + (orchestra.live.source.overlay.attacks || 0);
      if (attacks < 1) throw new Error('piano: no notes were triggered');
    }
    if (kind === 'drums') {
      const kit = orchestra.live.source;
      const attacks = Object.values(kit).reduce((sum, node) => sum + (node && node.attacks ? node.attacks : 0), 0);
      if (attacks < 1) throw new Error('drums: no hits were triggered');
    }
    console.log(`  ${kind}: ${graph.nodes.join(', ')}`);
  }

  console.log('audio-graph: all 5 instruments produced output');
  console.log('OK');
}

main().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
