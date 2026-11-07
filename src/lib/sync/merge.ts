import type { LibraryBackup } from '../types'

export interface Syncable {
  id: string
  updatedAt: number
  deletedAt?: number
}

/**
 * Last-write-wins merge. Tombstones are kept so a deletion on one device
 * doesn't get resurrected by an older copy on another device.
 */
export function mergeRecords<T extends Syncable>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of local) map.set(item.id, item)
  for (const item of remote) {
    const current = map.get(item.id)
    if (!current) {
      map.set(item.id, item)
      continue
    }
    if (item.updatedAt > current.updatedAt) {
      map.set(item.id, item)
      continue
    }
    if (item.updatedAt === current.updatedAt) {
      // Prefer the record that already has a tombstone, then the local copy.
      if (item.deletedAt && !current.deletedAt) map.set(item.id, item)
    }
  }
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

export function mergeLibrary(local: LibraryBackup, remote: LibraryBackup): LibraryBackup {
  return {
    version: 1,
    app: 'meme',
    exportedAt: Math.max(local.exportedAt, remote.exportedAt),
    media: mergeRecords(local.media, remote.media),
    bookmarks: mergeRecords(local.bookmarks, remote.bookmarks),
    books: mergeRecords(local.books, remote.books),
    notes: mergeRecords(local.notes ?? [], remote.notes ?? []),
  }
}

export function emptyBackup(): LibraryBackup {
  return {
    version: 1,
    app: 'meme',
    exportedAt: 0,
    media: [],
    bookmarks: [],
    books: [],
    notes: [],
  }
}
