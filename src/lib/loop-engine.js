'use strict';

const { STAGE_SLOTS, MAX_LAYERS } = require('./music-theory');

class LoopEngine {
  constructor(options = {}) {
    this.maxLayers = options.maxLayers ?? MAX_LAYERS;
    this.slots = options.slots ?? STAGE_SLOTS;
    this.layers = [];
    this.nextId = 1;
    this.usedSlots = new Set();
  }

  allocateSlot() {
    const free = this.slots.find((slot) => !this.usedSlots.has(slot.id));
    if (free) {
      this.usedSlots.add(free.id);
      return { ...free };
    }
    const fallback = this.slots[this.layers.length % this.slots.length];
    const id = `${fallback.id}-${this.nextId}`;
    this.usedSlots.add(id);
    return { ...fallback, id, x: fallback.x + 3, y: fallback.y + 2 };
  }

  addLayer({ instrument, envelope, durationMs, bars, beats }) {
    if (this.layers.length >= this.maxLayers) {
      return { error: 'full', layer: null };
    }
    const slot = this.allocateSlot();
    const layer = {
      id: `layer-${this.nextId}`,
      instrument,
      envelope: envelope instanceof Float32Array ? envelope : Float32Array.from(envelope || []),
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

  envelopeAt(layer, timeMs) {
    if (!layer || !layer.envelope.length || layer.durationMs <= 0) return 0;
    if (layer.muted) return 0;
    let t = timeMs % layer.durationMs;
    if (t < 0) t += layer.durationMs;
    const pos = (t / layer.durationMs) * layer.envelope.length;
    const i = Math.floor(pos) % layer.envelope.length;
    const f = pos - Math.floor(pos);
    const a = layer.envelope[i];
    const b = layer.envelope[(i + 1) % layer.envelope.length];
    return a + (b - a) * f;
  }
}

module.exports = { LoopEngine };
if (typeof window !== 'undefined') {
  window.BreathLib = Object.assign(window.BreathLib || {}, { LoopEngine });
}

