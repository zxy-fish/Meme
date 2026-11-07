const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('memeDesktop', {
  platform: process.platform,
  electron: process.versions.electron,
  appInfo: () => ipcRenderer.invoke('app:info'),
  updates: {
    getState: () => ipcRenderer.invoke('update:state'),
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onState: (callback) => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('update:state', listener)
      return () => ipcRenderer.removeListener('update:state', listener)
    },
  },
})
