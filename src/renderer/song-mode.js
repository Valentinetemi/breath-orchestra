'use strict';

(function (root) {
  const lib = root.BreathLib;

  function el(id) { return document.getElementById(id); }

  class SongMode {
    constructor(host) {
      this.host = host;
      this.orchestra = host.orchestra;
      this.speed = host.speed || 1;
      this.barMs = lib.msPerBar();
      this.chosen = lib.RECORD_ORDER.slice();
      this.parts = [];
      this.phase = 'off';
      this.ui = {
        panel: el('song-panel'),
        title: el('song-title'),
        kicker: el('song-kicker'),
        message: el('song-message'),
        count: el('song-count'),
        parts: el('song-parts'),
        progress: el('song-progress-bar'),
        actions: el('song-actions'),
        guide: el('song-guide'),
        canvas: el('song-guide-canvas'),
        cue: el('song-cue'),
        players: el('song-players'),
      };
      this.ui.actions.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-song-action]');
        if (btn && !btn.disabled) this.action(btn.dataset.songAction, btn.dataset.kind);
      });
      this.ui.parts.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-kind]');
        if (chip && this.phase === 'setup') this.toggle(chip.dataset.kind);
      });
    }

    label(kind) {
      return lib.INSTRUMENTS[kind].label;
    }

    // Song time can run faster than the wall clock for tests; music maths only sees song time.
    clock(now) {
      return (now - this.t0) * this.speed;
    }

    enter() {
      this.phase = 'setup';
      this.parts = [];
      this.ui.panel.hidden = false;
      this.renderSetup();
    }

    exit() {
      this.stopAll();
      this.phase = 'off';
      this.ui.panel.hidden = true;
      this.ui.guide.hidden = true;
      this.ui.players.hidden = true;
      this.ui.players.innerHTML = '';
    }

    stopAll() {
      this.disposeVoices();
      this.orchestra.silenceLive();
      this.recorder = null;
    }

    disposeVoices() {
      (this.voiceIds || []).forEach((id) => this.orchestra.removeLayer(id));
      this.voiceIds = [];
    }

    toggle(kind) {
      const on = this.chosen.includes(kind);
      if (on && this.chosen.length === 1) return;
      this.chosen = on
        ? this.chosen.filter((k) => k !== kind)
        : lib.RECORD_ORDER.filter((k) => k === kind || this.chosen.includes(k));
      this.renderSetup();
    }

    setText(title, message, kicker = 'Song mode · just for fun') {
      this.ui.kicker.textContent = kicker;
      this.ui.title.textContent = title;
      this.ui.message.textContent = message;
    }

    setActions(list) {
      this.ui.actions.innerHTML = list.map((a) => `<button type="button" class="btn${a.primary ? ' btn-primary' : ''}" data-song-action="${a.id}"${a.kind ? ` data-kind="${a.kind}"` : ''}${a.disabled ? ' disabled' : ''}>${a.label}</button>`).join('');
    }

    renderChips(now, done) {
      this.ui.parts.innerHTML = lib.RECORD_ORDER.map((kind) => {
        const cls = ['song-chip'];
        if (!this.chosen.includes(kind)) cls.push('is-off');
        if (kind === now) cls.push('is-now');
        if (done && done.includes(kind)) cls.push('is-done');
        return `<button type="button" class="${cls.join(' ')}" data-kind="${kind}">${this.label(kind)}</button>`;
      }).join('');
    }

    setProgress(fraction) {
      this.ui.progress.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
    }

    renderSetup() {
      this.setText(
        'Make a song with your breath',
        `You'll play each instrument on its own for ${lib.PART_BARS} bars, then I'll arrange them into one song for you. Tap a part to leave it out.`,
      );
      this.ui.count.hidden = true;
      this.renderChips(null, []);
      this.setProgress(0);
      this.setActions([
        { id: 'start', label: 'Start recording', primary: true },
        { id: 'free', label: 'Back to free play' },
      ]);
    }

    action(id) {
      if (id === 'start') this.startRecording();
      else if (id === 'skip') this.skipPart();
      else if (id === 'finish') this.finishRecording();
      else if (id === 'free') this.host.leave();
    }

    // ---- Record -------------------------------------------------------------

    startRecording(now = performance.now()) {
      this.parts = [];
      this.queue = this.chosen.slice();
      this.t0 = now;
      this.disposeVoices();
      this.beginPart(0);
    }

    beginPart(atBar) {
      const kind = this.queue[0];
      if (!kind) {
        this.finishRecording();
        return;
      }
      this.current = kind;
      this.countBar = atBar;
      this.recordBar = atBar + 1;
      this.endBar = this.recordBar + lib.PART_BARS;
      this.recorder = new lib.EnvelopeRecorder();
      this.recorder.start(this.recordBar * this.barMs);
      this.phase = 'countin';
      this.lastBeat = -1;
      this.orchestra.setLiveInstrument(kind);
      this.host.showLivePlayer(kind);
      this.renderBacking();
      const first = this.parts.length === 0;
      this.setText(
        `${this.label(kind)}, your turn`,
        first
          ? `Get ready. Breathe for ${lib.PART_BARS} bars when the count ends.`
          : `Lovely. Now the ${this.label(kind).toLowerCase()}: ${lib.PART_BARS} bars over what you've made.`,
      );
      this.ui.count.hidden = false;
      this.renderChips(kind, this.parts.map((p) => p.instrument));
      const left = this.queue.length;
      this.setActions([
        { id: 'skip', label: left > 1 || this.parts.length ? 'Skip this one' : 'Skip', disabled: left <= 1 && !this.parts.length },
        { id: 'finish', label: 'Make my song now', disabled: !this.parts.length },
        { id: 'free', label: 'Back to free play' },
      ]);
    }

    skipPart() {
      if (this.phase !== 'countin' && this.phase !== 'record') return;
      this.chosen = this.chosen.filter((k) => k !== this.current);
      this.queue.shift();
      const bar = Math.ceil(this.clock(performance.now()) / this.barMs);
      this.beginPart(bar);
    }

    renderBacking() {
      this.disposeVoices();
      this.voiceIds = this.parts.map((part) => {
        const id = `song-${part.instrument}`;
        this.orchestra.addLayer({ id, instrument: part.instrument });
        return id;
      });
      this.renderPlayers(this.parts.map((p) => p.instrument));
    }

    renderPlayers(kinds) {
      this.ui.players.hidden = false;
      this.ui.players.innerHTML = '';
      kinds.forEach((kind) => {
        const node = document.createElement('div');
        node.className = `player is-${kind}`;
        node.id = `song-player-${kind}`;
        this.host.placePlayer(node, lib.sectionSlots(kind)[0]);
        node.innerHTML = lib.instrumentMarkup(kind, { layerId: `song-${kind}`, label: this.label(kind), controls: false });
        this.ui.players.appendChild(node);
      });
    }

    playBacking(t) {
      const bar = t / this.barMs;
      const rel = bar - this.recordBar;
      const loopPos = (((rel % lib.PART_BARS) + lib.PART_BARS) % lib.PART_BARS) / lib.PART_BARS;
      this.parts.forEach((part) => {
        const env = sample(part.envelope, loopPos) * 0.85;
        const id = `song-${part.instrument}`;
        const result = this.orchestra.updateLayer(id, env, bar * lib.BEATS_PER_BAR, false, {
          nowMs: t, transportStart: 0, density: 0.5, phase: 'inhale', pulseAccent: false, env,
        });
        const node = el(`song-player-${part.instrument}`);
        this.host.updatePlayerVisual(node, env, 'inhale', true);
        if (node) node.classList.add('is-featured');
        this.host.applyVoiceVisual(node, result);
      });
    }

    playLive(t, input, extras = {}) {
      const bar = t / this.barMs;
      const result = this.orchestra.setLiveEnvelope(input.env, bar * lib.BEATS_PER_BAR, {
        nowMs: t,
        transportStart: 0,
        density: 0.5,
        phase: input.phase,
        pulseAccent: false,
        env: input.env,
        ...extras,
      });
      this.host.updateLivePlayer(input.env, input.phase, result);
    }

    tickRecord(now, input) {
      const t = this.clock(now);
      const bar = t / this.barMs;
      this.host.setBar(bar);
      this.playBacking(t);
      this.playLive(t, input);
      if (this.phase === 'countin') {
        const beat = Math.floor((bar - this.countBar) * lib.BEATS_PER_BAR);
        if (beat !== this.lastBeat && beat >= 0 && beat < lib.BEATS_PER_BAR) {
          this.lastBeat = beat;
          this.ui.count.textContent = String(lib.BEATS_PER_BAR - beat);
          this.orchestra.click(beat === 0);
        }
        if (bar >= this.recordBar) {
          this.phase = 'record';
          this.ui.count.textContent = 'Breathe';
          this.ui.message.textContent = lib.cheer('record', this.parts.length);
        }
        this.setProgress(0);
        return;
      }
      if (this.phase === 'record') {
        this.recorder.setPaused(input.blocked);
        this.recorder.add(input.env, t);
        const into = (bar - this.recordBar) / lib.PART_BARS;
        const barsLeft = Math.max(1, Math.ceil(this.endBar - bar));
        this.ui.count.textContent = input.blocked ? 'Paused' : `${barsLeft} bar${barsLeft === 1 ? '' : 's'}`;
        this.setProgress(into);
        if (bar >= this.endBar) this.commitPart(t);
      }
    }

    commitPart(t) {
      const take = this.recorder.stop(t);
      const shaped = lib.shapeTake(take.envelope, lib.PART_BARS);
      this.parts = this.parts.filter((p) => p.instrument !== this.current);
      this.parts.push({ instrument: this.current, envelope: shaped.envelope, filled: shaped.filled });
      this.queue.shift();
      if (!this.queue.length) this.finishRecording();
      else this.beginPart(this.endBar);
    }

    finishRecording() {
      if (!this.parts.length) return;
      this.phase = 'arranging';
      this.recorder = null;
      this.orchestra.silenceLive();
      this.host.hideLivePlayer();
      this.disposeVoices();
      this.ui.count.hidden = true;
      this.renderChips(null, this.parts.map((p) => p.instrument));
      this.setText('Arranging your song…', 'Seating everyone together on the stage.');
      this.setActions([]);
      this.song = lib.arrangeSong(this.parts);
      this.host.onSongReady(this.song);
    }

    tick(now, input) {
      if (this.phase === 'countin' || this.phase === 'record') this.tickRecord(now, input);
    }

    snapshot() {
      return {
        phase: this.phase,
        current: this.current || null,
        chosen: this.chosen.slice(),
        parts: this.parts.map((p) => ({ instrument: p.instrument, length: p.envelope.length, filled: p.filled })),
        song: this.song ? { order: this.song.order, sections: this.song.sections.map((s) => s.name), totalBars: this.song.totalBars } : null,
      };
    }
  }

  function sample(env, frac) {
    if (!env || !env.length) return 0;
    const pos = Math.min(0.999999, Math.max(0, frac)) * (env.length - 1);
    const i = Math.floor(pos);
    const f = pos - i;
    return env[i] + (env[Math.min(env.length - 1, i + 1)] - env[i]) * f;
  }

  root.BreathLib = Object.assign(root.BreathLib || {}, { SongMode });
})(window);
