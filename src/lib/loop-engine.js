'use strict';

(function (root) {


  const { STAGE_SLOTS, MAX_LAYERS, sectionSlots } = (typeof module !== 'undefined' && module.exports)
    ? require('./music-theory')
    : root.BreathLib;

  class LoopEngine {
    constructor(options = {}) {
      this.maxLayers = options.maxLayers ?? MAX_LAYERS;
      this.slots = options.slots ?? STAGE_SLOTS;
      this.layers = [];
      this.nextId = 1;
      this.usedSlots = new Set();
    }

    allocateSlot(instrument) {
      const section = sectionSlots(instrument);
      const free = section.find((slot) => !this.usedSlots.has(slot.id));
      if (free) {
        this.usedSlots.add(free.id);
        return { ...free };
      }
      const home = section[section.length - 1] || this.slots[0];
      const overflow = this.layers.filter((layer) => layer.instrument === instrument).length;
      const id = `${home.id}-${this.nextId}`;
      this.usedSlots.add(id);
      return {
        ...home,
        id,
        x: home.x + (overflow % 2 === 0 ? 5 : -4),
        y: home.y + 3 + overflow,
        scale: (home.scale || 1) * 0.9,
      };
    }

    addLayer({ instrument, envelope, durationMs, bars, beats, pulseEnvelope }) {
      if (this.layers.length >= this.maxLayers) {
        return { error: 'full', layer: null };
      }
      const slot = this.allocateSlot(instrument);
      const layer = {
        id: `layer-${this.nextId}`,
        instrument,
        envelope: envelope instanceof Float32Array ? envelope : Float32Array.from(envelope || []),
        pulseEnvelope: pulseEnvelope
          ? (pulseEnvelope instanceof Float32Array ? pulseEnvelope : Float32Array.from(pulseEnvelope))
          : null,
        durationMs,
        bars,
        beats,
        muted: false,
        slot,
      };
      this.nextId += 1;
      this.layers.push(layer);
      return { error: null, layer };
    }

    get(id) {
      return this.layers.find((layer) => layer.id === id) || null;
    }

    mute(id, muted) {
      const layer = this.get(id);
      if (!layer) return null;
      layer.muted = muted;
      return layer;
    }

    toggleMute(id) {
      const layer = this.get(id);
      if (!layer) return null;
      layer.muted = !layer.muted;
      return layer;
    }

    remove(id) {
      const index = this.layers.findIndex((layer) => layer.id === id);
      if (index < 0) return null;
      const [layer] = this.layers.splice(index, 1);
      this.usedSlots.delete(layer.slot.id);
      return layer;
    }

    undo() {
      if (!this.layers.length) return null;
      return this.remove(this.layers[this.layers.length - 1].id);
    }

    _sample(list, durationMs, timeMs) {
      if (!list || !list.length || durationMs <= 0) return 0;
      let t = timeMs % durationMs;
      if (t < 0) t += durationMs;
      const pos = (t / durationMs) * list.length;
      const i = Math.floor(pos) % list.length;
      const f = pos - Math.floor(pos);
      const a = list[i];
      const b = list[(i + 1) % list.length];
      return a + (b - a) * f;
    }

    envelopeAt(layer, timeMs) {
      if (!layer || layer.muted) return 0;
      return this._sample(layer.envelope, layer.durationMs, timeMs);
    }

    pulseAt(layer, timeMs) {
      if (!layer || layer.muted || !layer.pulseEnvelope || !layer.pulseEnvelope.length) return 0.48;
      return this._sample(layer.pulseEnvelope, layer.durationMs, timeMs);
    }
  }

  const exported = { LoopEngine };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  root.BreathLib = Object.assign(root.BreathLib || {}, exported);
})(typeof window !== 'undefined' ? window : globalThis);
