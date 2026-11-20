'use strict';

(function (root) {
  const lib = (typeof module !== 'undefined' && module.exports)
    ? Object.assign({}, require('../lib/music-theory'), require('../lib/drum-groove'))
    : root.BreathLib;

  const ToneRef = typeof Tone !== 'undefined' ? Tone : root.Tone;

  class Orchestra {
    constructor() {
      this.started = false;
      this.live = null;
      this.layers = new Map();
      this.currentKind = 'cello';
      this.master = null;
      this._lastStep = new Map();
    }

    async start() {
      if (this.started) return;
      if (typeof ToneRef === 'undefined') throw new Error('Tone.js did not load');
      if (typeof ToneRef.start === 'function') await ToneRef.start();
      if (ToneRef.Transport && ToneRef.Transport.bpm) {
        ToneRef.Transport.bpm.value = lib.TEMPO_BPM;
        ToneRef.Transport.timeSignature = lib.BEATS_PER_BAR;
        if (typeof ToneRef.Transport.start === 'function') ToneRef.Transport.start();
      }
      this.master = new ToneRef.Gain(0.85).toDestination();
      this.reverb = new ToneRef.Reverb({ decay: 3.2, wet: 0.22 }).connect(this.master);
      if (this.reverb.ready && typeof this.reverb.ready.then === 'function') {
        await this.reverb.ready;
      }
      this.started = true;
      this.setLiveInstrument(this.currentKind || 'cello');
    }

    _voice(kind) {
      if (kind === 'piano') return this._pianoVoice();
      const gain = new ToneRef.Gain(0);
      const envFilter = new ToneRef.Filter(800, 'lowpass');
      let source;
      if (kind === 'flute') {
        const air = new ToneRef.Noise('pink').start();
        const airGain = new ToneRef.Gain(0.05);
        const airFilter = new ToneRef.Filter(1800, 'highpass');
        air.connect(airFilter);
        airFilter.connect(airGain);
        const osc = new ToneRef.Oscillator({ type: 'sine', frequency: 440 }).start();
        const osc2 = new ToneRef.Oscillator({ type: 'triangle', frequency: 440, volume: -14 }).start();
        const vib = new ToneRef.Vibrato(5, 0.06);
        osc.connect(vib);
        osc2.connect(vib);
        vib.connect(envFilter);
        airGain.connect(envFilter);
        envFilter.frequency.value = 2200;
        source = { osc, osc2, air, airGain, vib, envFilter };
      } else if (kind === 'violin') {
        const osc = new ToneRef.Oscillator({ type: 'sawtooth', frequency: 440 }).start();
        const osc2 = new ToneRef.Oscillator({ type: 'triangle', frequency: 440, volume: -8 }).start();
        const vib = new ToneRef.Vibrato(5.5, 0.08);
        osc.connect(vib);
        osc2.connect(vib);
        vib.connect(envFilter);
        envFilter.frequency.value = 1600;
        source = { osc, osc2, vib, envFilter };
      } else {
        const osc = new ToneRef.Oscillator({ type: 'sawtooth', frequency: 146, volume: -4 }).start();
        const osc2 = new ToneRef.Oscillator({ type: 'square', frequency: 146, volume: -16 }).start();
        const vib = new ToneRef.Vibrato(4.2, 0.04);
        osc.connect(vib);
        osc2.connect(vib);
        vib.connect(envFilter);
        envFilter.frequency.value = 700;
        source = { osc, osc2, vib, envFilter };
      }
      envFilter.connect(gain);
      gain.connect(this.reverb);
      return { kind, gain, envFilter, source, notes: (lib.INSTRUMENTS[kind] || lib.INSTRUMENTS.cello).notes, hits: [] };
    }

    _pianoVoice() {
      const gain = new ToneRef.Gain(0);
      const envFilter = new ToneRef.Filter(1800, 'lowpass');
      const synth = new ToneRef.PolySynth(ToneRef.Synth, {
        maxPolyphony: 8,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.006, decay: 1.05, sustain: 0.16, release: 1.6 },
      });
      const overlay = new ToneRef.PolySynth(ToneRef.Synth, {
        maxPolyphony: 8,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.004, decay: 0.75, sustain: 0.08, release: 1.3 },
        volume: -9,
      });
      synth.connect(envFilter);
      overlay.connect(envFilter);
      envFilter.connect(gain);
      gain.connect(this.reverb);
      return {
        kind: 'piano',
        gain,
        envFilter,
        source: { synth, overlay, envFilter },
        notes: lib.PIANO_CHORDS[0],
        held: [],
        _chordKey: '',
        hits: [],
      };
    }

    _setNotes(voice, beat) {
      if (!voice || voice.kind === 'piano' || voice.kind === 'drums') return;
      const notes = voice.notes || [];
      if (!notes.length || !ToneRef.Frequency) return;
      const name = notes[Math.floor(beat) % notes.length];
      const freq = ToneRef.Frequency(name).toFrequency();
      if (voice.source.osc) voice.source.osc.frequency.rampTo(freq, 0.08);
      if (voice.source.osc2) voice.source.osc2.frequency.rampTo(freq * (voice.kind === 'cello' ? 0.5 : 1), 0.08);
    }

    _setPiano(voice, env, totalBeats) {
      const chord = lib.pianoChordAt(totalBeats);
      const v = Math.min(1, Math.max(0, env));
      voice.gain.gain.rampTo(v * 0.78, 0.05);
      voice.envFilter.frequency.rampTo(900 + v * 2200, 0.08);
      const key = chord.join(',');
      const synth = voice.source.synth;
      const overlay = voice.source.overlay;
      if (v <= 0.03) {
        if (voice.held.length) {
          if (synth && typeof synth.releaseAll === 'function') synth.releaseAll();
          if (overlay && typeof overlay.releaseAll === 'function') overlay.releaseAll();
          voice.held = [];
          voice._chordKey = '';
        }
        voice.notes = chord;
        return chord;
      }
      if (voice._chordKey !== key) {
        if (voice.held.length) {
          if (synth && typeof synth.releaseAll === 'function') synth.releaseAll();
          if (overlay && typeof overlay.releaseAll === 'function') overlay.releaseAll();
        }
        voice.held = chord.slice();
        voice._chordKey = key;
        if (synth && typeof synth.triggerAttack === 'function') {
          synth.triggerAttack(chord, undefined, 0.4 + v * 0.5);
        }
        if (overlay && typeof overlay.triggerAttack === 'function') {
          overlay.triggerAttack(chord, undefined, 0.2 + v * 0.3);
        }
      }
      voice.notes = chord;
      return chord;
    }

    setLiveInstrument(kind) {
      this.currentKind = kind;
      if (!this.started) return;
      if (this.live) this._disposeVoice(this.live);
      this.live = this._voice(kind);
      if (kind === 'piano') this._setPiano(this.live, 0, 0);
      else this._setNotes(this.live, 0);
    }

    setLiveEnvelope(env, totalBeats, extras = {}) {
      if (!this.live) return { kind: this.currentKind, notes: [], hits: [] };
      if (this.live.kind === 'piano') {
        const notes = this._setPiano(this.live, env, totalBeats);
        return { kind: 'piano', notes, hits: [] };
      }
      const v = Math.min(1, Math.max(0, env));
      this.live.gain.gain.rampTo(v * 0.7, 0.04);
      const base = this.live.kind === 'cello' ? 420 : this.live.kind === 'flute' ? 1600 : 900;
      if (this.live.envFilter) {
        this.live.envFilter.frequency.rampTo(base + v * (this.live.kind === 'cello' ? 900 : 1400), 0.05);
      }
      this._setNotes(this.live, totalBeats || 0);
      return { kind: this.live.kind, notes: this.live.notes || [], hits: [] };
    }

    addLayer(layer) {
      if (!this.started) return;
      const voice = this._voice(layer.instrument);
      this.layers.set(layer.id, { voice, layer });
    }

    updateLayer(id, env, totalBeats, muted, _extras = {}) {
      const entry = this.layers.get(id);
      if (!entry) return { kind: null, notes: [], hits: [] };
      if (entry.voice.kind === 'piano') {
        if (muted) {
          entry.voice.gain.gain.rampTo(0, 0.04);
          return { kind: 'piano', notes: [], hits: [] };
        }
        const notes = this._setPiano(entry.voice, env, totalBeats);
        return { kind: 'piano', notes, hits: [] };
      }
      const v = muted ? 0 : Math.min(1, Math.max(0, env));
      entry.voice.gain.gain.rampTo(v * 0.62, 0.04);
      this._setNotes(entry.voice, totalBeats || 0);
      return { kind: entry.voice.kind, notes: entry.voice.notes || [], hits: [] };
    }

    removeLayer(id) {
      const entry = this.layers.get(id);
      if (!entry) return;
      this._disposeVoice(entry.voice);
      this.layers.delete(id);
      this._lastStep.delete(id);
    }

    describeLive() {
      const voice = this.live;
      if (!voice) return { kind: this.currentKind, started: this.started, nodes: [], connected: false };
      const sourceNames = Object.keys(voice.source || {}).filter((key) => voice.source[key]);
      const gainValue = voice.gain && voice.gain.gain && typeof voice.gain.gain.value === 'number'
        ? voice.gain.gain.value
        : null;
      const connected = Boolean(
        voice.gain && (voice.gain.connections || (voice.envFilter && voice.envFilter.connections) || true),
      );
      return {
        kind: voice.kind,
        started: this.started,
        nodes: sourceNames,
        hasGain: Boolean(voice.gain),
        connected,
        gainValue,
        notes: voice.notes || [],
      };
    }

    _disposeVoice(voice) {
      try {
        if (voice.gain && voice.gain.gain) voice.gain.gain.rampTo(0, 0.1);
        if (voice.source && voice.source.synth && typeof voice.source.synth.releaseAll === 'function') {
          voice.source.synth.releaseAll();
        }
        if (voice.source && voice.source.overlay && typeof voice.source.overlay.releaseAll === 'function') {
          voice.source.overlay.releaseAll();
        }
      } catch {
        // already gone
      }
      const later = (typeof setTimeout === 'function') ? setTimeout : (fn) => fn();
      later(() => {
        Object.values(voice.source || {}).forEach((node) => {
          if (node && typeof node.dispose === 'function') node.dispose();
        });
        if (voice.gain && typeof voice.gain.dispose === 'function') voice.gain.dispose();
        if (voice.envFilter && typeof voice.envFilter.dispose === 'function') voice.envFilter.dispose();
      }, 160);
    }
  }

  const exported = { Orchestra };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  root.BreathLib = Object.assign(root.BreathLib || {}, exported);
})(typeof window !== 'undefined' ? window : globalThis);
