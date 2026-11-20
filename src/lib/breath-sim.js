'use strict';

class BreathSimulator {
  constructor(options = {}) {
    this.bpm = options.bpm ?? 13;
    this.baseline = options.baseline ?? 0.42;
    this.amplitude = options.amplitude ?? 0.38;
    this.manual = false;
    this.manualTarget = 0.12;
    this.manualValue = 0.12;
    this.t0 = null;
    this.lastMs = null;
    this.phaseOffset = 0;
    this.periodJitter = 0;
    this.wander = 1;
  }

  setManual(enabled) {
    this.manual = Boolean(enabled);
  }

  setManualTarget(level) {
    this.manual = true;
    this.manualTarget = Math.min(1, Math.max(0, level));
  }

  inhale() {
    this.setManualTarget(1);
  }

  exhale() {
    this.setManualTarget(0.06);
  }

  tick(nowMs) {
    if (this.t0 == null) this.t0 = nowMs;
    if (this.lastMs == null) this.lastMs = nowMs;
    const dt = Math.min(0.08, Math.max(0, (nowMs - this.lastMs) / 1000));
    this.lastMs = nowMs;

    let env;
    if (this.manual) {
      const tau = this.manualTarget > this.manualValue ? 0.42 : 0.68;
      const a = 1 - Math.exp(-dt / tau);
      this.manualValue += (this.manualTarget - this.manualValue) * a;
      env = this.manualValue;
    } else {
      const elapsed = (nowMs - this.t0) / 1000;
      // Nudge the period slightly every cycle so it doesn't sound mechanical.
      const period = 60 / this.bpm + this.periodJitter;
      const cycle = (elapsed + this.phaseOffset) / period;
      if (Math.floor(cycle) !== Math.floor((elapsed - dt + this.phaseOffset) / period)) {
        this.periodJitter = (Math.sin(elapsed * 0.37) * 0.18);
        this.wander = 0.9 + 0.1 * Math.sin(elapsed * 0.23);
      }
      let u = cycle - Math.floor(cycle);
      if (u < 0.4) {
        const x = u / 0.4;
        env = 0.5 - 0.5 * Math.cos(Math.PI * x);
      } else if (u < 0.9) {
        const x = (u - 0.4) / 0.5;
        env = 0.5 + 0.5 * Math.cos(Math.PI * x);
      } else {
        env = 0.02 * (1 - (u - 0.9) / 0.1);
      }
      env *= this.wander;
    }

    const noise = (Math.sin(nowMs * 0.013) + Math.sin(nowMs * 0.029)) * 0.008;
    const value = this.baseline + env * this.amplitude + noise;
    return { value, envelopeHint: env, timestampMs: nowMs };
  }
}

module.exports = { BreathSimulator };
if (typeof window !== 'undefined') {
  window.BreathLib = Object.assign(window.BreathLib || {}, { BreathSimulator });
}

