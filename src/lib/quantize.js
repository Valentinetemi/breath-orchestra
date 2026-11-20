'use strict';

(function (root) {


  const {
    TEMPO_BPM,
    BEATS_PER_BAR,
    MAX_LOOP_BARS,
    msPerBeat,
    msPerBar,
  } = (typeof module !== 'undefined' && module.exports)
    ? require('./music-theory')
    : root.BreathLib;

  function transportBeats(nowMs, startMs, tempo = TEMPO_BPM) {
    return (nowMs - startMs) / msPerBeat(tempo);
  }

  function barAndBeat(nowMs, startMs, tempo = TEMPO_BPM, beats = BEATS_PER_BAR) {
    const totalBeats = Math.max(0, transportBeats(nowMs, startMs, tempo));
    const bar = Math.floor(totalBeats / beats) + 1;
    const beat = Math.floor(totalBeats % beats) + 1;
    const beatFrac = totalBeats - Math.floor(totalBeats);
    return { bar, beat, beatFrac, totalBeats };
  }

  function nextBarTime(nowMs, startMs, tempo = TEMPO_BPM, beats = BEATS_PER_BAR) {
    const barMs = msPerBar(tempo, beats);
    const elapsed = nowMs - startMs;
    if (elapsed <= 0) return startMs;
    // Snap "almost on the bar" to the current line so arming feels immediate.
    const barsElapsed = elapsed / barMs;
    const fraction = barsElapsed - Math.floor(barsElapsed);
    if (fraction < 0.04 || fraction > 0.98) {
      const at = startMs + Math.round(barsElapsed) * barMs;
      return at < nowMs + 8 ? at + barMs : at;
    }
    return startMs + Math.ceil(barsElapsed) * barMs;
  }

  function quantizeDurationMs(
    durationMs,
    tempo = TEMPO_BPM,
    beats = BEATS_PER_BAR,
    maxBars = MAX_LOOP_BARS,
  ) {
    const barMs = msPerBar(tempo, beats);
    const bars = Math.min(maxBars, Math.max(1, Math.round(durationMs / barMs)));
    return { bars, durationMs: bars * barMs, beats: bars * beats };
  }

  function resampleEnvelope(samples, durationMs, rateHz = 30) {
    const n = Math.max(2, Math.round((durationMs / 1000) * rateHz));
    const envelope = new Float32Array(n);
    if (!samples.length) return envelope;

    const pts = samples
      .map((s) => ({ t: s.t, v: Math.min(1, Math.max(0, s.v)) }))
      .sort((a, b) => a.t - b.t);

    let j = 0;
    for (let i = 0; i < n; i += 1) {
      const t = (i / (n - 1)) * durationMs;
      while (j + 1 < pts.length && pts[j + 1].t < t) j += 1;
      if (t <= pts[0].t) {
        envelope[i] = pts[0].v;
      } else if (t >= pts[pts.length - 1].t) {
        envelope[i] = pts[pts.length - 1].v;
      } else {
        const a = pts[j];
        const b = pts[Math.min(pts.length - 1, j + 1)];
        const span = b.t - a.t || 1;
        const f = (t - a.t) / span;
        envelope[i] = a.v + (b.v - a.v) * f;
      }
    }
    return envelope;
  }

  class EnvelopeRecorder {
    constructor() {
      this.reset();
    }

    reset() {
      this.startMs = null;
      this.samples = [];
      this.paused = false;
      this._last = null;
    }

    start(startMs) {
      this.startMs = startMs;
      this.samples = [];
      this.paused = false;
      this._last = null;
    }

    setPaused(paused) {
      this.paused = Boolean(paused);
    }

    add(envelope, nowMs) {
      if (this.startMs === null) return;
      const t = nowMs - this.startMs;
      if (t < 0) return;
      // Keep the grid honest: a pause writes silence instead of stretching time.
      const v = this.paused ? 0 : envelope;
      this.samples.push({ t, v });
      this._last = { t, v };
    }

    stop(endMs, tempo = TEMPO_BPM) {
      if (this.startMs === null) {
        return { envelope: new Float32Array(2), bars: 1, durationMs: msPerBar(tempo), beats: BEATS_PER_BAR };
      }
      const raw = Math.max(0, endMs - this.startMs);
      const q = quantizeDurationMs(raw, tempo);
      const envelope = resampleEnvelope(this.samples, q.durationMs);
      this.reset();
      return { envelope, ...q };
    }
  }

  const exported = {
    transportBeats,
    barAndBeat,
    nextBarTime,
    quantizeDurationMs,
    resampleEnvelope,
    EnvelopeRecorder,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  root.BreathLib = Object.assign(root.BreathLib || {}, exported);
})(typeof window !== 'undefined' ? window : globalThis);
