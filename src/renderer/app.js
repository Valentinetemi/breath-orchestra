'use strict';

(function () {
  if (!window.BreathLib || !window.BreathLib.BreathCalibrator || !window.BreathLib.LoopEngine) {
    const err = new Error('Breath Orchestra failed to load its music libraries. Please restart the app.');
    const el = document.getElementById('boot-error');
    if (el) { el.hidden = false; el.textContent = err.message; }
    throw err;
  }

  const {
    BreathCalibrator,
    BreathSimulator,
    EnvelopeRecorder,
    LoopEngine,
    Orchestra,
    instrumentMarkup,
    barAndBeat,
    nextBarTime,
    TEMPO_BPM,
    KEY,
    SCALE_NAME,
    INSTRUMENTS,
    INSTRUMENT_ORDER,
    liveSlot,
    PulseSimulator,
    PulseTracker,
    densityFromPulseRate,
  } = window.BreathLib;

  const api = window.breathOrchestra;
  const hall = document.getElementById('hall');
  const hud = document.getElementById('hud');
  const consentEl = document.getElementById('consent');
  const calibrateEl = document.getElementById('calibrate');
  const calTimeEl = document.getElementById('cal-time');
  const playersEl = document.getElementById('players');
  const liveEl = document.getElementById('live-player');
  const recordBtn = document.getElementById('record-btn');
  const barReadout = document.getElementById('bar-readout');
  const pips = [...document.getElementById('beat-pips').children];
  const statusEl = document.getElementById('status');
  const hintEl = document.getElementById('framing-hint');
  const previewPh = document.getElementById('preview-ph');
  const cameraPreview = document.getElementById('camera-preview');

  const state = {
    screen: 'consent',
    mode: 'sim',
    enableTelemetry: false,
    instrument: 'cello',
    calibrator: null,
    simulator: new BreathSimulator(),
    recorder: new EnvelopeRecorder(),
    loops: new LoopEngine(),
    orchestra: new Orchestra(),
    transportStart: 0,
    recState: 'idle',
    recStart: 0,
    armedAt: 0,
    envelope: 0,
    phase: 'hold',
    talking: false,
    validationOk: true,
    validationHint: '',
    lastLiveValue: null,
    sdk: null,
    pulseSim: new PulseSimulator({ bpm: 70 }),
    pulseTracker: new PulseTracker(),
    pulse: { rate: 70, beat: false, value: 0 },
    pulseRecorder: new EnvelopeRecorder(),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  function $(id) { return document.getElementById(id); }

  function buildSeats() {
    const root = $('seats');
    const rows = 6;
    for (let r = 0; r < rows; r += 1) {
      const row = document.createElement('div');
      row.className = 'seat-row';
      row.style.bottom = `${r * 16}px`;
      row.style.transform = `scale(${1 + r * 0.06})`;
      const count = 18 + r * 3;
      for (let i = 0; i < count; i += 1) {
        const seat = document.createElement('div');
        seat.className = 'seat';
        row.appendChild(seat);
      }
      root.appendChild(row);
    }
    const lights = $('footlights');
    for (let i = 0; i < 11; i += 1) lights.appendChild(document.createElement('span'));
    if (!state.reducedMotion) {
      const dust = $('dust');
      for (let i = 0; i < 16; i += 1) {
        const s = document.createElement('span');
        s.style.left = `${6 + Math.random() * 88}%`;
        s.style.top = `${20 + Math.random() * 60}%`;
        s.style.animationDelay = `${Math.random() * 8}s`;
        s.style.animationDuration = `${7 + Math.random() * 6}s`;
        dust.appendChild(s);
      }
    }
  }

  function setStatus(text) {
    statusEl.innerHTML = text;
  }

  function openCurtains() {
    hall.classList.add('is-open');
    hall.setAttribute('aria-hidden', 'false');
  }

  function showError(err) {
    const el = document.getElementById('boot-error');
    const message = err && err.message ? err.message : String(err);
    if (el) {
      el.hidden = false;
      el.textContent = message;
    }
    console.error(message);
  }

  function calibrationMs() {
    const raw = Number(new URLSearchParams(location.search).get('calMs'));
    return Number.isFinite(raw) && raw > 0 ? raw : 15000;
  }

  function wantsPractice() {
    return new URLSearchParams(location.search).get('sim') === '1';
  }

  async function beginSession(mode) {
    try {
      state.mode = mode;
      const telemetryBox = $('consent-telemetry');
      state.enableTelemetry = Boolean(telemetryBox && telemetryBox.checked);
      if (api && typeof api.setConsent === 'function') {
        await api.setConsent({
          camera: mode === 'live',
          telemetry: mode === 'live' && state.enableTelemetry,
        });
      } else if (mode === 'live') {
        throw new Error('The camera bridge is unavailable. You can still practise without a camera.');
      }
      consentEl.hidden = true;
      openCurtains();
      setTimeout(() => startCalibration(), 900);
    } catch (err) {
      showError(err);
    }
  }

  function startCalibration() {
    state.screen = 'calibrate';
    state.calibrator = new BreathCalibrator({ durationMs: calibrationMs() });
    calibrateEl.hidden = false;
    if (state.mode === 'live') startLiveSdk();
    else hintEl.textContent = 'Practice mode · hold Space or the mouse to breathe in.';
  }

  function finishCalibration() {
    calibrateEl.hidden = true;
    hud.hidden = false;
    state.screen = 'play';
    state.transportStart = performance.now();
    renderLivePlayer();
    setStatus(`Locked in ${KEY} · ${TEMPO_BPM} BPM · ${SCALE_NAME}. Breathe, then record on the next bar.`);
    state.orchestra.start().then(() => {
      state.orchestra.setLiveInstrument(state.instrument);
    }).catch((err) => {
      setStatus(`Audio could not start: ${err.message}`);
    });
  }

  function placePlayer(el, slot) {
    el.style.left = `${slot.x}%`;
    el.style.top = `${slot.y}%`;
    el.style.zIndex = String(10 + (slot.z || 0));
    el.style.setProperty('--player-scale', String(slot.scale || 1));
  }

  function renderLivePlayer() {
    const slot = liveSlot(state.instrument);
    liveEl.hidden = false;
    liveEl.className = `player is-live is-${state.instrument}`;
    placePlayer(liveEl, slot);
    liveEl.innerHTML = instrumentMarkup(state.instrument, {
      live: true,
      label: INSTRUMENTS[state.instrument].label,
    });
    document.documentElement.style.setProperty('--spotlight-x', `${slot.x}%`);
  }

  function renderLayer(layer) {
    const el = document.createElement('div');
    el.className = `player is-${layer.instrument}`;
    el.id = layer.id;
    placePlayer(el, layer.slot);
    el.innerHTML = instrumentMarkup(layer.instrument, {
      layerId: layer.id,
      label: INSTRUMENTS[layer.instrument].label,
    });
    playersEl.appendChild(el);
  }

  function setInstrument(kind) {
    state.instrument = kind;
    document.querySelectorAll('.pick').forEach((btn) => {
      const on = btn.dataset.kind === kind;
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    renderLivePlayer();
    state.orchestra.setLiveInstrument(kind);
  }

  function nowMs() {
    return performance.now();
  }

  function transportMs() {
    return nowMs();
  }

  function isInputBlocked() {
    return state.talking || !state.validationOk;
  }

  function armOrStopRecording() {
    if (state.screen !== 'play') return;
    if (state.recState === 'idle') {
      const at = nextBarTime(transportMs(), state.transportStart);
      state.recState = 'armed';
      state.armedAt = at;
      recordBtn.className = 'record-btn is-armed';
      recordBtn.textContent = 'Armed';
      setStatus('Recording starts on the next bar…');
    } else if (state.recState === 'armed') {
      state.recState = 'idle';
      recordBtn.className = 'record-btn';
      recordBtn.textContent = 'Record';
      setStatus('Recording cancelled.');
    } else if (state.recState === 'recording' || state.recState === 'paused') {
      commitRecording();
    }
  }

  function beginTake(at) {
    state.recState = 'recording';
    state.recStart = at;
    state.recorder.start(at);
    state.pulseRecorder.start(at);
    recordBtn.className = 'record-btn is-recording';
    recordBtn.textContent = 'Stop';
    setStatus('Recording this breath…');
  }

  function commitRecording() {
    const take = state.recorder.stop(transportMs(), TEMPO_BPM);
    const pulseTake = state.pulseRecorder.stop(transportMs(), TEMPO_BPM);
    state.recState = 'idle';
    recordBtn.className = 'record-btn';
    recordBtn.textContent = 'Record';
    const added = state.loops.addLayer({
      instrument: state.instrument,
      ...take,
      pulseEnvelope: pulseTake && pulseTake.envelope,
    });
    if (added.error) {
      setStatus('The stage is full. Undo a player to add another part.');
      return;
    }
    renderLayer(added.layer);
    state.orchestra.addLayer(added.layer);
    setStatus(`A ${INSTRUMENTS[state.instrument].label.toLowerCase()} takes a seat · ${take.bars} bar loop.`);
  }

  function updatePlayerVisual(el, env, phase, playing) {
    if (!el || el.hidden) return;
    el.style.setProperty('--env', String(env));
    const bow = Math.sin((nowMs() / 700) + env * 2) * env;
    el.style.setProperty('--bow', String(bow));
    el.classList.toggle('is-playing', playing && env > 0.08);
    el.classList.toggle('is-muted', el.classList.contains('is-muted'));
  }

  function lightPianoKeys(el, notes) {
    if (!el) return;
    const held = new Set(notes || []);
    el.querySelectorAll('.piano-key').forEach((key) => {
      key.classList.toggle('is-held', held.has(key.getAttribute('data-note')));
    });
  }

  function flashDrumHits(el, hits) {
    if (!el || !hits || !hits.length) return;
    const voices = new Set(hits.map((hit) => hit.voice));
    voices.forEach((voice) => {
      const cls = `is-hit-${voice}`;
      el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), 140);
    });
  }

  function applyVoiceVisual(el, result) {
    if (!result || !el) return;
    if (result.kind === 'piano') lightPianoKeys(el, result.notes);
    if (result.kind === 'drums') flashDrumHits(el, result.hits);
  }

  function tick(now) {
    // In live mode, wait for real breath rather than quietly playing the simulator.
    const raw = state.mode === 'live' ? state.lastLiveValue : state.simulator.tick(now).value;
    if (state.calibrator && raw !== null) {
      const cal = state.calibrator.addSample(raw, now);
      state.envelope = cal.envelope;
      state.phase = cal.phase;
      if (state.screen === 'calibrate') {
        const totalSec = Math.max(1, Math.round(calibrationMs() / 1000));
        const left = Math.max(0, totalSec - Math.ceil(state.calibrator.progress(now) * totalSec));
        calTimeEl.textContent = left === 1 ? '1 second' : `${left} seconds`;
        document.documentElement.style.setProperty('--light-warmth', String(0.12 + state.envelope * 0.8));
        document.documentElement.style.setProperty('--live-env', String(state.envelope));
        if (cal.complete) finishCalibration();
      }
    }

    if (state.mode === 'sim') {
      const pulse = state.pulseSim.tick(now);
      state.pulse.rate = pulse.rate;
      state.pulse.beat = pulse.beat;
      state.pulse.value = pulse.value;
    }

    if (state.screen === 'play') {
      const pos = barAndBeat(now, state.transportStart);
      const density = densityFromPulseRate(state.pulse.rate);
      const pulseAccent = Boolean(state.pulse.beat);
      state.pulse.beat = false;
      barReadout.textContent = `Bar ${pos.bar} · Beat ${pos.beat}`;
      pips.forEach((pip, i) => pip.classList.toggle('on', i < pos.beat));
      document.documentElement.style.setProperty('--light-warmth', String(0.2 + state.envelope * 0.55));
      document.documentElement.style.setProperty('--live-env', String(state.envelope));
      const liveVoice = state.orchestra.setLiveEnvelope(state.envelope, pos.totalBeats, {
        nowMs: now,
        transportStart: state.transportStart,
        density,
        phase: state.phase,
        pulseAccent,
        env: state.envelope,
      });
      updatePlayerVisual(liveEl, state.envelope, state.phase, true);
      applyVoiceVisual(liveEl, liveVoice);

      if (state.recState === 'armed' && now >= state.armedAt) beginTake(state.armedAt);
      if (state.recState === 'recording' || state.recState === 'paused') {
        const blocked = isInputBlocked();
        state.recorder.setPaused(blocked);
        state.pulseRecorder.setPaused(blocked);
        state.recState = blocked ? 'paused' : 'recording';
        state.recorder.add(state.envelope, now);
        state.pulseRecorder.add(density, now);
        if (blocked) {
          recordBtn.textContent = 'Paused';
          const why = state.talking ? "I'll wait while you talk." : (state.validationHint || 'Hold still — framing needs a moment.');
          setStatus(`Recording paused. ${why}`);
        } else if (recordBtn.textContent === 'Paused') {
          recordBtn.textContent = 'Stop';
          setStatus('Recording this breath…');
        }
      }

      const elapsed = now - state.transportStart;
      for (const layer of state.loops.layers) {
        const env = state.loops.envelopeAt(layer, elapsed);
        const el = document.getElementById(layer.id);
        if (el) {
          el.classList.toggle('is-muted', layer.muted);
          updatePlayerVisual(el, env, 'inhale', !layer.muted);
        }
        const result = state.orchestra.updateLayer(layer.id, env, pos.totalBeats, layer.muted, {
          nowMs: now,
          transportStart: state.transportStart,
          density: state.loops.pulseAt(layer, elapsed),
          phase: 'inhale',
          pulseAccent: false,
          env,
        });
        applyVoiceVisual(el, result);
      }
    }

    requestAnimationFrame(tick);
  }

  function onMetrics(payload) {
    const breathing = payload && payload.breathing;
    const traces = breathing && (breathing.upperTrace || breathing.upper_trace);
    if (Array.isArray(traces) && traces.length) {
      const last = traces[traces.length - 1];
      const value = typeof last === 'number' ? last : last.value;
      if (Number.isFinite(value)) state.lastLiveValue = value;
    }
    const face = payload && payload.face;
    const talking = face && (face.talking || []);
    if (Array.isArray(talking) && talking.length) {
      const last = talking[talking.length - 1];
      state.talking = Boolean(last.detected);
    }
    if (state.mode === 'live') {
      const pulse = state.pulseTracker.ingest(payload);
      if (pulse.rate !== null) state.pulse.rate = pulse.rate;
      if (pulse.beat) state.pulse.beat = true;
      if (pulse.value !== undefined) state.pulse.value = pulse.value;
    }
  }

  function onValidation({ code, hint }) {
    state.validationHint = hint || '';
    state.validationOk = code === 0 || code === 'kOk' || code === 'OK' || code === 'ok';
    hintEl.textContent = hint || (state.validationOk ? 'Looks good. Keep your chest in view.' : '');
  }

  async function startLiveSdk() {
    previewPh.hidden = true;
    hintEl.textContent = 'Warming up the camera…';
    const SS = window.SmartSpectra;
    if (!SS || !SS.SmartSpectraSDK) {
      hintEl.textContent = 'The SmartSpectra SDK is not available.';
      state.mode = 'sim';
      return;
    }
    const creds = await api.getLiveCredentials();
    if (!creds.apiKey) {
      setStatus('No API key found in <code>.env</code>. You can keep practising without a camera.');
      hintEl.textContent = 'No API key · stayed in practice lighting.';
      state.mode = 'sim';
      return;
    }

    const access = await api.requestCamera();
    if (!access.granted) {
      hintEl.textContent = 'Camera access is off for this app.';
      state.mode = 'sim';
      return;
    }

    const sdk = new SS.SmartSpectraSDK({
      apiKey: creds.apiKey,
      requestedMetrics: liveMetrics(SS),
      enableTelemetry: creds.enableTelemetry === true,
    });
    state.sdk = sdk;
    sdk.on('streamAvailable', (stream) => {
      cameraPreview.srcObject = stream;
      cameraPreview.hidden = false;
      cameraPreview.play().catch(() => {});
    });
    sdk.on('metrics', (buf) => onMetrics(SS.decodeMetrics(buf)));
    sdk.on('validationStatus', (code, _ts, hint) => onValidation({ code, hint }));
    await sdk.start();
  }

  // Pulse and talking ride along for the drums and the record pause.
  function liveMetrics(SS) {
    const extra = [SS.MetricType.TALKING, SS.MetricType.PULSE_RATE, SS.MetricType.ARTERIAL_PRESSURE_TRACE]
      .filter((code) => Number.isInteger(code));
    return [...SS.breathingMetrics, ...extra];
  }

  function onPointerBreath(down) {
    if (state.mode !== 'sim') return;
    if (down) state.simulator.inhale();
    else state.simulator.exhale();
  }

  function wire() {
    buildSeats();

    const cameraBox = $('consent-camera');
    const liveBtn = $('btn-live');
    cameraBox.addEventListener('change', () => {
      liveBtn.disabled = !cameraBox.checked;
    });
    $('btn-practice').addEventListener('click', () => beginSession('sim'));
    liveBtn.addEventListener('click', () => {
      if (!cameraBox.checked) return;
      beginSession('live');
    });

    document.querySelectorAll('.pick').forEach((btn) => {
      btn.addEventListener('click', () => setInstrument(btn.dataset.kind));
    });
    recordBtn.addEventListener('click', armOrStopRecording);

    playersEl.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === 'mute') {
        const layer = state.loops.toggleMute(id);
        if (layer) {
          const el = document.getElementById(id);
          if (el) el.classList.toggle('is-muted', layer.muted);
        }
      } else if (btn.dataset.action === 'remove') {
        state.loops.remove(id);
        state.orchestra.removeLayer(id);
        const el = document.getElementById(id);
        if (el) el.remove();
      }
    });

    $('invert-breath').addEventListener('change', (event) => {
      if (state.calibrator) state.calibrator.invert = event.target.checked;
    });

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      if (event.code === 'Space') {
        event.preventDefault();
        onPointerBreath(true);
      } else if (event.key === 'r' || event.key === 'R') armOrStopRecording();
      else if (/^[1-5]$/.test(event.key)) {
        const kind = (INSTRUMENT_ORDER || [])[Number(event.key) - 1];
        if (kind) setInstrument(kind);
      }
      else if (event.key === 'z' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        const removed = state.loops.undo();
        if (removed) {
          state.orchestra.removeLayer(removed.id);
          const el = document.getElementById(removed.id);
          if (el) el.remove();
        }
      }
    });
    window.addEventListener('keyup', (event) => {
      if (event.code === 'Space') onPointerBreath(false);
    });
    hall.addEventListener('mousedown', (event) => {
      if (event.target.closest('button')) return;
      onPointerBreath(true);
    });
    window.addEventListener('mouseup', () => onPointerBreath(false));

    if (!state.reducedMotion) {
      window.addEventListener('mousemove', (event) => {
        const x = (event.clientX / window.innerWidth - 0.5) * 18;
        const y = (event.clientY / window.innerHeight - 0.5) * 10;
        document.documentElement.style.setProperty('--parx', `${x}px`);
        document.documentElement.style.setProperty('--pary', `${y}px`);
      });
    }

    requestAnimationFrame(tick);
  }



  window.__breathOrchestraTest = {
    setInstrument,
    seat(kind, envelope) {
      const added = state.loops.addLayer({
        instrument: kind,
        envelope: Float32Array.from(envelope || [0.2, 0.85, 1, 0.55, 0.25]),
        pulseEnvelope: Float32Array.from([0.45, 0.62, 0.55, 0.48]),
        durationMs: 2000,
        bars: 1,
        beats: 4,
      });
      if (added.layer) {
        renderLayer(added.layer);
        state.orchestra.addLayer(added.layer);
      }
      return added.error ? added.error : added.layer.id;
    },
    async audioGraph(kind) {
      await state.orchestra.start();
      state.orchestra.setLiveInstrument(kind);
      const now = performance.now();
      state.orchestra.setLiveEnvelope(0.75, 8, {
        nowMs: now,
        transportStart: state.transportStart || now,
        density: 0.7,
        phase: 'inhale',
        pulseAccent: true,
        env: 0.8,
      });
      return state.orchestra.describeLive();
    },
    snapshot() {
      return {
        instrument: state.instrument,
        kinds: state.loops.layers.map((layer) => layer.instrument),
        slots: state.loops.layers.map((layer) => ({
          id: layer.slot.id,
          x: layer.slot.x,
          y: layer.slot.y,
          riser: Boolean(layer.slot.riser),
        })),
        started: state.orchestra.started,
        live: state.orchestra.describeLive(),
      };
    },
  };

    try {
      wire();
      const startPractice = async () => {
        const fromQuery = wantsPractice();
        let fromFlag = false;
        try {
          if (api && typeof api.getConfig === 'function') {
            const cfg = await api.getConfig();
            fromFlag = Boolean(cfg && cfg.simFlag);
          }
        } catch (err) {
          showError(err);
        }
        if (fromQuery || fromFlag) await beginSession('sim');
      };
      startPractice();
    } catch (err) {
      showError(err);
    }

})();
