const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('memeDesktop', {
  platform: process.platform,
  electron: process.versions.electron,
})
