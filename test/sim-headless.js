'use strict';

const { BreathCalibrator } = require('../src/lib/calibration');
const { BreathSimulator } = require('../src/lib/breath-sim');
const { EnvelopeRecorder, nextBarTime, barAndBeat } = require('../src/lib/quantize');
const { LoopEngine } = require('../src/lib/loop-engine');
const { TEMPO_BPM, msPerBar } = require('../src/lib/music-theory');

const start = 0;
const sim = new BreathSimulator({ bpm: 13 });
const cal = new BreathCalibrator({ durationMs: 15000 });

for (let t = start; t <= 15000; t += 33) {
  const { value } = sim.tick(t);
  cal.addSample(value, t);
}

if (!cal.complete) {
  console.error('Calibration did not complete');
  process.exit(1);
}

const transportStart = 15000;
const engine = new LoopEngine();
const rec = new EnvelopeRecorder();
const recStart = nextBarTime(16000, transportStart);
rec.start(recStart);

for (let t = recStart; t < recStart + msPerBar() * 2; t += 33) {
  const { value } = sim.tick(t);
  const state = cal.addSample(value, t);
  rec.add(state.envelope, t);
}

const take = rec.stop(recStart + msPerBar() * 2, TEMPO_BPM);
const added = engine.addLayer({ instrument: 'cello', ...take });
if (added.error) {
  console.error(added.error);
  process.exit(1);
}

for (const kind of ['flute', 'violin', 'piano', 'drums']) {
  const extra = engine.addLayer({ instrument: kind, ...take, pulseEnvelope: Float32Array.from([0.4, 0.7, 0.5]) });
  if (extra.error) {
    console.error(extra.error);
    process.exit(1);
  }
}

const pos = barAndBeat(recStart + take.durationMs, transportStart);
const peak = Math.max(...added.layer.envelope);
const mid = engine.envelopeAt(added.layer, take.durationMs / 4);
const kinds = engine.layers.map((layer) => layer.instrument).join(', ');
const drum = engine.layers.find((layer) => layer.instrument === 'drums');

console.log('Breath Orchestra headless sim');
console.log(`  calibration samples: ${cal.state().sampleCount}`);
console.log(`  range p5/p95: ${cal.p5.toFixed(3)} / ${cal.p95.toFixed(3)}`);
console.log(`  loop: ${take.bars} bars, ${added.layer.envelope.length} samples, peak ${peak.toFixed(2)}`);
console.log(`  envelope at 1/4 loop: ${mid.toFixed(2)}`);
console.log(`  transport at commit: bar ${pos.bar}, beat ${pos.beat}`);
console.log(`  seated: ${kinds}`);
console.log(`  drums on riser: ${Boolean(drum && drum.slot.riser)}`);
console.log('OK');
