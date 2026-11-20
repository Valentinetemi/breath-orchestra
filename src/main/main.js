'use strict';

const { app, BrowserWindow, ipcMain, session, systemPreferences } = require('electron');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let bindSmartSpectraIpc = null;
let sdkAvailable = false;
try {
  ({ bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main'));
  sdkAvailable = true;
} catch {
  // Linux CI and machines without the native runtime can still use Practice mode.
  sdkAvailable = false;
}

let cameraConsent = false;
let telemetryEnabled = false;
let sdkSession = null;
let mainWindow = null;

function createWindow() {
  const win = mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#07060a',
    title: 'Breath Orchestra',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
    show: false,
  });

  win.once('ready-to-show', () => win.show());
  if (bindSmartSpectraIpc) bindSmartSpectraIpc(win);
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const url = (details && details.requestingUrl) || (wc && wc.getURL()) || '';
    const ok = cameraConsent && permission === 'media' && url.startsWith('file://');
    callback(ok);
  });

  session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
    if (permission === 'media') return cameraConsent;
    return false;
  });

  createWindow();
});

ipcMain.handle('app:getConfig', async () => ({
  hasApiKey: Boolean((process.env.SMARTSPECTRA_API_KEY || '').trim()),
  sdkAvailable,
  platform: process.platform,
  simFlag: process.argv.includes('--sim'),
}));

ipcMain.handle('app:getLiveCredentials', async () => {
  if (!cameraConsent) return { apiKey: '', enableTelemetry: false };
  return {
    apiKey: (process.env.SMARTSPECTRA_API_KEY || '').trim(),
    enableTelemetry: telemetryEnabled,
  };
});

ipcMain.handle('app:setConsent', async (_event, payload) => {
  cameraConsent = Boolean(payload && payload.camera);
  telemetryEnabled = Boolean(payload && payload.telemetry);
  return { cameraConsent, telemetryEnabled };
});

ipcMain.handle('app:cameraAccess', async () => {
  if (process.platform !== 'darwin' || typeof systemPreferences.getMediaAccessStatus !== 'function') {
    return { status: 'unknown' };
  }
  return { status: systemPreferences.getMediaAccessStatus('camera') };
});


function sendSdk(type, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sdk:event', type, payload);
  }
}

function toPlainMetrics(decoded) {
  try {
    return JSON.parse(JSON.stringify(decoded));
  } catch {
    return null;
  }
}

async function stopSdk() {
  if (!sdkSession) return { ok: true };
  try {
    if (typeof sdkSession.stopAsync === 'function') await sdkSession.stopAsync();
    else if (typeof sdkSession.stop === 'function') await sdkSession.stop();
    if (typeof sdkSession.destroy === 'function') await sdkSession.destroy();
  } catch {
    // already stopped
  }
  sdkSession = null;
  return { ok: true };
}

ipcMain.handle('sdk:start', async () => {
  if (!sdkAvailable) {
    return { error: 'The SmartSpectra SDK is not available on this machine.' };
  }
  if (!cameraConsent) return { error: 'Camera consent is required first.' };
  const apiKey = (process.env.SMARTSPECTRA_API_KEY || '').trim();
  if (!apiKey) return { error: 'No API key found. Add SMARTSPECTRA_API_KEY to your .env file.' };

  await stopSdk();
  const {
    SmartSpectraSDK,
    CameraSelection,
    breathingMetrics,
    decodeMetrics,
    MetricType,
  } = require('@smartspectra/node-sdk');

  const requestedMetrics = [...breathingMetrics];
  if (MetricType && MetricType.TALKING !== null && MetricType.TALKING !== undefined) requestedMetrics.push(MetricType.TALKING);

  const sdk = new SmartSpectraSDK({
    apiKey,
    requestedMetrics,
    enableTelemetry: telemetryEnabled === true,
  });

  sdk.on('metrics', (buf) => {
    const decoded = typeof decodeMetrics === 'function' ? decodeMetrics(buf) : buf;
    const plain = toPlainMetrics(decoded);
    if (plain) sendSdk('metrics', plain);
  });
  sdk.on('validationStatus', (code, ts, hint) => {
    sendSdk('validation', { code, ts, hint: hint || '' });
  });
  sdk.on('error', (code, message, retryable) => {
    sendSdk('error', { code, message, retryable });
  });
  if (typeof sdk.on === 'function') {
    sdk.on('videoOutput', (frame) => {
      try {
        if (!frame) return;
        if (typeof frame === 'string' && frame.startsWith('data:')) {
          sendSdk('frame', frame);
          return;
        }
        const buf = Buffer.isBuffer(frame) ? frame : frame.data || frame.buffer;
        if (buf && buf.length && buf.length < 400000) {
          const b64 = Buffer.from(buf).toString('base64');
          sendSdk('frame', `data:image/jpeg;base64,${b64}`);
        }
      } catch {
        // Preview is optional; measurement can continue without it.
      }
    });
  }

  try {
    if (typeof sdk.useCamera === 'function') {
      sdk.useCamera(CameraSelection ? CameraSelection.default : undefined);
    }
    sdk.start();
    sdkSession = sdk;
    return { ok: true };
  } catch (err) {
    return { error: err && err.message ? err.message : String(err) };
  }
});

ipcMain.handle('sdk:stop', () => stopSdk());

app.on('before-quit', () => {
  stopSdk();
});

app.on('window-all-closed', () => {
  stopSdk();
  app.quit();
});
