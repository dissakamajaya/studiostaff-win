const { contextBridge } = require('electron');

// Expose minimal STUDIOSTAFF Windows info to the renderer
contextBridge.exposeInMainWorld('studiostaffWin', {
  isWindows: true,
  platform: process.platform,
  version: '1.0.0',
});
