const { app, BrowserWindow, ipcMain, shell, protocol } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const isDev = process.argv.includes('--dev')
const isSmoke = process.argv.includes('--smoke')
const DEV_URL = 'http://127.0.0.1:5173'

// electron-updater is only present in packaged builds; keep the app usable
// (and the smoke test green) if the module is missing.
let autoUpdater = null
try {
  autoUpdater = require('electron-updater').autoUpdater
} catch (error) {
  console.warn('[meme] electron-updater unavailable:', error?.message ?? error)
}

const updateState = { status: 'idle', version: null, percent: 0, message: null }

function publishUpdateState(patch) {
  Object.assign(updateState, patch)
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('update:state', { ...updateState })
  }
}

let updateBackend = null

/** macOS uses our own installer; Windows/Linux keep electron-updater. */
function setupUpdater() {
  if (!app.isPackaged) return

  if (process.platform === 'darwin') {
    const { createMacUpdater } = require('./mac-updater.cjs')
    updateBackend = createMacUpdater({ onState: (patch) => publishUpdateState(patch) })
  } else if (autoUpdater) {
    // Set the feed explicitly so updates work even if app-update.yml is absent
    // (e.g. a --dir build or a hand-made bundle).
    try {
      autoUpdater.setFeedURL({ provider: 'github', owner: 'zxy-fish', repo: 'Meme' })
    } catch (error) {
      console.warn('[meme] could not set update feed:', error?.message ?? error)
    }
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.on('checking-for-update', () => publishUpdateState({ status: 'checking', percent: 0 }))
    autoUpdater.on('update-available', (info) =>
      publishUpdateState({ status: 'available', version: info.version, percent: 0, message: null }),
    )
    autoUpdater.on('update-not-available', () =>
      publishUpdateState({ status: 'latest', version: app.getVersion(), percent: 0, message: null }),
    )
    autoUpdater.on('download-progress', (progress) =>
      publishUpdateState({ status: 'downloading', percent: Math.round(progress.percent ?? 0) }),
    )
    autoUpdater.on('update-downloaded', (info) =>
      publishUpdateState({ status: 'downloaded', version: info.version, percent: 100, message: null }),
    )
    autoUpdater.on('error', (error) =>
      publishUpdateState({ status: 'error', message: String(error?.message ?? error) }),
    )
    updateBackend = {
      check: () => autoUpdater.checkForUpdates(),
      download: () => autoUpdater.downloadUpdate(),
      install: () => autoUpdater.quitAndInstall(),
    }
  }

  if (!updateBackend) return
  // Look for a new version shortly after launch, but never block startup and
  // never surface an error the user did not ask for.
  setTimeout(() => {
    updateBackend.check().catch((error) => {
      console.warn('[meme] update check failed:', error?.message ?? error)
      publishUpdateState({ status: 'idle', percent: 0, message: null })
    })
  }, 5000)
}

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  packaged: app.isPackaged,
  updatable: Boolean(updateBackend),
}))

ipcMain.handle('update:state', () => ({ ...updateState }))

ipcMain.handle('update:check', async () => {
  if (!updateBackend) {
    return { status: 'unsupported', message: '当前环境不支持自动更新' }
  }
  try {
    await updateBackend.check()
  } catch (error) {
    publishUpdateState({ status: 'error', message: String(error?.message ?? error) })
  }
  return { ...updateState }
})

ipcMain.handle('update:download', async () => {
  if (!updateBackend) return { ...updateState }
  try {
    await updateBackend.download()
  } catch (error) {
    publishUpdateState({ status: 'error', message: String(error?.message ?? error) })
  }
  return { ...updateState }
})

ipcMain.handle('update:install', () => {
  if (!updateBackend) return false
  Promise.resolve(updateBackend.install()).catch((error) => {
    console.warn('[meme] update install failed:', error?.message ?? error)
    publishUpdateState({ status: 'error', message: String(error?.message ?? error) })
  })
  return true
})


const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

// A standard, secure scheme gives IndexedDB and fetch a normal origin
// (file:// pages get an opaque origin and IndexedDB is disabled).
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
])

function registerAppProtocol() {
  const root = path.resolve(path.join(__dirname, '..', 'dist'))
  protocol.handle('app', async (request) => {
    const url = new URL(request.url)
    let pathname = decodeURIComponent(url.pathname)
    if (pathname === '/' || pathname === '') pathname = '/index.html'
    const filePath = path.normalize(path.join(root, pathname))
    if (!filePath.startsWith(root + path.sep)) {
      return new Response('Forbidden', { status: 403 })
    }
    if (!fs.existsSync(filePath)) {
      return new Response('Not found', { status: 404 })
    }
    const body = await fs.promises.readFile(filePath)
    return new Response(body, {
      headers: { 'content-type': MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream' },
    })
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 980,
    minHeight: 640,
    show: !isSmoke,
    backgroundColor: '#0a0b0d',
    title: 'Meme',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  win.setMenuBarVisibility(false)

  if (isDev) {
    win.loadURL(DEV_URL)
  } else {
    win.loadURL('app://meme/index.html')
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (/^https?:/i.test(url) && !url.startsWith(DEV_URL)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  if (isSmoke) {
    win.webContents.once('did-finish-load', () => {
      console.log('SMOKE_OK')
      setTimeout(() => app.quit(), 500)
    })
    win.webContents.once('did-fail-load', (_event, code, description) => {
      console.error('SMOKE_FAIL', code, description)
      app.exit(1)
    })
  }

  return win
}

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('app.meme.library')
  if (!isDev) registerAppProtocol()
  createWindow()
  setupUpdater()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
