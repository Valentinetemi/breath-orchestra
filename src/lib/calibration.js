'use strict';

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function median(values) {
  return percentile(values, 0.5);
}

class BreathCalibrator {
  constructor(options = {}) {
    this.durationMs = options.durationMs ?? 15000;
    this.rollingExpand = options.rollingExpand ?? 0.015;
    this.rollingShrink = options.rollingShrink ?? 0.004;
    this.smooth = options.smooth ?? 0.25;
    this.onThreshRatio = options.onThreshRatio ?? 0.045;
    this.offThreshRatio = options.offThreshRatio ?? 0.015;
    this.minRangeRatio = options.minRangeRatio ?? 0.08;
    this.invert = Boolean(options.invert);
    this.reset();
  }

  reset() {
    this.samples = [];
    this.startedAt = null;
    this.complete = false;
    this.p5 = 0;
    this.p95 = 1;
    this.smoothed = null;
    this.prevSmoothed = null;
    this.phase = 'hold';
    this._rolling = [];
  }

  addSample(value, timestampMs) {
    if (!Number.isFinite(value)) return this.state();
    if (this.startedAt === null) this.startedAt = timestampMs;
    this.samples.push({ t: timestampMs, v: value });
    this._rolling.push(value);
    if (this._rolling.length > 600) this._rolling.shift();

    if (!this.complete && timestampMs - this.startedAt >= this.durationMs - 50) {
      this._setRangeFrom(this.samples.map((s) => s.v));
      this.complete = true;
    } else if (!this.complete) {
      this._setRangeFrom(this.samples.map((s) => s.v));
    } else {
      this._nudgeRange();
    }

    this._updatePhase(value);
    return this.state();
  }

  _setRangeFrom(values) {
    if (values.length < 2) return;
    const lo = percentile(values, 0.05);
    const hi = percentile(values, 0.95);
    const mid = median(values);
    const minSpan = Math.max(Math.abs(mid) * this.minRangeRatio, 1e-3);
    if (hi - lo < minSpan) {
      this.p5 = mid - minSpan / 2;
      this.p95 = mid + minSpan / 2;
    } else {
      this.p5 = lo;
      this.p95 = hi;
    }
  }

  _nudgeRange() {
    const lo = percentile(this._rolling, 0.05);
    const hi = percentile(this._rolling, 0.95);
    if (lo < this.p5) this.p5 += (lo - this.p5) * this.rollingExpand;
    else this.p5 += (lo - this.p5) * this.rollingShrink;
    if (hi > this.p95) this.p95 += (hi - this.p95) * this.rollingExpand;
    else this.p95 += (hi - this.p95) * this.rollingShrink;
    if (this.p95 - this.p5 < 1e-3) this.p95 = this.p5 + 1e-3;
  }

  normalize(value) {
    const span = this.p95 - this.p5 || 1;
    let n = (value - this.p5) / span;
    n = Math.min(1, Math.max(0, n));
    return this.invert ? 1 - n : n;
  }

  _updatePhase(value) {
    // Slope is taken in units of the current range, so a widening scale doesn't hide the inhale.
    if (this.smoothed === null) {
      this.smoothed = value;
      this.prevSmoothed = value;
      this.phase = 'hold';
      return;
    }
    this.prevSmoothed = this.smoothed;
    this.smoothed += (value - this.smoothed) * this.smooth;
    const span = Math.max(this.p95 - this.p5, 1e-3);
    const slope = (this.smoothed - this.prevSmoothed) / span;
    if (slope > this.onThreshRatio) this.phase = 'inhale';
    else if (slope < -this.onThreshRatio) this.phase = 'exhale';
    else if (Math.abs(slope) < this.offThreshRatio) this.phase = 'hold';
  }

  progress(nowMs) {
    if (this.startedAt === null) return 0;
    return Math.min(1, (nowMs - this.startedAt) / this.durationMs);
  }

  state() {
    const last = this.samples.length ? this.samples[this.samples.length - 1].v : 0;
    return {
      complete: this.complete,
      envelope: this.normalize(last),
      phase: this.phase,
      p5: this.p5,
      p95: this.p95,
      sampleCount: this.samples.length,
    };
  }
}

module.exports = { BreathCalibrator, percentile, median };
if (typeof window !== 'undefined') {
  window.BreathLib = Object.assign(window.BreathLib || {}, {
    BreathCalibrator, percentile, median,
  });
}

