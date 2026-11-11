import { Capacitor, registerPlugin } from '@capacitor/core'
import type { UpdateState } from './desktop'

/**
 * In-app update for the Android build.
 *
 * The native side (AppUpdaterPlugin) downloads and installs; this module only
 * talks to the GitHub REST API. api.github.com is reachable on networks where
 * github.com is not, and the API hands out release-assets.githubusercontent.com
 * URLs, which the native downloader follows.
 */

interface AppUpdaterPlugin {
  canInstall(): Promise<{ value: boolean }>
  openInstallSettings(): Promise<void>
  downloadAndInstall(options: { url: string; sha256?: string; fileName?: string }): Promise<void>
  addListener(
    event: 'progress',
    listener: (data: { percent: number }) => void,
  ): Promise<{ remove: () => void }>
  addListener(
    event: 'state',
    listener: (data: { status: string }) => void,
  ): Promise<{ remove: () => void }>
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>('AppUpdater')

const REPO = 'zxy-fish/Meme'
const RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`
const APK_NAME = /^Meme-.*\.apk$/

export const isAndroidApp =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

interface ReleaseAsset {
  name: string
  id: number
  digest?: string | null
}

interface PendingUpdate {
  version: string
  url: string
  sha256?: string
  fileName: string
}

let pending: PendingUpdate | null = null

function normalizeVersion(value: string): number[] {
  const parts = String(value || '')
    .replace(/^v/i, '')
    .split(/[.+-]/)
    .slice(0, 3)
    .map((part) => {
      const parsed = Number.parseInt(part, 10)
      return Number.isFinite(parsed) ? parsed : 0
    })
  while (parts.length < 3) parts.push(0)
  return parts
}

export function isNewerVersion(candidate: string, current: string): boolean {
  const next = normalizeVersion(candidate)
  const now = normalizeVersion(current)
  for (let i = 0; i < 3; i += 1) {
    if (next[i] > now[i]) return true
    if (next[i] < now[i]) return false
  }
  return false
}

/** Ask GitHub for the newest release and remember what to download. */
export async function checkAndroidUpdate(): Promise<UpdateState> {
  const current = __APP_VERSION__

  let release: { tag_name?: string; assets?: ReleaseAsset[] }
  try {
    const response = await fetch(RELEASE_API, {
      headers: { accept: 'application/vnd.github+json' },
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error(`检查更新失败（HTTP ${response.status}）`)
    }
    release = await response.json()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.startsWith('检查更新失败')) throw error
    throw new Error('连不上 GitHub，请检查网络或代理')
  }

  const tag = String(release.tag_name ?? '').replace(/^v/, '')
  if (!tag || !isNewerVersion(tag, current)) {
    pending = null
    return { status: 'latest', version: current, percent: 0, message: null }
  }

  const apk = (release.assets ?? []).find((asset) => APK_NAME.test(asset.name))
  if (!apk) throw new Error('这个版本没有提供 APK')

  pending = {
    version: tag,
    // The API asset URL redirects to release-assets.githubusercontent.com;
    // github.com/releases/download is blocked on some networks.
    url: `https://api.github.com/repos/${REPO}/releases/assets/${apk.id}`,
    sha256: apk.digest?.startsWith('sha256:') ? apk.digest.slice(7) : undefined,
    fileName: apk.name,
  }

  return { status: 'available', version: tag, percent: 0, message: null }
}

/**
 * Download the APK and hand it to the system installer. Resolves once the
 * installer activity has been launched (the user still has to tap install).
 */
export async function startAndroidUpdate(
  onProgress: (percent: number) => void,
): Promise<void> {
  if (!pending) throw new Error('没有可下载的更新')

  const allowed = await AppUpdater.canInstall()
  if (!allowed.value) {
    await AppUpdater.openInstallSettings()
    throw new Error('请允许 Meme 安装未知来源应用，然后重新检查更新')
  }

  const listener = await AppUpdater.addListener('progress', (data) => onProgress(data.percent))
  try {
    await AppUpdater.downloadAndInstall({
      url: pending.url,
      sha256: pending.sha256,
      fileName: pending.fileName,
    })
  } finally {
    await listener.remove()
  }
}

export function androidUpdateVersion(): string | null {
  return pending?.version ?? null
}
