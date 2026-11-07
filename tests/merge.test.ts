import { describe, expect, it } from 'vitest'
import { mergeLibrary, mergeRecords, type Syncable } from '../src/lib/sync/merge'
import type { LibraryBackup } from '../src/lib/types'

interface Row extends Syncable {
  name: string
}

const row = (id: string, updatedAt: number, name: string, deletedAt?: number): Row => ({
  id,
  updatedAt,
  name,
  deletedAt,
})

describe('mergeRecords', () => {
  it('keeps the newer record', () => {
    const merged = mergeRecords<Row>([row('a', 10, 'local')], [row('a', 20, 'remote')])
    expect(merged).toHaveLength(1)
    expect(merged[0].name).toBe('remote')
  })

  it('keeps the local record when it is newer', () => {
    const merged = mergeRecords<Row>([row('a', 30, 'local')], [row('a', 20, 'remote')])
    expect(merged[0].name).toBe('local')
  })

  it('adds records that only exist on one side', () => {
    const merged = mergeRecords<Row>([row('a', 10, 'a')], [row('b', 20, 'b')])
    expect(merged.map((item) => item.id).sort()).toEqual(['a', 'b'])
  })

  it('keeps tombstones from the newer side', () => {
    const merged = mergeRecords<Row>([row('a', 10, 'alive')], [row('a', 20, 'dead', 20)])
    expect(merged[0].deletedAt).toBe(20)
  })

  it('prefers a tombstone when timestamps are equal', () => {
    const merged = mergeRecords<Row>([row('a', 10, 'alive')], [row('a', 10, 'dead', 10)])
    expect(merged[0].deletedAt).toBe(10)
  })

  it('sorts by updatedAt descending', () => {
    const merged = mergeRecords<Row>([row('a', 10, 'a'), row('b', 30, 'b')], [])
    expect(merged.map((item) => item.id)).toEqual(['b', 'a'])
  })
})

describe('mergeLibrary', () => {
  it('merges notes by updatedAt', () => {
    const local = {
      version: 1,
      app: 'meme',
      exportedAt: 1,
      media: [],
      bookmarks: [],
      books: [],
      notes: [{ id: 'n1', title: 'old', content: '', tags: [], updatedAt: 10, createdAt: 1 }],
      readingSessions: [],
    } as LibraryBackup
    const remote = {
      ...local,
      exportedAt: 2,
      notes: [{ id: 'n1', title: 'new', content: '', tags: [], updatedAt: 20, createdAt: 1 }],
    } as LibraryBackup
    const merged = mergeLibrary(local, remote)
    expect(merged.notes).toHaveLength(1)
    expect(merged.notes[0].title).toBe('new')
  })

  it('merges each collection independently', () => {
    const local = {
      version: 1,
      app: 'meme',
      exportedAt: 1,
      media: [row('m1', 10, 'local')],
      bookmarks: [row('b1', 30, 'local')],
      books: [],
    } as unknown as LibraryBackup
    const remote = {
      version: 1,
      app: 'meme',
      exportedAt: 2,
      media: [row('m1', 20, 'remote')],
      bookmarks: [],
      books: [row('bk1', 5, 'remote')],
    } as unknown as LibraryBackup

    const merged = mergeLibrary(local, remote)
    expect((merged.media[0] as unknown as Row).name).toBe('remote')
    expect((merged.bookmarks[0] as unknown as Row).name).toBe('local')
    expect(merged.books).toHaveLength(1)
    expect(merged.exportedAt).toBe(2)
  })
})
