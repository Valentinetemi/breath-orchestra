'use strict';

(function (root) {
  const {
    BEATS_PER_BAR,
    PIANO_CHORDS,
    TEMPO_BPM,
    msPerBar,
  } = (typeof module !== 'undefined' && module.exports)
    ? require('./music-theory')
    : root.BreathLib;

  const PART_BARS = 4;
  const SECTION_BARS = 4;
  const ENDING_BARS = 2;
  const RECORD_ORDER = ['cello', 'piano', 'violin', 'flute', 'drums'];
  // Piano or cello make the warmest openings; drums never start a song alone if anything else exists.
  const INTRO_PREFERENCE = ['piano', 'cello', 'violin', 'flute', 'drums'];
  const ENTRY_PREFERENCE = ['cello', 'piano', 'violin', 'flute'];

  // Every part settles on a D minor chord tone, so the last bar always resolves.
  const CADENCE_NOTES = {
    cello: ['D2'],
    flute: ['D5'],
    violin: ['A4'],
    piano: PIANO_CHORDS[0],
    drums: [],
  };

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

  function percentileOf(sorted, p) {
    if (!sorted.length) return 0;
    const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
    return sorted[i];
  }

  function gentleSwell(n, bars) {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const u = (i / Math.max(1, n - 1)) * bars;
      out[i] = 0.25 + 0.6 * Math.sin(Math.PI * (u % 1)) ** 2;
    }
    return out;
  }

  // A shy or noisy take still has to sound like music in the song.
  function shapeTake(envelope, bars = PART_BARS) {
    const src = Array.from(envelope || []).map((v) => (Number.isFinite(v) ? v : 0));
    const n = Math.max(2, src.length);
    const sorted = src.slice().sort((a, b) => a - b);
    const lo = percentileOf(sorted, 0.05);
    const hi = percentileOf(sorted, 0.95);
    const range = hi - lo;
    const swell = gentleSwell(n, bars);
    const filled = src.length < 2 || range < 0.08;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const norm = filled ? 0 : Math.min(1, Math.max(0, (src[i] - lo) / range));
      const v = filled ? swell[i] * 0.7 + norm * 0.3 : norm;
      out[i] = 0.08 + 0.92 * v;
    }
    smoothInPlace(out, 0.35);
    return { envelope: out, filled };
  }

  function smoothInPlace(arr, alpha) {
    for (let i = 1; i < arr.length; i += 1) arr[i] = arr[i - 1] + (arr[i] - arr[i - 1]) * alpha;
    for (let i = arr.length - 2; i >= 0; i -= 1) arr[i] = arr[i + 1] + (arr[i] - arr[i + 1]) * alpha;
  }

  function sectionAtBar(song, bar) {
    if (!song) return null;
    for (let i = song.sections.length - 1; i >= 0; i -= 1) {
      if (bar >= song.sections[i].startBar) return { section: song.sections[i], index: i };
    }
    return { section: song.sections[0], index: 0 };
  }

  function sampleLoop(env, frac) {
    if (!env || !env.length) return 0;
    const pos = Math.min(0.999999, Math.max(0, frac)) * (env.length - 1);
    const i = Math.floor(pos);
    const f = pos - i;
    const a = env[i];
    const b = env[Math.min(env.length - 1, i + 1)];
    return a + (b - a) * f;
  }

  function songMixAt(song, timeMs, tempo = TEMPO_BPM) {
    const bar = Math.max(0, timeMs / msPerBar(tempo));
    const done = bar >= song.totalBars;
    const { section, index } = sectionAtBar(song, Math.min(bar, song.totalBars - 1e-6));
    const inSection = bar - section.startBar;
    const lastBar = Boolean(section.ending) && inSection >= section.bars - 1;
    const voices = {};
    song.order.forEach((kind) => {
      const active = !done && section.active.includes(kind);
      let env = 0;
      if (active) {
        env = sampleLoop(song.tracks[kind].envelope, (bar % PART_BARS) / PART_BARS);
        if (section.entering === kind) env *= Math.min(1, inSection / 0.5);
        // The final bar ignores the take and rings out the same way every time.
        if (lastBar) env = 0.75 * (1 - (inSection - (section.bars - 1))) ** 1.4;
      }
      voices[kind] = {
        env,
        active,
        muted: !active || (kind === 'drums' && lastBar),
        cadence: lastBar ? CADENCE_NOTES[kind] : null,
        entering: section.entering === kind,
      };
    });
    const intensity = section.active.length / song.order.length;
    return {
      bar,
      totalBeats: bar * BEATS_PER_BAR,
      done,
      section,
      sectionIndex: index,
      lastBar,
      density: 0.35 + 0.4 * intensity,
      progress: Math.min(1, bar / song.totalBars),
      voices,
    };
  }

  function guideAt(song, kind, timeMs, options = {}) {
    const behindMs = options.behindMs ?? 1500;
    const aheadMs = options.aheadMs ?? 3000;
    const points = options.points ?? 90;
    const tempo = options.tempo ?? TEMPO_BPM;
    const target = (t) => {
      const voice = songMixAt(song, t, tempo).voices[kind];
      return voice && voice.active ? voice.env : null;
    };
    const line = [];
    for (let i = 0; i < points; i += 1) {
      const t = timeMs - behindMs + (i / (points - 1)) * (behindMs + aheadMs);
      line.push(t < 0 ? null : target(t));
    }
    const now = target(timeMs);
    const soon = target(timeMs + 300);
    let cue = 'rest';
    if (now !== null && soon !== null) {
      const diff = soon - now;
      cue = diff > 0.04 ? 'in' : diff < -0.04 ? 'out' : 'hold';
    } else if (now === null && soon !== null) {
      cue = 'ready';
    }
    return { now, cue, line, nowIndex: Math.round(((points - 1) * behindMs) / (behindMs + aheadMs)) };
  }

  const CHEERS = {
    record: [
      'Lovely. Just breathe the way that feels good.',
      "That's your sound. Keep it easy.",
      'Nice and slow. The band is listening.',
    ],
    listen: [
      'This is your song.',
      'Every swell here came from your breath.',
      'Listen to them play together.',
      'Here it comes, everyone at once.',
    ],
    perform: [
      "You're playing with your own band.",
      'Lovely, keep flowing with it.',
      'No rush. Follow the line or make it your own.',
      'Beautiful. The hall is all yours.',
      'Big breath for the finish.',
    ],
  };

  // No scores or grades: messages only rotate through the song, never judge.
  function cheer(context, index) {
    const list = CHEERS[context] || CHEERS.listen;
    return list[Math.abs(Math.floor(index || 0)) % list.length];
  }

  function songDurationMs(song, tempo = TEMPO_BPM) {
    return song.totalBars * msPerBar(tempo);
  }

  const exported = {
    PART_BARS,
    SECTION_BARS,
    ENDING_BARS,
    RECORD_ORDER,
    arrangeSong,
    sectionAtBar,
    shapeTake,
    songMixAt,
    songDurationMs,
    guideAt,
    cheer,
    CADENCE_NOTES,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  root.BreathLib = Object.assign(root.BreathLib || {}, exported);
})(typeof window !== 'undefined' ? window : globalThis);
