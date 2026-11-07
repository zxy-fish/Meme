export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'latest'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'unsupported'

export interface UpdateState {
  status: UpdateStatus
  version?: string | null
  percent?: number
  message?: string | null
}

export interface DesktopAppInfo {
  version: string
  platform: string
  packaged: boolean
  updatable: boolean
}

interface DesktopBridge {
  platform: string
  electron: string
  appInfo: () => Promise<DesktopAppInfo>
  updates: {
    getState: () => Promise<UpdateState>
    check: () => Promise<UpdateState>
    download: () => Promise<UpdateState>
    install: () => Promise<boolean>
    onState: (callback: (state: UpdateState) => void) => () => void
  }
}

declare global {
  interface Window {
    memeDesktop?: DesktopBridge
  }
}

/** Present only in the Electron shell; the web build has no bridge. */
export const desktopBridge: DesktopBridge | undefined =
  typeof window === 'undefined' ? undefined : window.memeDesktop

export const isDesktop = Boolean(desktopBridge)

/**
 * Auto-update needs electron-updater and a packaged app. On macOS the build is
 * ad-hoc signed, so the download step can fail signature validation; the UI
 * falls back to the Releases page in that case.
 */
export const canSelfUpdate = Boolean(desktopBridge?.updates)
