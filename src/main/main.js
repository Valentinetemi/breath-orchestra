'use strict';

const { app, BrowserWindow, ipcMain, session, systemPreferences } = require('electron');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let bindSmartSpectraIpc = null;
let sdkAvailable = false;
let sdkError = '';
try {
  ({ bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main'));
  sdkAvailable = true;
} catch (err) {
  // Machines without the native runtime can still use Practice mode.
  sdkError = err && err.message ? err.message.split('\n')[0] : String(err);
}

let cameraConsent = false;
let telemetryEnabled = false;

function log(...args) {
  console.log('[breath-orchestra]', ...args);
}

function logError(...args) {
  console.error('[breath-orchestra]', ...args);
}

function bundleReady() {
  const file = path.join(__dirname, '../../dist/smartspectra-renderer.js');
  return fs.existsSync(file) && !fs.readFileSync(file, 'utf8').startsWith('window.SmartSpectraMissing');
}

// The bundled preload carries the SDK bridge; the plain one is enough for Practice mode.
function preloadPath() {
  const bundled = path.join(__dirname, '../../dist/preload.js');
  return fs.existsSync(bundled) ? bundled : path.join(__dirname, '../preload/preload.js');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#07060a',
    title: 'Breath Orchestra',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
    show: false,
  });

  win.once('ready-to-show', () => win.show());
  // Only our bundled page should ever hold the camera grant.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  if (bindSmartSpectraIpc) bindSmartSpectraIpc(win);
  const query = {};
  if (process.argv.includes('--sim')) query.sim = '1';
  const calArg = process.argv.find((arg) => arg.startsWith('--calMs='));
  if (calArg) query.calMs = calArg.slice('--calMs='.length);
  const speedArg = process.argv.find((arg) => arg.startsWith('--songSpeed='));
  if (speedArg) query.songSpeed = speedArg.slice('--songSpeed='.length);
  win.loadFile(path.join(__dirname, '../renderer/index.html'), { query });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const url = (details && details.requestingUrl) || (wc && wc.getURL()) || '';
    const mediaTypes = (details && details.mediaTypes) || [];
    const cameraOnly = mediaTypes.length > 0 && mediaTypes.every((type) => type === 'video');
    const ok = cameraConsent && permission === 'media' && cameraOnly && url.startsWith('file://');
    if (permission === 'media' && !ok) logError('Blocked a camera request', { cameraConsent, mediaTypes });
    callback(ok);
  });

  session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
    if (permission === 'media') return cameraConsent;
    return false;
  });

  log(`Electron ${process.versions.electron} on ${process.platform}-${process.arch}`);
  if (sdkAvailable) log('SmartSpectra SDK loaded.');
  else logError(`SmartSpectra SDK not available: ${sdkError}`);
  if (!bundleReady()) logError('SmartSpectra bridge is not bundled. Start with "npm start" (it runs "npm run build" first).');
  if (!(process.env.SMARTSPECTRA_API_KEY || '').trim()) logError('SMARTSPECTRA_API_KEY is empty. Add it to .env to use the camera.');
  createWindow();
});

ipcMain.handle('app:getConfig', async () => ({
  hasApiKey: Boolean((process.env.SMARTSPECTRA_API_KEY || '').trim()),
  sdkAvailable,
  sdkError,
  bundleReady: bundleReady(),
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

// Ask the OS up front so a denial shows up as a clear message, not a silent black preview.
ipcMain.handle('app:requestCamera', async () => {
  if (!cameraConsent) return { granted: false, status: 'no-consent' };
  if (process.platform !== 'darwin') return { granted: true, status: 'not-applicable' };
  let status = systemPreferences.getMediaAccessStatus('camera');
  if (status === 'not-determined') {
    const granted = await systemPreferences.askForMediaAccess('camera');
    status = granted ? 'granted' : 'denied';
  }
  const granted = status === 'granted';
  if (granted) log('macOS camera access: granted');
  else logError(`macOS camera access: ${status}. Allow it in System Settings > Privacy & Security > Camera for the app you ran "npm start" from (Terminal, iTerm, VS Code, Cursor), then quit and reopen that app.`);
  return { granted, status };
});

ipcMain.on('app:log', (_event, level, message) => {
  if (level === 'error' || level === 'warn') logError(message);
  else log(message);
});

ipcMain.handle('app:cameraAccess', async () => {
  if (process.platform !== 'darwin' || typeof systemPreferences.getMediaAccessStatus !== 'function') {
    return { status: 'unknown' };
  }
  return { status: systemPreferences.getMediaAccessStatus('camera') };
});


app.on('window-all-closed', () => {
  app.quit();
});
