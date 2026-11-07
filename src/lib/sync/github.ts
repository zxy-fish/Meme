import { db, exportBackup } from '../db'
import type { Bookmark, LibraryBackup, MediaItem, Note, ReadingSession, SyncConfig } from '../types'
import { emptyBackup, mergeLibrary } from './merge'

const API = 'https://api.github.com'

export interface RemoteFile {
  data: LibraryBackup | null
  sha?: string
}

export interface SyncResult {
  merged: number
  media: number
  bookmarks: number
  books: number
  notes: number
  pushed: boolean
  remoteFound: boolean
  at: number
}

export class SyncError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SyncError'
  }
}

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function assertConfig(config: SyncConfig) {
  if (!config.token.trim()) throw new SyncError('还没有填写 GitHub Token')
  if (!config.owner.trim() || !config.repo.trim()) throw new SyncError('请先填写仓库 owner / repo')
}

async function api<T>(
  config: SyncConfig,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; data: T | null; message?: string }> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(`${API}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.token.trim()}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    })
    let payload: unknown = null
    const text = await response.text()
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = null
      }
    }
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : undefined
    return { status: response.status, data: payload as T | null, message }
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new SyncError('请求 GitHub 超时')
    throw new SyncError('连不上 GitHub，请检查网络')
  } finally {
    window.clearTimeout(timer)
  }
}

function contentPath(config: SyncConfig): string {
  const path = config.path.replace(/^\/+/, '')
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export async function pullRemote(config: SyncConfig): Promise<RemoteFile> {
  assertConfig(config)
  const path = contentPath(config)
  const response = await api<{ content?: string; encoding?: string; sha?: string }>(
    config,
    `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${path}?ref=${encodeURIComponent(config.branch)}`,
  )

  if (response.status === 404) {
    return { data: null }
  }
  if (response.status === 401) throw new SyncError('Token 无效或已过期')
  if (response.status === 403) throw new SyncError('Token 没有该仓库的 Contents 读写权限')
  if (response.status >= 400 || !response.data) {
    throw new SyncError(response.message ?? `读取仓库失败 (${response.status})`)
  }
  const content = response.data.content
  if (!content) return { data: null, sha: response.data.sha }
  try {
    const parsed = JSON.parse(decodeBase64(content)) as LibraryBackup
    if (!parsed || parsed.app !== 'meme' || !Array.isArray(parsed.media)) {
      throw new Error('format')
    }
    return { data: parsed, sha: response.data.sha }
  } catch {
    throw new SyncError('远程文件不是有效的 Meme 备份')
  }
}

async function pushRemote(
  config: SyncConfig,
  backup: LibraryBackup,
  sha: string | undefined,
  attempt = 0,
): Promise<{ sha?: string; conflict: boolean }> {
  const body = {
    message: `sync: ${new Date().toISOString()} · ${backup.media.length} 条目 / ${backup.bookmarks.length} 书签`,
    content: encodeBase64(JSON.stringify(backup)),
    branch: config.branch,
    ...(sha ? { sha } : {}),
  }
  const response = await api<{ content?: { sha?: string } }>(
    config,
    `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${contentPath(config)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )

  if (response.status === 409 || response.status === 422) {
    if (attempt >= 2) throw new SyncError('远程文件刚刚被其他设备修改，请再同步一次')
    return { conflict: true }
  }
  if (response.status === 401) throw new SyncError('Token 无效或已过期')
  if (response.status === 403) throw new SyncError('Token 没有该仓库的 Contents 读写权限')
  if (response.status >= 400) throw new SyncError(response.message ?? `写入仓库失败 (${response.status})`)
  return { sha: response.data?.content?.sha, conflict: false }
}

export async function applyBackup(backup: LibraryBackup): Promise<void> {
  await db.transaction('rw', [db.media, db.bookmarks, db.books, db.notes, db.readingSessions], async () => {
    if (backup.media.length) await db.media.bulkPut(backup.media as MediaItem[])
    if (backup.bookmarks.length) await db.bookmarks.bulkPut(backup.bookmarks as Bookmark[])
    if (backup.books.length) await db.books.bulkPut(backup.books)
    if (backup.notes?.length) await db.notes.bulkPut(backup.notes as Note[])
    if (backup.readingSessions?.length) {
      await db.readingSessions.bulkPut(backup.readingSessions as ReadingSession[])
    }
  })
}

async function runSync(config: SyncConfig): Promise<SyncResult> {
  assertConfig(config)
  const local = (await exportBackup()) as LibraryBackup
  let remote: RemoteFile = { data: null }

  try {
    remote = await pullRemote(config)
  } catch (error) {
    // A brand-new repository with no commits has no branch yet.
    if (!(error instanceof SyncError) || !error.message.includes('404')) throw error
  }

  const merged = remote.data ? mergeLibrary(local, remote.data) : local
  merged.exportedAt = Date.now()

  await applyBackup(merged)

  let sha = remote.sha
  let pushed = false
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await pushRemote(config, merged, sha, attempt)
    if (result.conflict) {
      const latest = await pullRemote(config)
      if (latest.data) {
        const remerged = mergeLibrary(merged, latest.data)
        remerged.exportedAt = Date.now()
        Object.assign(merged, remerged)
        await applyBackup(remerged)
      }
      sha = latest.sha
      continue
    }
    pushed = true
    break
  }

  localStorage.setItem('meme:lastSync', String(Date.now()))
  return {
    merged:
      merged.media.length + merged.bookmarks.length + merged.books.length + (merged.notes?.length ?? 0),
    media: merged.media.length,
    bookmarks: merged.bookmarks.length,
    books: merged.books.length,
    notes: merged.notes?.length ?? 0,
    pushed,
    remoteFound: Boolean(remote.data),
    at: Date.now(),
  }
}

export async function testConnection(config: SyncConfig): Promise<string> {
  assertConfig(config)
  const response = await api<{ full_name: string; private: boolean; permissions?: { push?: boolean } }>(
    config,
    `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`,
  )
  if (response.status === 404) throw new SyncError('仓库不存在，或 Token 没有访问权限')
  if (response.status === 401) throw new SyncError('Token 无效或已过期')
  if (response.status >= 400 || !response.data) {
    throw new SyncError(response.message ?? '仓库连接失败')
  }
  return `${response.data.full_name}${response.data.private ? '（私有）' : '（公开）'}`
}

export async function createRemoteIfMissing(config: SyncConfig): Promise<void> {
  // Kept for future use: the data repository is created once by the owner.
  if (!config.owner) throw new SyncError('缺少 owner')
}

export { emptyBackup }

let inFlight: Promise<SyncResult> | null = null

/** Coalesce concurrent syncs (auto-sync + manual sync, StrictMode double calls). */
export function syncNow(config: SyncConfig): Promise<SyncResult> {
  if (inFlight) return inFlight
  inFlight = runSync(config).finally(() => {
    inFlight = null
  })
  return inFlight
}
