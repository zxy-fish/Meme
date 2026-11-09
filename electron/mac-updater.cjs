'use strict'

/**
 * macOS updater that does not depend on Squirrel/Developer ID.
 *
 * Why not electron-updater on macOS? Squirrel.Mac validates the downloaded app
 * against the running app's designated requirement. Our build is ad-hoc signed
 * (no Team ID), so every release has a different cdhash and validation always
 * fails. Instead we do it ourselves: fetch latest-mac.yml, download the zip,
 * verify its sha512, unpack it, validate the bundle, then hand the swap over to
 * a detached shell script that runs after the app quits.
 */

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawn, execFile } = require('node:child_process')
const { promisify } = require('node:util')
const { app, net } = require('electron')
const yaml = require('js-yaml')
const {
  isNewer,
  pickMacAsset,
  releaseAssetUrl,
  assetApiUrl,
  findAssetByName,
} = require('./update-utils.cjs')

const execFileAsync = promisify(execFile)

const REPO = 'zxy-fish/Meme'
/**
 * github.com/releases/latest/download/... answers 302 to
 * objects.githubusercontent.com, and on some networks (mainland China in
 * particular) github.com itself returns 504 while api.github.com and
 * release-assets.githubusercontent.com still work. So ask the REST API first
 * and keep the plain feed URL as a fallback.
 */
const RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`
const FEED_URL = `https://github.com/${REPO}/releases/latest/download/latest-mac.yml`
const BUNDLE_ID = 'app.meme.library'
const USER_AGENT = 'Meme-Updater'
const JSON_HEADERS = { accept: 'application/vnd.github+json', 'user-agent': USER_AGENT }
const ASSET_HEADERS = { accept: 'application/octet-stream', 'user-agent': USER_AGENT }
const FETCH_TIMEOUT = 15000
const FEED_TIMEOUT = 20000
const IDLE_TIMEOUT = 60000

/** /Applications/Meme.app/Contents/MacOS/Meme -> /Applications/Meme.app */
function bundlePath() {
  return path.resolve(process.execPath, '..', '..', '..')
}

function stagingDir() {
  const dir = path.join(app.getPath('userData'), 'updates')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

async function plistValue(file, key) {
  const { stdout } = await execFileAsync('/usr/bin/plutil', ['-extract', key, 'raw', '-o', '-', file])
  return String(stdout).trim()
}

function request(url, headers, timeout) {
  return net.fetch(url, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(timeout),
  })
}

/** Newest published release, or null when the API is unreachable or rate limited. */
async function fetchRelease() {
  try {
    const response = await request(RELEASE_API, JSON_HEADERS, FETCH_TIMEOUT)
    if (!response.ok) return null
    const release = await response.json()
    return release && Array.isArray(release.assets) ? release : null
  } catch {
    return null
  }
}

/** latest-mac.yml plus the release assets it refers to. */
async function resolveFeed() {
  const release = await fetchRelease()
  const feed = release ? findAssetByName(release.assets, 'latest-mac.yml') : null

  if (feed) {
    try {
      const response = await request(assetApiUrl(REPO, feed.id), ASSET_HEADERS, FETCH_TIMEOUT)
      if (response.ok) {
        const info = yaml.load(await response.text())
        if (info && typeof info === 'object' && info.version) {
          return { info, assets: release.assets }
        }
      }
    } catch {
      // Fall through to the plain feed below.
    }
  }

  let response
  try {
    response = await request(FEED_URL, {}, FEED_TIMEOUT)
  } catch {
    throw new Error('连不上 GitHub，请检查网络或代理')
  }
  if (!response.ok) throw new Error(`检查更新失败（HTTP ${response.status}）`)
  const info = yaml.load(await response.text())
  if (!info || typeof info !== 'object') throw new Error('更新信息格式不正确')
  return { info, assets: null }
}

function downloadFile(url, dest, onProgress, headers = {}) {
  return new Promise((resolve, reject) => {
    const netRequest = net.request({ url, redirect: 'follow' })
    for (const [name, value] of Object.entries(headers)) netRequest.setHeader(name, value)

    let idle = null
    const settled = { done: false }
    const finish = (error) => {
      if (settled.done) return
      settled.done = true
      clearTimeout(idle)
      if (error) reject(error)
      else resolve(dest)
    }
    const bump = () => {
      clearTimeout(idle)
      idle = setTimeout(() => {
        netRequest.abort()
        finish(new Error('下载超时，请重试'))
      }, IDLE_TIMEOUT)
    }

    bump()
    netRequest.on('response', (response) => {
      if (response.statusCode !== 200) {
        finish(new Error(`下载失败（HTTP ${response.statusCode}）`))
        return
      }
      const total = Number(response.headers['content-length']) || 0
      let received = 0
      const out = fs.createWriteStream(dest)
      out.on('error', finish)
      bump()
      response.on('data', (chunk) => {
        bump()
        received += chunk.length
        if (!out.write(chunk)) {
          response.pause()
          out.once('drain', () => response.resume())
        }
        if (total) onProgress(Math.min(99, Math.round((received / total) * 100)))
      })
      response.on('end', () => out.end(() => finish(null)))
      response.on('error', finish)
    })
    netRequest.on('error', finish)
    netRequest.end()
  })
}

function createMacUpdater({ onState }) {
  let pending = null
  let zipPath = null

  async function check() {
    onState({ status: 'checking', percent: 0, message: null })
    const { info, assets } = await resolveFeed()
    const current = app.getVersion()
    if (!isNewer(info.version, current)) {
      pending = null
      onState({ status: 'latest', version: current, percent: 0, message: null })
      return
    }
    const asset = pickMacAsset(info.files, process.arch)
    if (!asset) throw new Error('这个版本没有适合这台 Mac 的安装包')

    // Prefer downloading through the API: its redirect host is reachable where
    // github.com/releases/download/... is not.
    const meta = findAssetByName(assets, asset.url)
    pending = {
      version: info.version,
      url: meta ? assetApiUrl(REPO, meta.id) : releaseAssetUrl(REPO, info.version, asset.url),
      headers: meta ? ASSET_HEADERS : {},
      sha512: asset.sha512,
      size: asset.size,
    }
    onState({ status: 'available', version: pending.version, percent: 0, message: null })
  }

  async function download() {
    if (!pending) throw new Error('没有可下载的更新')
    const dest = path.join(stagingDir(), `Meme-${pending.version}-${process.arch}.zip`)
    onState({ status: 'downloading', percent: 0, message: null })
    await downloadFile(pending.url, dest, (percent) => onState({ status: 'downloading', percent }), pending.headers)

    const digest = crypto.createHash('sha512').update(fs.readFileSync(dest)).digest('base64')
    if (pending.sha512 && digest !== pending.sha512) {
      fs.rmSync(dest, { force: true })
      throw new Error('安装包校验失败，请重试')
    }
    zipPath = dest
    onState({ status: 'downloaded', version: pending.version, percent: 100, message: null })
  }

  async function install() {
    if (!pending || !zipPath) throw new Error('没有可安装的更新')

    const target = bundlePath()
    if (target.includes('/AppTranslocation/')) {
      throw new Error('当前是从只读位置运行，请先把 Meme 拖进「应用程序」再更新')
    }
    try {
      fs.accessSync(path.dirname(target), fs.constants.W_OK)
    } catch {
      throw new Error('没有写入应用目录的权限，请把 Meme 放进「应用程序」后重试')
    }

    const stage = fs.mkdtempSync(path.join(app.getPath('temp'), 'meme-update-'))
    await execFileAsync('/usr/bin/ditto', ['-x', '-k', zipPath, stage])
    const source = path.join(stage, 'Meme.app')
    if (!fs.existsSync(source)) throw new Error('安装包内容不完整')

    const infoPlist = path.join(source, 'Contents', 'Info.plist')
    if ((await plistValue(infoPlist, 'CFBundleIdentifier')) !== BUNDLE_ID) {
      throw new Error('安装包不是 Meme，已取消更新')
    }
    if ((await plistValue(infoPlist, 'CFBundleShortVersionString')) !== pending.version) {
      throw new Error('安装包版本不匹配，已取消更新')
    }

    const script = path.join(stage, 'install-update.sh')
    fs.writeFileSync(script, fs.readFileSync(path.join(__dirname, 'install-update.sh')), { mode: 0o755 })

    const log = fs.openSync(path.join(stage, 'install.log'), 'a')
    const child = spawn('/bin/sh', [script, String(process.pid), target, source, stage], {
      detached: true,
      stdio: ['ignore', log, log],
    })
    child.unref()

    onState({ status: 'installing', version: pending.version, percent: 100, message: null })
    setTimeout(() => app.quit(), 400)
  }

  return { check, download, install }
}

module.exports = { createMacUpdater, bundlePath }
