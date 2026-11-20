'use strict';

// Official SmartSpectra Electron apps keep sandbox: true and require this
// from an existing preload. If the SDK is missing or throws, practice mode
// must still get the app bridge below.
const { contextBridge, ipcRenderer } = require('electron');

try {
  require('@smartspectra/node-sdk/preload');
} catch {
  // Live camera mode can still start the SDK from the main process.
}

contextBridge.exposeInMainWorld('breathOrchestra', {
  getConfig: () => ipcRenderer.invoke('app:getConfig'),
  getLiveCredentials: () => ipcRenderer.invoke('app:getLiveCredentials'),
  setConsent: (payload) => ipcRenderer.invoke('app:setConsent', payload),
  cameraAccess: () => ipcRenderer.invoke('app:cameraAccess'),
  startSdk: () => ipcRenderer.invoke('sdk:start'),
  stopSdk: () => ipcRenderer.invoke('sdk:stop'),
  onSdkEvent: (cb) => {
    const handler = (_event, type, payload) => cb(type, payload);
    ipcRenderer.on('sdk:event', handler);
  },
});
