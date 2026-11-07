import Dexie, { type EntityTable } from 'dexie'
import type { Book, BookContent, Bookmark, CachedCover, ComicPage, MediaItem, Note, ReadingSession } from './types'

class MemeDatabase extends Dexie {
  media!: EntityTable<MediaItem, 'id'>
  bookmarks!: EntityTable<Bookmark, 'id'>
  books!: EntityTable<Book, 'id'>
  contents!: EntityTable<BookContent, 'id'>
  notes!: EntityTable<Note, 'id'>
  pages!: EntityTable<ComicPage, 'id'>
  readingSessions!: EntityTable<ReadingSession, 'id'>
  covers!: EntityTable<CachedCover, 'url'>

  constructor() {
    super('meme')
    this.version(1).stores({
      media: 'id, type, status, title, year, updatedAt, deletedAt, *tags, favorite',
      bookmarks: 'id, title, url, updatedAt, deletedAt, *tags',
      books: 'id, title, format, updatedAt, deletedAt, *tags',
      contents: 'id',
    })
    this.version(2).stores({
      notes: 'id, title, updatedAt, deletedAt, *tags, pinned',
    })
    this.version(3).stores({
      books: 'id, mediaId, title, format, updatedAt, deletedAt, *tags',
      pages: 'id, bookId, [bookId+index]',
    })
    this.version(4).stores({
      readingSessions: 'id, bookId, date, updatedAt',
    })
    this.version(5).stores({
      covers: 'url, updatedAt',
    })
  }
}

export const db = new MemeDatabase()

export async function exportBackup() {
  const [media, bookmarks, books, notes, readingSessions] = await Promise.all([
    db.media.toArray(),
    db.bookmarks.toArray(),
    db.books.toArray(),
    db.notes.toArray(),
    db.readingSessions.toArray(),
  ])
  return {
    version: 1 as const,
    app: 'meme' as const,
    exportedAt: Date.now(),
    media,
    bookmarks,
    books,
    notes,
    readingSessions,
  }
}

export async function importBackup(backup: {
  media?: MediaItem[]
  bookmarks?: Bookmark[]
  books?: Book[]
  notes?: Note[]
  readingSessions?: ReadingSession[]
}) {
  await db.transaction('rw', db.media, db.bookmarks, db.books, db.notes, db.readingSessions, async () => {
    if (backup.media?.length) {
      const merged = new Map<string, MediaItem>()
      for (const item of await db.media.toArray()) merged.set(item.id, item)
      for (const item of backup.media) {
        const existing = merged.get(item.id)
        if (!existing || (item.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) merged.set(item.id, item)
      }
      await db.media.bulkPut([...merged.values()])
    }
    if (backup.bookmarks?.length) {
      const merged = new Map<string, Bookmark>()
      for (const item of await db.bookmarks.toArray()) merged.set(item.id, item)
      for (const item of backup.bookmarks) {
        const existing = merged.get(item.id)
        if (!existing || (item.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) merged.set(item.id, item)
      }
      await db.bookmarks.bulkPut([...merged.values()])
    }
    if (backup.books?.length) {
      const merged = new Map<string, Book>()
      for (const item of await db.books.toArray()) merged.set(item.id, item)
      for (const item of backup.books) {
        const existing = merged.get(item.id)
        if (!existing || (item.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) merged.set(item.id, item)
      }
      await db.books.bulkPut([...merged.values()])
    }
    if (backup.notes?.length) {
      const merged = new Map<string, Note>()
      for (const item of await db.notes.toArray()) merged.set(item.id, item)
      for (const item of backup.notes) {
        const existing = merged.get(item.id)
        if (!existing || (item.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) merged.set(item.id, item)
      }
      await db.notes.bulkPut([...merged.values()])
    }
    if (backup.readingSessions?.length) {
      const merged = new Map<string, ReadingSession>()
      for (const item of await db.readingSessions.toArray()) merged.set(item.id, item)
      for (const item of backup.readingSessions) {
        const existing = merged.get(item.id)
        if (!existing || (item.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) merged.set(item.id, item)
      }
      await db.readingSessions.bulkPut([...merged.values()])
    }
  })
}
