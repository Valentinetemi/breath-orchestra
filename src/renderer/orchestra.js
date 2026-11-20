'use strict';

class Orchestra {
  constructor() {
    this.started = false;
    this.live = null;
    this.layers = new Map();
    this.currentKind = 'cello';
    this.master = null;
  }

  async start() {
    if (this.started) return;
    if (typeof Tone === 'undefined') throw new Error('Tone.js did not load');
    await Tone.start();
    Tone.Transport.bpm.value = window.BreathLib.TEMPO_BPM;
    Tone.Transport.timeSignature = window.BreathLib.BEATS_PER_BAR;
    this.master = new Tone.Gain(0.85).toDestination();
    this.reverb = new Tone.Reverb({ decay: 3.2, wet: 0.22 }).connect(this.master);
    await this.reverb.ready;
    Tone.Transport.start();
    this.started = true;
    this.setLiveInstrument('cello');
  }

  _voice(kind) {
    const gain = new Tone.Gain(0);
    const envFilter = new Tone.Filter(800, 'lowpass');
    let source;
    if (kind === 'flute') {
      const air = new Tone.Noise('pink').start();
      const airGain = new Tone.Gain(0.05);
      const airFilter = new Tone.Filter(1800, 'highpass');
      air.connect(airFilter);
      airFilter.connect(airGain);
      const osc = new Tone.Oscillator({ type: 'sine', frequency: 440 }).start();
      const osc2 = new Tone.Oscillator({ type: 'triangle', frequency: 440, volume: -14 }).start();
      const vib = new Tone.Vibrato(5, 0.06);
      osc.connect(vib);
      osc2.connect(vib);
      vib.connect(envFilter);
      airGain.connect(envFilter);
      envFilter.frequency.value = 2200;
      source = { osc, osc2, air, airGain, vib, envFilter };
    } else if (kind === 'violin') {
      const osc = new Tone.Oscillator({ type: 'sawtooth', frequency: 440 }).start();
      const osc2 = new Tone.Oscillator({ type: 'triangle', frequency: 440, volume: -8 }).start();
      const vib = new Tone.Vibrato(5.5, 0.08);
      osc.connect(vib);
      osc2.connect(vib);
      vib.connect(envFilter);
      envFilter.frequency.value = 1600;
      source = { osc, osc2, vib, envFilter };
    } else {
      const osc = new Tone.Oscillator({ type: 'sawtooth', frequency: 146, volume: -4 }).start();
      const osc2 = new Tone.Oscillator({ type: 'square', frequency: 146, volume: -16 }).start();
      const vib = new Tone.Vibrato(4.2, 0.04);
      osc.connect(vib);
      osc2.connect(vib);
      vib.connect(envFilter);
      envFilter.frequency.value = 700;
      source = { osc, osc2, vib, envFilter };
    }
    envFilter.connect(gain);
    gain.connect(this.reverb);
    return { kind, gain, envFilter, source, notes: window.BreathLib.INSTRUMENTS[kind].notes };
  }

  _setNotes(voice, beat) {
    const notes = voice.notes;
    const name = notes[Math.floor(beat) % notes.length];
    const freq = Tone.Frequency(name).toFrequency();
    if (voice.source.osc) voice.source.osc.frequency.rampTo(freq, 0.08);
    if (voice.source.osc2) voice.source.osc2.frequency.rampTo(freq * (voice.kind === 'cello' ? 0.5 : 1), 0.08);
  }

  setLiveInstrument(kind) {
    this.currentKind = kind;
    if (!this.started) return;
    if (this.live) this._disposeVoice(this.live);
    this.live = this._voice(kind);
    this._setNotes(this.live, 0);
  }

  setLiveEnvelope(env, totalBeats) {
    if (!this.live) return;
    const v = Math.min(1, Math.max(0, env));
    this.live.gain.gain.rampTo(v * 0.7, 0.04);
    const base = this.live.kind === 'cello' ? 420 : this.live.kind === 'flute' ? 1600 : 900;
    this.live.envFilter.frequency.rampTo(base + v * (this.live.kind === 'cello' ? 900 : 1400), 0.05);
    this._setNotes(this.live, totalBeats || 0);
  }

  addLayer(layer) {
    if (!this.started) return;
    const voice = this._voice(layer.instrument);
    this.layers.set(layer.id, { voice, layer });
  }

  updateLayer(id, env, totalBeats, muted) {
    const entry = this.layers.get(id);
    if (!entry) return;
    const v = muted ? 0 : Math.min(1, Math.max(0, env));
    entry.voice.gain.gain.rampTo(v * 0.62, 0.04);
    this._setNotes(entry.voice, totalBeats || 0);
  }

  removeLayer(id) {
    const entry = this.layers.get(id);
    if (!entry) return;
    this._disposeVoice(entry.voice);
    this.layers.delete(id);
  }

  _disposeVoice(voice) {
    try {
      voice.gain.gain.rampTo(0, 0.1);
    } catch {
      // already gone
    }
    setTimeout(() => {
      Object.values(voice.source).forEach((node) => {
        if (node && typeof node.dispose === 'function') node.dispose();
      });
      voice.gain.dispose();
      voice.envFilter.dispose();
    }, 160);
  }
}

if (typeof window !== 'undefined') {
  window.BreathLib = Object.assign(window.BreathLib || {}, { Orchestra });
}
