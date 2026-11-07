const { app, BrowserWindow, shell, protocol } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const isDev = process.argv.includes('--dev')
const isSmoke = process.argv.includes('--smoke')
const DEV_URL = 'http://127.0.0.1:5173'

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
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
