'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const song = require('../src/lib/song');

function part(instrument, env = [0.2, 0.8, 0.4, 0.9]) {
  return { instrument, envelope: Float32Array.from(env) };
}

describe('arrangeSong', () => {
  it('returns null with nothing recorded', () => {
    assert.equal(song.arrangeSong([]), null);
  });

  it('opens with one part, layers the rest in, then plays together and ends', () => {
    const s = song.arrangeSong(['cello', 'piano', 'violin', 'flute', 'drums'].map((k) => part(k)));
    assert.deepEqual(s.order, ['piano', 'cello', 'drums', 'violin', 'flute']);
    assert.deepEqual(s.sections.map((x) => x.name),
      ['Intro', 'Cello joins', 'Drums joins', 'Violin joins', 'Flute joins', 'Everyone', 'Ending']);
    assert.deepEqual(s.sections[0].active, ['piano']);
    assert.equal(s.sections.at(-2).active.length, 5);
    assert.equal(s.sections.at(-1).ending, true);
    assert.equal(s.totalBars, 4 * 6 + 2);
  });

  it('keeps sections back to back with no gaps', () => {
    const s = song.arrangeSong([part('flute'), part('cello')]);
    let bar = 0;
    for (const section of s.sections) {
      assert.equal(section.startBar, bar);
      bar += section.bars;
    }
    assert.equal(bar, s.totalBars);
  });

  it('only adds one new part per section', () => {
    const s = song.arrangeSong(['cello', 'violin', 'flute'].map((k) => part(k)));
    for (let i = 1; i < s.sections.length; i += 1) {
      assert.ok(s.sections[i].active.length - s.sections[i - 1].active.length <= 1);
    }
  });

  it('never opens on drums when a melodic part exists', () => {
    const s = song.arrangeSong([part('drums'), part('flute')]);
    assert.equal(s.order[0], 'flute');
  });

  it('still makes a song from a single part', () => {
    const s = song.arrangeSong([part('drums')]);
    assert.deepEqual(s.sections.map((x) => x.name), ['Intro', 'Again', 'Ending']);
  });

  it('uses the latest take when an instrument is recorded twice', () => {
    const first = part('cello', [0, 0]);
    const second = part('cello', [1, 1]);
    const s = song.arrangeSong([first, second]);
    assert.equal(s.tracks.cello, second);
    assert.equal(s.order.length, 1);
  });

  it('finds the section for any bar', () => {
    const s = song.arrangeSong([part('cello'), part('piano')]);
    assert.equal(song.sectionAtBar(s, 0).section.name, 'Intro');
    assert.equal(song.sectionAtBar(s, 5.5).section.name, 'Cello joins');
    assert.equal(song.sectionAtBar(s, s.totalBars - 0.1).section.name, 'Ending');
  });
});

describe('shapeTake', () => {
  it('stretches a quiet but real breath to the full range', () => {
    const env = Array.from({ length: 120 }, (_, i) => 0.4 + 0.1 * Math.sin(i / 6));
    const { envelope, filled } = song.shapeTake(env);
    assert.equal(filled, false);
    assert.ok(Math.max(...envelope) > 0.85);
    assert.ok(Math.min(...envelope) < 0.25);
  });

  it('fills a flat take with a gentle swell so the song never goes dead', () => {
    const { envelope, filled } = song.shapeTake(new Float32Array(120));
    assert.equal(filled, true);
    assert.ok(Math.max(...envelope) > 0.5);
  });

  it('stays between 0 and 1 and keeps the length', () => {
    const env = Array.from({ length: 90 }, (_, i) => (i % 7 === 0 ? 5 : -3));
    const { envelope } = song.shapeTake(env);
    assert.equal(envelope.length, 90);
    for (const v of envelope) assert.ok(v >= 0 && v <= 1);
  });

  it('copes with junk input', () => {
    const { envelope } = song.shapeTake([NaN, undefined]);
    assert.ok(envelope.every((v) => Number.isFinite(v)));
  });
});
