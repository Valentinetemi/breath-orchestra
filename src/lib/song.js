'use strict';

(function (root) {
  const lib = (typeof module !== 'undefined' && module.exports)
    ? require('./music-theory')
    : root.BreathLib;
  void lib;

  const PART_BARS = 4;
  const SECTION_BARS = 4;
  const ENDING_BARS = 2;
  const RECORD_ORDER = ['cello', 'piano', 'violin', 'flute', 'drums'];
  // Piano or cello make the warmest openings; drums never start a song alone if anything else exists.
  const INTRO_PREFERENCE = ['piano', 'cello', 'violin', 'flute', 'drums'];
  const ENTRY_PREFERENCE = ['cello', 'piano', 'violin', 'flute'];

  const LABELS = {
    cello: 'Cello', flute: 'Flute', violin: 'Violin', piano: 'Piano', drums: 'Drums',
  };

  function latestParts(parts) {
    const byKind = new Map();
    (parts || []).forEach((part) => {
      if (part && LABELS[part.instrument]) byKind.set(part.instrument, part);
    });
    return byKind;
  }

  function entryOrder(kinds) {
    const intro = INTRO_PREFERENCE.find((kind) => kinds.includes(kind));
    const melodic = ENTRY_PREFERENCE.filter((kind) => kind !== intro && kinds.includes(kind));
    const order = [intro, ...melodic];
    if (intro !== 'drums' && kinds.includes('drums')) {
      // Drums land once there's some harmony to sit under, not straight after the intro.
      const at = Math.min(order.length, 2);
      order.splice(at, 0, 'drums');
    }
    return order;
  }

  function arrangeSong(parts) {
    const byKind = latestParts(parts);
    if (!byKind.size) return null;
    const order = entryOrder([...byKind.keys()]);
    const sections = [];
    let bar = 0;
    const push = (name, bars, active, extra = {}) => {
      sections.push({ name, startBar: bar, bars, active: active.slice(), ...extra });
      bar += bars;
    };

    push('Intro', SECTION_BARS, [order[0]], { entering: order[0] });
    for (let i = 1; i < order.length; i += 1) {
      push(`${LABELS[order[i]]} joins`, SECTION_BARS, order.slice(0, i + 1), { entering: order[i] });
    }
    push(order.length > 1 ? 'Everyone' : 'Again', SECTION_BARS, order);
    push('Ending', ENDING_BARS, order, { ending: true });

    const tracks = {};
    order.forEach((kind) => { tracks[kind] = byKind.get(kind); });
    return { order, sections, totalBars: bar, tracks };
  }

  function sectionAtBar(song, bar) {
    if (!song) return null;
    for (let i = song.sections.length - 1; i >= 0; i -= 1) {
      if (bar >= song.sections[i].startBar) return { section: song.sections[i], index: i };
    }
    return { section: song.sections[0], index: 0 };
  }

  const exported = {
    PART_BARS,
    SECTION_BARS,
    ENDING_BARS,
    RECORD_ORDER,
    arrangeSong,
    sectionAtBar,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  root.BreathLib = Object.assign(root.BreathLib || {}, exported);
})(typeof window !== 'undefined' ? window : globalThis);
