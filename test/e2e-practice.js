'use strict';

const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ELECTRON = path.join(ROOT, 'node_modules', '.bin', 'electron');

const FATAL = /module is not defined|already been declared|require is not defined|Breath Orchestra failed to load/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on('error', reject);
  });
}

async function waitForTargets(port, timeoutMs = 25000) {
  const started = Date.now();
  let lastErr;
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page) return page;
      }
    } catch (err) {
      lastErr = err;
    }
    await sleep(200);
  }
  throw new Error(`no CDP page on port ${port}: ${lastErr ? lastErr.message : 'timed out'}`);
}

class Cdp {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.console = [];
    this.exceptions = [];
    this.ws = null;
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', (ev) => reject(ev.error || new Error('websocket error')));
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
        return;
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = (msg.params.args || [])
          .map((a) => (a.value !== undefined ? String(a.value) : a.description || ''))
          .join(' ');
        this.console.push({ type: msg.params.type, text });
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const details = msg.params.exceptionDetails || {};
        const text = (details.exception && (details.exception.description || details.exception.value))
          || details.text
          || JSON.stringify(details);
        this.exceptions.push(String(text));
      }
    });
    await this.send('Runtime.enable');
    await this.send('Page.enable');
  }

  send(method, params = {}) {
    const id = this.id + 1;
    this.id = id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      const details = result.exceptionDetails;
      throw new Error((details.exception && (details.exception.description || details.exception.value)) || details.text);
    }
    return result.result ? result.result.value : undefined;
  }

  close() {
    if (this.ws) this.ws.close();
  }

  async screenshot(filePath) {
    const result = await this.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
    });
    if (!result || !result.data) throw new Error('no screenshot data');
    fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'));
  }

  fatalErrors() {
    const lines = [
      ...this.exceptions,
      ...this.console.filter((c) => c.type === 'error').map((c) => c.text),
    ];
    return lines.filter((line) => FATAL.test(line));
  }
}

function launchElectron(port, extraArgs) {
  const env = {
    ...process.env,
    ELECTRON_DISABLE_SANDBOX: '1',
    ELECTRON_ENABLE_LOGGING: '1',
  };
  const args = [
    '-a',
    '-s',
    '-screen 0 1600x1000x24',
    ELECTRON,
    '.',
    `--remote-debugging-port=${port}`,
    '--remote-allow-origins=*',
    '--no-sandbox',
    '--calMs=800',
    ...extraArgs,
  ];
  const child = spawn('xvfb-run', args, {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  const logs = [];
  const onData = (chunk) => {
    logs.push(String(chunk));
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  return { child, logs };
}

function stopApp(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try { child.kill('SIGTERM'); } catch { /* already gone */ }
  }
  return Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(1500).then(() => {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
    }),
  ]);
}

async function waitFor(evaluate, timeoutMs, label) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    last = await evaluate();
    if (last) return last;
    await sleep(150);
  }
  throw new Error(`timed out waiting for ${label}: ${JSON.stringify(last)}`);
}

async function attach(port) {
  const target = await waitForTargets(port);
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.connect();
  await waitFor(() => cdp.eval("Boolean(document.getElementById('btn-practice') && window.BreathLib)"), 15000, 'renderer ready');
  return cdp;
}

async function snapshot(cdp) {
  return cdp.eval(`({
    breathOrchestra: typeof window.breathOrchestra,
    breathLib: window.BreathLib ? Object.keys(window.BreathLib).sort() : [],
    consentHidden: document.getElementById('consent').hidden,
    calibrateHidden: document.getElementById('calibrate').hidden,
    hudHidden: document.getElementById('hud').hidden,
    hallOpen: document.getElementById('hall').classList.contains('is-open'),
    bootError: document.getElementById('boot-error').hidden
      ? null
      : document.getElementById('boot-error').textContent,
    practiceDisabled: document.getElementById('btn-practice').disabled,
  })`);
}

async function clickPractice(cdp) {
  const hit = await cdp.eval(`(() => {
    const btn = document.getElementById('btn-practice');
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return {
      x, y,
      width: r.width,
      height: r.height,
      top: top ? (top.id || top.className || top.tagName) : null,
      isBtn: Boolean(top && (top === btn || btn.contains(top))),
    };
  })()`);
  if (!hit.isBtn) {
    throw new Error(`#btn-practice is covered by ${hit.top} at ${hit.x},${hit.y}`);
  }
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: hit.x,
    y: hit.y,
    button: 'left',
    clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: hit.x,
    y: hit.y,
    button: 'left',
    clickCount: 1,
  });
  return hit;
}

function assertNoFatal(cdp, phase) {
  const fatal = cdp.fatalErrors();
  if (fatal.length) throw new Error(`${phase}: ${fatal.join('\n')}`);
  if (cdp.exceptions.length) throw new Error(`${phase} uncaught: ${cdp.exceptions.join('\n')}`);
}

async function runClickPath(port) {
  const { child, logs } = launchElectron(port, []);
  const cdp = await attach(port).catch(async (err) => {
    await stopApp(child);
    err.message += `\n--- electron log ---\n${logs.join('').slice(-4000)}`;
    throw err;
  });
  try {
    const before = await snapshot(cdp);
    if (before.bootError) throw new Error(`boot error before click: ${before.bootError}`);
    if (!before.breathLib.includes('BreathCalibrator') || !before.breathLib.includes('LoopEngine')) {
      throw new Error(`BreathLib incomplete: ${before.breathLib.join(',')}`);
    }
    if (before.consentHidden) throw new Error('consent should be visible before the click');
    await clickPractice(cdp);
    await waitFor(async () => {
      const s = await snapshot(cdp);
      return s.consentHidden && !s.calibrateHidden && s.hallOpen;
    }, 8000, 'calibration screen');
    await waitFor(async () => {
      const s = await snapshot(cdp);
      return s.calibrateHidden && !s.hudHidden && s.hallOpen;
    }, 12000, 'HUD after calibration');
    assertNoFatal(cdp, 'click path');
    return { before, after: await snapshot(cdp) };
  } finally {
    cdp.close();
    await stopApp(child);
  }
}

async function runSimFlag(port) {
  const { child, logs } = launchElectron(port, ['--sim']);
  const cdp = await attach(port).catch(async (err) => {
    await stopApp(child);
    err.message += `\n--- electron log ---\n${logs.join('').slice(-4000)}`;
    throw err;
  });
  try {
    await waitFor(async () => {
      const s = await snapshot(cdp);
      return s.consentHidden && (!s.calibrateHidden || !s.hudHidden);
    }, 8000, 'start:sim to skip consent');
    await waitFor(async () => {
      const s = await snapshot(cdp);
      return s.calibrateHidden && !s.hudHidden && s.hallOpen;
    }, 12000, 'start:sim HUD');
    assertNoFatal(cdp, 'start:sim');
    const simSnap = await snapshot(cdp);
    const ensemble = await exerciseEnsemble(cdp);
    return { ...simSnap, ensemble };
  } finally {
    cdp.close();
    await stopApp(child);
  }
}

async function exerciseEnsemble(cdp) {
  const kinds = await cdp.eval(`[...document.querySelectorAll('.pick')].map((btn) => btn.dataset.kind)`);
  const expected = ['cello', 'flute', 'violin', 'piano', 'drums'];
  if (JSON.stringify(kinds) !== JSON.stringify(expected)) {
    throw new Error(`playbill was ${JSON.stringify(kinds)}`);
  }
  const hook = await cdp.eval(`typeof window.__breathOrchestraTest`);
  if (hook !== 'object') throw new Error('test hook missing');

  const seated = await cdp.eval(`(() => {
    const api = window.__breathOrchestraTest;
    ['cello', 'violin', 'flute', 'piano', 'drums', 'cello'].forEach((kind) => api.seat(kind));
    api.setInstrument('cello');
    return api.snapshot();
  })()`);
  if (!seated.kinds || seated.kinds.length < 5) {
    throw new Error(`expected several seated players, got ${JSON.stringify(seated)}`);
  }
  const unique = new Set(seated.kinds);
  for (const kind of expected) {
    if (!unique.has(kind)) throw new Error(`missing seated ${kind}`);
  }

  const graphs = {};
  for (const kind of expected) {
    const graph = await cdp.eval(`window.__breathOrchestraTest.audioGraph(${JSON.stringify(kind)})`);
    if (!graph || graph.kind !== kind || !graph.hasGain || !graph.nodes || !graph.nodes.length) {
      throw new Error(`audio graph failed for ${kind}: ${JSON.stringify(graph)}`);
    }
    graphs[kind] = graph.nodes;
  }

  await cdp.eval(`(() => {
    const hud = document.getElementById('hud');
    if (hud) hud.hidden = true;
    const err = document.getElementById('boot-error');
    if (err) err.hidden = true;
    document.documentElement.style.setProperty('--light-warmth', '0.72');
    document.documentElement.style.setProperty('--live-env', '0.7');
    document.querySelectorAll('.player').forEach((el) => {
      el.style.setProperty('--env', '0.7');
      el.classList.add('is-playing');
    });
  })()`);
  const shot = path.join('/workspace', 'breath-orchestra-ensemble.png');
  await sleep(400);
  await cdp.screenshot(shot);
  return { seated, graphs, shot };
}

async function main() {
  if (typeof WebSocket !== 'function') {
    throw new Error('Node WebSocket is required for the e2e smoke test');
  }
  const clickPort = await freePort();
  const click = await runClickPath(clickPort);
  const simPort = await freePort();
  const sim = await runSimFlag(simPort);
  console.log('e2e practice click: consent -> calibration -> HUD ok');
  console.log('  breathOrchestra:', click.before.breathOrchestra);
  console.log('  BreathLib keys:', click.before.breathLib.join(', '));
  console.log('e2e start:sim: skipped consent and reached HUD ok');
  console.log('  hud hidden:', sim.hudHidden, 'hall open:', sim.hallOpen);
  console.log('e2e ensemble: seated', sim.ensemble.seated.kinds.join(', '));
  for (const [kind, nodes] of Object.entries(sim.ensemble.graphs)) {
    console.log(`  ${kind}: ${nodes.join(', ')}`);
  }
  console.log('e2e screenshot:', sim.ensemble.shot);
}

main().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
