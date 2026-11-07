import { describe, expect, it } from 'vitest'
import {
  dayBuckets,
  formatBreakdown,
  formatDuration,
  formatDurationShort,
  localDateKey,
  readingStreak,
  secondsSince,
  topBooks,
} from '../src/lib/reading-stats'
import type { ReadingSession } from '../src/lib/types'

function session(date: string, seconds: number, bookId = 'b1', format: ReadingSession['format'] = 'txt'): ReadingSession {
  return {
    id: `${date}-${bookId}-${seconds}`,
    bookId,
    title: bookId === 'b1' ? '夜航书店' : '示例漫画',
    format,
    date,
    seconds,
    startedAt: 0,
    endedAt: 0,
    updatedAt: 0,
  }
}

const now = new Date(2026, 10, 7, 12, 0, 0).getTime()

describe('reading time formatting', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0 分钟')
    expect(formatDuration(30)).toBe('不到 1 分钟')
    expect(formatDuration(600)).toBe('10 分钟')
    expect(formatDuration(3900)).toBe('1 小时 5 分')
    expect(formatDurationShort(0)).toBe('0 分')
    expect(formatDurationShort(600)).toBe('10 分')
    expect(formatDurationShort(5400)).toBe('1.5 小时')
  })
})

describe('reading aggregation', () => {
  it('builds local date keys', () => {
    expect(localDateKey(new Date(2026, 10, 7))).toBe('2026-11-07')
  })

  it('buckets the last N days including today', () => {
    const sessions = [
      session('2026-11-07', 600),
      session('2026-11-06', 300),
      session('2026-11-04', 120),
    ]
    const buckets = dayBuckets(sessions, 3, now)
    expect(buckets.map((bucket) => bucket.date)).toEqual(['2026-11-05', '2026-11-06', '2026-11-07'])
    expect(buckets.map((bucket) => bucket.seconds)).toEqual([0, 300, 600])
  })

  it('sums the last N days', () => {
    const sessions = [session('2026-11-07', 600), session('2026-11-06', 300), session('2026-10-20', 999)]
    expect(secondsSince(sessions, 7, now)).toBe(900)
    expect(secondsSince(sessions, 1, now)).toBe(600)
  })

  it('calculates a streak from today or yesterday', () => {
    expect(readingStreak([], now)).toBe(0)
    expect(
      readingStreak(
        [session('2026-11-07', 10), session('2026-11-06', 10), session('2026-11-05', 10)],
        now,
      ),
    ).toBe(3)
    expect(readingStreak([session('2026-11-06', 10), session('2026-11-05', 10)], now)).toBe(2)
  })

  it('breaks down by format and book', () => {
    const sessions = [
      session('2026-11-07', 600, 'b1', 'txt'),
      session('2026-11-06', 300, 'b2', 'comic'),
      session('2026-11-05', 400, 'b2', 'comic'),
    ]
    expect(formatBreakdown(sessions)).toEqual([
      { format: 'comic', seconds: 700 },
      { format: 'txt', seconds: 600 },
    ])
    expect(topBooks(sessions, 1)[0]).toMatchObject({ bookId: 'b2', seconds: 700 })
  })
})
