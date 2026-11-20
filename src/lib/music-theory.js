'use strict';

(function (root) {


  const KEY = 'D minor';
  const SCALE_NAME = 'D Aeolian';
  const TEMPO_BPM = 72;
  const BEATS_PER_BAR = 4;
  const DEFAULT_LOOP_BARS = 2;
  const MAX_LOOP_BARS = 8;
  const MAX_LAYERS = 8;

  const INSTRUMENTS = {
    cello: {
      id: 'cello',
      label: 'Cello',
      notes: ['D2', 'A2', 'D3', 'F3'],
    },
    flute: {
      id: 'flute',
      label: 'Flute',
      notes: ['A4', 'D5', 'F5', 'E5'],
    },
    violin: {
      id: 'violin',
      label: 'Violin',
      notes: ['F4', 'A4', 'G4', 'D5'],
    },
  };

  const STAGE_SLOTS = [
    { id: 'center', x: 50, y: 50, scale: 1.0, z: 5 },
    { id: 'left', x: 34, y: 52, scale: 0.92, z: 4 },
    { id: 'right', x: 66, y: 52, scale: 0.92, z: 4 },
    { id: 'far-left', x: 20, y: 56, scale: 0.84, z: 3 },
    { id: 'far-right', x: 80, y: 56, scale: 0.84, z: 3 },
    { id: 'front-left', x: 40, y: 60, scale: 0.9, z: 6 },
    { id: 'front-right', x: 60, y: 60, scale: 0.9, z: 6 },
    { id: 'front-center', x: 50, y: 63, scale: 0.86, z: 7 },
  ];

  function msPerBeat(tempo = TEMPO_BPM) {
    return 60000 / tempo;
  }

  function msPerBar(tempo = TEMPO_BPM, beats = BEATS_PER_BAR) {
    return msPerBeat(tempo) * beats;
  }

  const exported = {
    KEY,
    SCALE_NAME,
    TEMPO_BPM,
    BEATS_PER_BAR,
    DEFAULT_LOOP_BARS,
    MAX_LOOP_BARS,
    MAX_LAYERS,
    INSTRUMENTS,
    STAGE_SLOTS,
    msPerBeat,
    msPerBar,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  root.BreathLib = Object.assign(root.BreathLib || {}, exported);
})(typeof window !== 'undefined' ? window : globalThis);
