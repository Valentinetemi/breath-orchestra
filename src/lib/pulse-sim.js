'use strict';

(function (root) {
  function lastNumeric(list) {
    if (!Array.isArray(list) || !list.length) return null;
    const last = list[list.length - 1];
    const value = typeof last === 'number' ? last : last && last.value;
    return Number.isFinite(value) ? value : null;
  }

  function readPulseMetrics(payload) {
    const cardio = payload && payload.cardio;
    const pulse = payload && payload.pulse;
    const rate = lastNumeric(cardio && cardio.pulseRate)
      ?? lastNumeric(pulse && pulse.rate)
      ?? lastNumeric(pulse && pulse.pulseRate);
    const traces = (cardio && cardio.arterialPressureTrace)
      || (pulse && pulse.trace)
      || [];
    const samples = traces.map((item) => {
      if (typeof item === 'number') return item;
      return Number(item && item.value);
    }).filter((value) => Number.isFinite(value));
    return {
      rate: Number.isFinite(rate) ? rate : null,
      samples,
      last: samples.length ? samples[samples.length - 1] : null,
    };
  }

  class PulseTracker {
    constructor() {
      this.rate = null;
      this.value = 0;
      this.beat = false;
      this.lastValue = null;
      this.rising = false;
    }

    ingest(payload) {
      const read = readPulseMetrics(payload);
      if (read.rate !== null) this.rate = read.rate;
      this.beat = false;
      if (!read.samples.length) return this.snapshot();
      for (const value of read.samples) this._push(value);
      return this.snapshot();
    }

    _push(value) {
      if (this.lastValue === null) {
        this.lastValue = value;
        this.value = value;
        return;
      }
      if (value > this.lastValue + 0.002) this.rising = true;
      if (this.rising && value < this.lastValue - 0.002) {
        this.beat = true;
        this.rising = false;
      }
      this.lastValue = value;
      this.value = value;
    }

    snapshot() {
      return { rate: this.rate, value: this.value, beat: this.beat };
    }
  }

  class PulseSimulator {
    constructor(options = {}) {
      this.baseBpm = options.bpm ?? 70;
      this.t0 = null;
      this.lastMs = null;
      this.rate = this.baseBpm;
      this.wasPeak = false;
    }

    tick(nowMs) {
      if (this.t0 === null) this.t0 = nowMs;
      if (this.lastMs === null) this.lastMs = nowMs;
      const elapsed = (nowMs - this.t0) / 1000;
      this.rate = this.baseBpm + 4 * Math.sin(elapsed * 0.11) + 1.4 * Math.sin(elapsed * 0.31);
      const period = 60 / this.rate;
      const u = (elapsed / period) % 1;
      // A soft arterial-shaped bump: sharp rise, slower fall.
      const value = u < 0.18
        ? Math.sin((u / 0.18) * Math.PI)
        : Math.max(0, 0.28 * Math.exp(-(u - 0.18) * 6));
      const beat = u < 0.18 && value >= 0.92 && !this.wasPeak;
      this.wasPeak = value >= 0.92;
      this.lastMs = nowMs;
      return { rate: this.rate, value, beat, timestampMs: nowMs };
    }
  }

  const exported = { PulseSimulator, PulseTracker, readPulseMetrics };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  root.BreathLib = Object.assign(root.BreathLib || {}, exported);
})(typeof window !== 'undefined' ? window : globalThis);
