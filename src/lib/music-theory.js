'use strict';

(function (root) {


  const KEY = 'D minor';
  const SCALE_NAME = 'D Aeolian';
  const TEMPO_BPM = 72;
  const BEATS_PER_BAR = 4;
  const DEFAULT_LOOP_BARS = 2;
  const MAX_LOOP_BARS = 8;
  const MAX_LAYERS = 8;
  const INSTRUMENT_ORDER = ['cello', 'flute', 'violin', 'piano', 'drums'];

  const PIANO_CHORDS = [
    ['D3', 'F3', 'A3', 'D4'],
    ['Bb2', 'D3', 'F3', 'Bb3'],
    ['F3', 'A3', 'C4', 'F4'],
    ['C3', 'E3', 'G3', 'C4'],
  ];

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
    piano: {
      id: 'piano',
      label: 'Piano',
      notes: ['D3', 'F3', 'A3', 'C4'],
      chords: PIANO_CHORDS,
    },
    drums: {
      id: 'drums',
      label: 'Drums',
      notes: [],
    },
  };

  // Audience is toward the bottom of the stage (larger y). Back is smaller y.
  // Strings sit in a front arc, flute mid-left, piano stage right, drums on a rear riser. Duplicates
  // stay in the same section so the group reads as one ensemble.
  const STAGE_SECTIONS = {
    violin: [
      { id: 'violin-a', x: 36, y: 66, scale: 0.92, z: 8 },
      { id: 'violin-b', x: 26, y: 58, scale: 0.86, z: 7 },
      { id: 'violin-c', x: 42, y: 70, scale: 0.88, z: 9 },
    ],
    cello: [
      { id: 'cello-a', x: 52, y: 68, scale: 0.98, z: 8 },
      { id: 'cello-b', x: 62, y: 60, scale: 0.9, z: 7 },
    ],
    flute: [
      { id: 'flute-a', x: 24, y: 42, scale: 0.9, z: 5 },
      { id: 'flute-b', x: 16, y: 48, scale: 0.84, z: 5 },
    ],
    piano: [
      { id: 'piano-a', x: 80, y: 46, scale: 1.08, z: 6 },
      { id: 'piano-b', x: 88, y: 54, scale: 0.94, z: 5 },
    ],
    drums: [
      { id: 'drums-a', x: 50, y: 18, scale: 1.04, z: 3, riser: true },
      { id: 'drums-b', x: 62, y: 16, scale: 0.9, z: 2, riser: true },
    ],
  };

  const STAGE_SLOTS = Object.values(STAGE_SECTIONS).flat();

  function sectionSlots(instrument) {
    return STAGE_SECTIONS[instrument] || STAGE_SECTIONS.cello;
  }

  function liveSlot(instrument) {
    const home = sectionSlots(instrument)[0];
    return {
      ...home,
      id: `${home.id}-live`,
      y: Math.min(86, home.y + 8),
      z: home.z + 4,
      scale: Math.min(1.18, home.scale + 0.08),
    };
  }

  function pianoChordAt(totalBeats) {
    const bar = Math.max(0, Math.floor((totalBeats || 0) / BEATS_PER_BAR));
    return PIANO_CHORDS[bar % PIANO_CHORDS.length];
  }

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
    INSTRUMENT_ORDER,
    PIANO_CHORDS,
    INSTRUMENTS,
    STAGE_SECTIONS,
    STAGE_SLOTS,
    sectionSlots,
    liveSlot,
    pianoChordAt,
    msPerBeat,
    msPerBar,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  root.BreathLib = Object.assign(root.BreathLib || {}, exported);
})(typeof window !== 'undefined' ? window : globalThis);
