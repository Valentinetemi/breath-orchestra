'use strict';

// Drives the real SDK path with Chromium's fake camera and a dummy key, so
// the bridge, camera permission, preview and error banner are all exercised.
const { freePort, launchElectron, attach, stopApp, waitFor, sleep } = require('./e2e-practice');

const DUMMY_KEY = 'e2e-dummy-key-not-real';

async function liveState(cdp) {
  return cdp.eval(`(() => {
    const cal = document.getElementById('cal-preview');
    const err = document.getElementById('live-error');
    return {
      sdkBundle: Boolean(window.SmartSpectra && window.SmartSpectra.SmartSpectraSDK),
      bridge: Boolean(window.__smartspectraBridge),
      missing: window.SmartSpectraMissing || null,
      previewStream: Boolean(cal && cal.srcObject),
      previewWidth: cal ? cal.videoWidth : 0,
      liveError: err && !err.hidden ? err.textContent : null,
      calHint: document.getElementById('cal-hint').textContent,
      calTime: document.getElementById('cal-time').textContent,
    };
  })()`);
}

async function main() {
  const port = await freePort();
  const { child, logs } = launchElectron(port, ['--use-fake-device-for-media-stream'], {
    SMARTSPECTRA_API_KEY: DUMMY_KEY,
  });
  let cdp;
  try {
    cdp = await attach(port);
    const boot = await liveState(cdp);
    if (!boot.sdkBundle || !boot.bridge) {
      throw new Error(`SDK bridge not loaded: ${JSON.stringify(boot)}`);
    }
    await cdp.eval(`(() => {
      const box = document.getElementById('consent-camera');
      box.checked = true;
      box.dispatchEvent(new Event('change'));
      document.getElementById('btn-live').click();
    })()`);

    const opened = await waitFor(async () => {
      const s = await liveState(cdp);
      return s.previewStream && s.previewWidth > 0 ? s : (s.liveError ? s : null);
    }, 20000, 'camera preview or live error');
    if (!opened.previewStream) throw new Error(`camera never opened: ${opened.liveError}`);
    console.log(`e2e live: fake camera opened, preview ${opened.previewWidth}px wide`);

    const settled = await waitFor(async () => {
      const s = await liveState(cdp);
      return s.liveError ? s : null;
    }, 45000, 'the dummy key to be rejected');
    console.log(`e2e live: on-screen error -> ${settled.liveError}`);
    await sleep(300);
    const terminal = logs.join('').split('\n').filter((line) => line.includes('[breath-orchestra]'));
    if (!terminal.some((line) => line.includes('Live mode stopped'))) {
      throw new Error(`terminal never reported the failure:\n${terminal.join('\n')}`);
    }
    if (logs.join('').includes(DUMMY_KEY)) throw new Error('the API key leaked into the logs');
    console.log('e2e live: terminal lines');
    terminal.forEach((line) => console.log(`  ${line.trim()}`));
    console.log('OK');
  } catch (err) {
    err.message += `\n--- electron log ---\n${logs.join('').slice(-4000)}`;
    throw err;
  } finally {
    if (cdp) cdp.close();
    await stopApp(child);
  }
}

main().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
