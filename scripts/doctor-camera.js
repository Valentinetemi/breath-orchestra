'use strict';

// Runs inside Electron, which is the process macOS checks camera access for.
const { app, systemPreferences } = require('electron');

app.whenReady().then(() => {
  const status = typeof systemPreferences.getMediaAccessStatus === 'function'
    ? systemPreferences.getMediaAccessStatus('camera')
    : 'unknown';
  process.stdout.write(`camera=${status}\n`);
  app.quit();
});
