const { contextBridge } = require('electron');

// Expose minimal STUDIOSTAFF macOS info to the renderer
contextBridge.exposeInMainWorld('studiostaffOSX', {
  isMacOS: true,
  platform: process.platform,
  version: '1.0.0',
});
