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
      clearTimeout(this.arrangeTimer);
      if (this.capturing) this.orchestra.stopCapture();
      this.capturing = false;
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
      this.ui.parts.hidden = false;
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

    action(id, kind) {
      if (id === 'start') this.startRecording();
      else if (id === 'skip') this.skipPart();
      else if (id === 'finish') this.finishRecording();
      else if (id === 'replay') { this.performer = null; this.startListen(); }
      else if (id === 'stop') this.finishPlayback();
      else if (id === 'pick') this.renderPick();
      else if (id === 'perform') this.startPerform(kind);
      else if (id === 'back') this.renderDone();
      else if (id === 'new') { this.stopAll(); this.performer = null; this.song = null; this.enter(); }
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
      clearTimeout(this.arrangeTimer);
      this.arrangeTimer = setTimeout(() => this.startListen(), Math.max(150, 1400 / this.speed));
    }

    // ---- Listen -------------------------------------------------------------

    makeSongVoices(skip) {
      this.disposeVoices();
      this.voiceIds = this.song.order.filter((kind) => kind !== skip).map((kind) => {
        const id = `song-${kind}`;
        this.orchestra.addLayer({ id, instrument: kind });
        return id;
      });
    }

    startListen(now = performance.now()) {
      if (!this.song) return;
      this.phase = 'listen';
      this.t0 = now;
      this.lastSection = -1;
      this.accented = false;
      this.orchestra.silenceLive();
      this.host.hideLivePlayer();
      this.makeSongVoices(null);
      this.renderPlayers(this.song.order);
      this.ui.count.hidden = true;
      this.ui.guide.hidden = true;
      this.ui.parts.hidden = true;
      this.setActions([
        { id: 'stop', label: 'Stop' },
        { id: 'free', label: 'Back to free play' },
      ]);
      this.beginCapture();
    }

    beginCapture() {
      this.pendingBlob = null;
      this.capturing = this.orchestra.startCapture();
    }

    playSong(t, skip) {
      const mix = lib.songMixAt(this.song, t);
      this.song.order.forEach((kind) => {
        const v = mix.voices[kind];
        const node = el(`song-player-${kind}`);
        if (kind === skip) return;
        const result = this.orchestra.updateLayer(`song-${kind}`, v.env, mix.totalBeats, v.muted, {
          nowMs: t,
          transportStart: 0,
          density: mix.density,
          phase: 'inhale',
          pulseAccent: false,
          env: v.env,
          cadence: v.cadence,
        });
        if (node) {
          node.classList.toggle('is-featured', v.active);
          node.classList.toggle('is-entering', v.entering && mix.bar - mix.section.startBar < 1);
          this.host.updatePlayerVisual(node, v.env, 'inhale', v.active);
          this.host.applyVoiceVisual(node, result);
        }
      });
      if (mix.lastBar && !this.accented && this.song.order.includes('drums') && skip !== 'drums') {
        this.accented = true;
        this.orchestra.accent('song-drums', ['kick', 'crash']);
      }
      this.host.setBar(mix.bar);
      this.setProgress(mix.progress);
      return mix;
    }

    sectionTitle(mix) {
      const { section } = mix;
      if (section.name === 'Intro') return `Intro · ${this.label(this.song.order[0])}`;
      return section.name;
    }

    tickListen(now) {
      const t = this.clock(now);
      const mix = this.playSong(t, null);
      if (mix.sectionIndex !== this.lastSection) {
        this.lastSection = mix.sectionIndex;
        const entering = mix.section.entering;
        if (entering) this.host.setSpotlight(entering);
        const message = entering && mix.sectionIndex > 0
          ? `Here comes your ${this.label(entering).toLowerCase()}.`
          : lib.cheer('listen', mix.sectionIndex);
        this.setText(this.sectionTitle(mix), message, 'Your song');
      }
      if (t >= lib.songDurationMs(this.song) + this.barMs) this.finishPlayback();
    }

    finishPlayback() {
      this.phase = 'done';
      this.capturing = false;
      (this.voiceIds || []).forEach((id) => this.orchestra.updateLayer(id, 0, 0, true));
      this.orchestra.silenceLive();
      this.ui.guide.hidden = true;
      this.setProgress(1);
      this.orchestra.stopCapture().then((blob) => {
        this.pendingBlob = blob;
        if (blob) this.lastBlob = blob;
        if (this.phase === 'done') this.renderDone();
      });
      this.renderDone();
    }

    // ---- Perform ------------------------------------------------------------

    renderPick() {
      this.phase = 'pick';
      this.setText('Play along', "Pick the part you'll play. Your band plays the rest, and a line shows when your part breathes in and out.");
      this.setActions([
        ...this.song.order.map((kind) => ({ id: 'perform', kind, label: `Play the ${this.label(kind).toLowerCase()}` })),
        { id: 'back', label: 'Back' },
      ]);
    }

    startPerform(kind, now = performance.now()) {
      if (!this.song || !this.song.order.includes(kind)) return;
      this.performer = kind;
      this.phase = 'perform';
      this.t0 = now;
      this.lastSection = -1;
      this.lastBeat = -1;
      this.accented = false;
      this.makeSongVoices(kind);
      this.renderPlayers(this.song.order.filter((k) => k !== kind));
      this.orchestra.setLiveInstrument(kind);
      this.host.showLivePlayer(kind);
      this.host.setSpotlight(kind);
      this.ui.guide.hidden = false;
      this.ui.count.hidden = false;
      this.ui.parts.hidden = true;
      this.setText(`You're on ${this.label(kind).toLowerCase()}`, 'Breathe along with the line. There are no wrong notes here.', 'Play along');
      this.setActions([
        { id: 'stop', label: 'Stop' },
        { id: 'free', label: 'Back to free play' },
      ]);
      this.beginCapture();
    }

    tickPerform(now, input) {
      // One bar of count-in before the song starts.
      const t = this.clock(now) - this.barMs;
      const kind = this.performer;
      const guide = lib.guideAt(this.song, kind, t);
      this.drawGuide(guide, input.env);
      this.ui.cue.textContent = CUES[guide.cue] || '';
      if (t < 0) {
        const beat = Math.floor(((t + this.barMs) / this.barMs) * lib.BEATS_PER_BAR);
        if (beat !== this.lastBeat && beat >= 0) {
          this.lastBeat = beat;
          this.ui.count.textContent = String(lib.BEATS_PER_BAR - beat);
          this.orchestra.click(beat === 0);
        }
        this.playLive(0, { env: 0, phase: 'hold' }, { muted: true });
        return;
      }
      this.ui.count.hidden = true;
      const mix = this.playSong(t, kind);
      const v = mix.voices[kind];
      const env = v.active ? input.env * (mix.lastBar ? Math.min(1, v.env / 0.75) : 1) : 0;
      this.playLive(t, { env, phase: input.phase }, { cadence: v.cadence, muted: v.muted, density: mix.density });
      if (mix.sectionIndex !== this.lastSection) {
        this.lastSection = mix.sectionIndex;
        this.setText(this.sectionTitle(mix), lib.cheer('perform', mix.sectionIndex), `Play along · ${this.label(kind)}`);
      }
      if (t >= lib.songDurationMs(this.song) + this.barMs) this.finishPlayback();
    }

    drawGuide(guide, userEnv) {
      const canvas = this.ui.canvas;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const pad = 14;
      const y = (v) => h - pad - v * (h - pad * 2);
      const x = (i) => (i / (guide.line.length - 1)) * w;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#e8c87a';
      [[0, guide.nowIndex, '#e8c87a55', 0], [guide.nowIndex, guide.line.length - 1, '#e8c87a', 12]].forEach(([from, to, color, blur]) => {
        ctx.strokeStyle = color;
        ctx.shadowBlur = blur;
        ctx.beginPath();
        let drawing = false;
        for (let i = from; i <= to; i += 1) {
          const v = guide.line[i];
          if (v === null) { drawing = false; continue; }
          if (drawing) ctx.lineTo(x(i), y(v));
          else { ctx.moveTo(x(i), y(v)); drawing = true; }
        }
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
      const nx = x(guide.nowIndex);
      ctx.strokeStyle = '#f3ead844';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nx, 4);
      ctx.lineTo(nx, h - 4);
      ctx.stroke();
      ctx.fillStyle = '#f3ead8';
      ctx.shadowColor = '#f3ead8';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(nx, y(Math.min(1, Math.max(0, userEnv || 0))), 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    renderDone() {
      this.host.hideLivePlayer();
      this.setText(
        this.performer ? 'What a performance' : "That's your song",
        this.performer
          ? 'You and your band, all from your breath. Play again whenever you like.'
          : 'Every swell came from your breath. Want to play along with it?',
        'Song mode · just for fun',
      );
      this.setActions([
        { id: 'replay', label: 'Play it again' },
        { id: 'pick', label: 'Play along', primary: true },
        { id: 'new', label: 'New song' },
        { id: 'free', label: 'Back to free play' },
      ]);
    }

    tick(now, input) {
      if (this.phase === 'countin' || this.phase === 'record') this.tickRecord(now, input);
      else if (this.phase === 'listen') this.tickListen(now);
      else if (this.phase === 'perform') this.tickPerform(now, input);
    }

    snapshot() {
      return {
        phase: this.phase,
        current: this.current || null,
        chosen: this.chosen.slice(),
        parts: this.parts.map((p) => ({ instrument: p.instrument, length: p.envelope.length, filled: p.filled })),
        performer: this.performer || null,
        song: this.song ? { order: this.song.order, sections: this.song.sections.map((s) => s.name), totalBars: this.song.totalBars } : null,
      };
    }
  }

  const CUES = {
    in: 'Breathe in…',
    out: '…and out',
    hold: 'Stay with it',
    rest: 'Rest. Your part is coming',
    ready: 'Get ready…',
  };

  function sample(env, frac) {
    if (!env || !env.length) return 0;
    const pos = Math.min(0.999999, Math.max(0, frac)) * (env.length - 1);
    const i = Math.floor(pos);
    const f = pos - i;
    return env[i] + (env[Math.min(env.length - 1, i + 1)] - env[i]) * f;
  }

  root.BreathLib = Object.assign(root.BreathLib || {}, { SongMode });
})(window);
