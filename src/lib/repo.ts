import { db } from './db'
import sampleText from '@/assets/demo.txt?raw'
import { parseChapters } from './reader/chapters'
import type { ImportedTxt } from './reader/txt'
import { SEED_BOOKMARKS, SEED_MEDIA, seedTimestamps } from './seed-data'
import type { Book, Bookmark, MediaItem } from './types'
import { hashText, uuid } from './utils'

const SEED_KEY = 'meme:seeded:v1'
let seedPromise: Promise<void> | null = null

export function ensureSeedData(): Promise<void> {
  if (!seedPromise) seedPromise = seedInternal()
  return seedPromise
}

async function seedInternal(): Promise<void> {
  if (localStorage.getItem(SEED_KEY)) return

  const [mediaCount, bookmarkCount, bookCount] = await Promise.all([
    db.media.count(),
    db.bookmarks.count(),
    db.books.count(),
  ])

  if (mediaCount === 0) {
    const items: MediaItem[] = SEED_MEDIA.map((item, index) => ({
      ...item,
      id: `seed-media-${item.type}-${index}`,
      ...seedTimestamps(index),
    }))
    await db.media.bulkAdd(items)
  }

  if (bookmarkCount === 0) {
    const now = Date.now()
    const items: Bookmark[] = SEED_BOOKMARKS.map((item, index) => ({
      ...item,
      id: `seed-bookmark-${index}`,
      createdAt: now - index * 86_400_000,
      updatedAt: now - index * 3_600_000,
    }))
    await db.bookmarks.bulkAdd(items)
  }

  if (bookCount === 0) {
    await seedDemoBook()
  }

  localStorage.setItem(SEED_KEY, '1')
}

async function seedDemoBook() {
  const now = Date.now()
  const id = 'demo-book'
  const chapters = parseChapters(sampleText)
  const book: Book = {
    id,
    title: '夜航书店',
    author: 'Meme 示例',
    format: 'txt',
    fileName: '夜航书店.txt',
    fileSize: new TextEncoder().encode(sampleText).length,
    encoding: 'UTF-8',
    chapterCount: chapters.length,
    tags: ['示例', '小说'],
    lastChapter: 0,
    lastPage: 0,
    percent: 0,
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', db.books, db.contents, async () => {
    await db.books.put(book)
    await db.contents.put({ id, text: sampleText, chapters })
  })
}

export async function createMedia(
  input: Partial<MediaItem> & Pick<MediaItem, 'type' | 'title'>,
): Promise<MediaItem> {
  const now = Date.now()
  const item: MediaItem = {
    id: uuid(),
    type: input.type,
    title: input.title,
    originalTitle: input.originalTitle,
    cover: input.cover,
    year: input.year,
    status: input.status ?? 'wish',
    rating: input.rating,
    favorite: input.favorite,
    progressCurrent: input.progressCurrent ?? 0,
    progressTotal: input.progressTotal,
    progressUnit: input.progressUnit ?? 'ep',
    startDate: input.startDate,
    endDate: input.endDate,
    tags: input.tags ?? [],
    genres: input.genres ?? [],
    studios: input.studios ?? [],
    cast: input.cast ?? [],
    characters: input.characters ?? [],
    synopsis: input.synopsis,
    sourceUrl: input.sourceUrl,
    externalIds: input.externalIds,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  }
  await db.media.add(item)
  return item
}

export async function updateMedia(id: string, patch: Partial<MediaItem>): Promise<void> {
  await db.media.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteMedia(id: string): Promise<void> {
  const now = Date.now()
  await db.media.update(id, { deletedAt: now, updatedAt: now })
}

export async function restoreMedia(id: string): Promise<void> {
  await db.media.update(id, { deletedAt: undefined, updatedAt: Date.now() })
}

export async function toggleFavorite(id: string, favorite: boolean): Promise<void> {
  await db.media.update(id, { favorite, updatedAt: Date.now() })
}

export async function bumpProgress(id: string, delta: number, total?: number): Promise<void> {
  const item = await db.media.get(id)
  if (!item) return
  const max = total ?? item.progressTotal
  const next = Math.max(0, Math.min(max ?? Number.MAX_SAFE_INTEGER, item.progressCurrent + delta))
  await db.media.update(id, {
    progressCurrent: next,
    updatedAt: Date.now(),
    status: item.status === 'wish' && next > 0 ? 'doing' : item.status,
  })
}

export async function createBookmark(
  input: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Bookmark> {
  const now = Date.now()
  const item: Bookmark = { ...input, id: uuid(), createdAt: now, updatedAt: now }
  await db.bookmarks.add(item)
  return item
}

export async function updateBookmark(id: string, patch: Partial<Bookmark>): Promise<void> {
  await db.bookmarks.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteBookmark(id: string): Promise<void> {
  const now = Date.now()
  await db.bookmarks.update(id, { deletedAt: now, updatedAt: now })
}

export async function importTxtBook(file: File): Promise<Book> {
  const { readTxtFile } = await import('./reader/txt')
  const parsed: ImportedTxt = await readTxtFile(file)
  const now = Date.now()
  // Content-addressed id: importing the same TXT on the phone and the laptop
  // yields the same book record, so reading progress can sync between them.
  const id = `book-${(await hashText(parsed.text)).slice(0, 40)}`
  const existing = await db.books.get(id)
  const book: Book = {
    id,
    title: parsed.title,
    author: parsed.author,
    format: 'txt',
    fileName: parsed.fileName,
    fileSize: parsed.fileSize,
    encoding: parsed.encoding,
    chapterCount: parsed.chapters.length,
    tags: existing?.tags ?? [],
    lastChapter: existing?.lastChapter ?? 0,
    lastPage: existing?.lastPage ?? 0,
    percent: existing?.percent ?? 0,
    lastReadAt: existing?.lastReadAt,
    marks: existing?.marks,
    cover: existing?.cover,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: undefined,
  }
  await db.transaction('rw', db.books, db.contents, async () => {
    await db.books.put(book)
    await db.contents.put({
      id,
      text: parsed.text,
      chapters: parsed.chapters.map(({ title, start, end, index }) => ({ title, start, end, index })),
    })
  })
  return book
}

export async function saveReadingProgress(
  bookId: string,
  chapter: number,
  page: number,
  percent: number,
): Promise<void> {
  const now = Date.now()
  await db.books.update(bookId, {
    lastChapter: chapter,
    lastPage: page,
    percent: Math.round(percent * 1000) / 10,
    lastReadAt: now,
    updatedAt: now,
  })
}

export async function deleteBook(id: string): Promise<void> {
  const now = Date.now()
  await db.books.update(id, { deletedAt: now, updatedAt: now })
}

export async function purgeBook(id: string): Promise<void> {
  await db.transaction('rw', db.books, db.contents, async () => {
    await db.books.delete(id)
    await db.contents.delete(id)
  })
}

export async function resetLibrary(): Promise<void> {
  await db.transaction('rw', [db.media, db.bookmarks, db.books, db.contents], async () => {
    await Promise.all([db.media.clear(), db.bookmarks.clear(), db.books.clear(), db.contents.clear()])
  })
  localStorage.removeItem(SEED_KEY)
}

export async function updateBook(id: string, patch: Partial<Book>): Promise<void> {
  await db.books.update(id, { ...patch, updatedAt: Date.now() })
}
