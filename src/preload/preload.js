'use strict';

try {
  require('@smartspectra/node-sdk/preload');
} catch {
  // Practice mode does not need the native SDK preload bridge.
}

const { contextBridge, ipcRenderer } = require('electron');

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
