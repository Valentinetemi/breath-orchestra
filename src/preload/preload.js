'use strict';

// npm start bundles this file into dist/preload.js so the SDK bridge loads under the sandbox.
const { contextBridge, ipcRenderer } = require('electron');

try {
  require('@smartspectra/node-sdk/preload');
} catch {
  // Unbundled or SDK missing: Practice mode still gets the bridge below.
}

contextBridge.exposeInMainWorld('breathOrchestra', {
  getConfig: () => ipcRenderer.invoke('app:getConfig'),
  getLiveCredentials: () => ipcRenderer.invoke('app:getLiveCredentials'),
  setConsent: (payload) => ipcRenderer.invoke('app:setConsent', payload),
  cameraAccess: () => ipcRenderer.invoke('app:cameraAccess'),
  requestCamera: () => ipcRenderer.invoke('app:requestCamera'),
  log: (level, message) => ipcRenderer.send('app:log', String(level), String(message)),
});
