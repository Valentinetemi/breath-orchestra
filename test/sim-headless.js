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

// Song mode: four bars per instrument from the simulator, arranged and mixed end to end.
const { PART_BARS, RECORD_ORDER, shapeTake, arrangeSong, songMixAt, songDurationMs, guideAt } = require('../src/lib/song');
const parts = [];
let songClock = recStart + take.durationMs;
for (const kind of RECORD_ORDER) {
  const partRec = new EnvelopeRecorder();
  partRec.start(songClock);
  const end = songClock + msPerBar() * PART_BARS;
  for (let t = songClock; t < end; t += 33) partRec.add(cal.addSample(sim.tick(t).value, t).envelope, t);
  const partTake = partRec.stop(end, TEMPO_BPM);
  parts.push({ instrument: kind, envelope: shapeTake(partTake.envelope).envelope, bars: partTake.bars });
  songClock = end + msPerBar();
}
const arranged = arrangeSong(parts);
let loudest = 0;
for (let t = 0; t <= songDurationMs(arranged); t += 50) {
  const mix = songMixAt(arranged, t);
  for (const v of Object.values(mix.voices)) {
    if (!Number.isFinite(v.env) || v.env < 0 || v.env > 1) {
      console.error(`bad song envelope at ${t} ms`, v);
      process.exit(1);
    }
    loudest = Math.max(loudest, v.env);
  }
}
const cues = new Set();
for (let t = 0; t < songDurationMs(arranged); t += 200) cues.add(guideAt(arranged, 'cello', t).cue);
console.log(`  song: ${arranged.sections.map((x) => x.name).join(' > ')}`);
console.log(`  song length: ${arranged.totalBars} bars (${(songDurationMs(arranged) / 1000).toFixed(1)} s), loudest ${loudest.toFixed(2)}`);
console.log(`  cello guide cues: ${[...cues].join(', ')}`);
if (parts.some((p) => p.bars !== PART_BARS) || !cues.has('in') || !cues.has('out')) {
  console.error('song parts or guide looked wrong');
  process.exit(1);
}
console.log('OK');
