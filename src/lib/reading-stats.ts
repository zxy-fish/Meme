import type { BookFormat, ReadingSession } from './types'

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  if (total === 0) return '0 分钟'
  if (total < 60) return '不到 1 分钟'
  const minutes = Math.round(total / 60)
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`
}

export interface DayBucket {
  date: string
  label: string
  seconds: number
}

export function dayBuckets(
  sessions: ReadingSession[],
  days: number,
  now = Date.now(),
): DayBucket[] {
  const totals = new Map<string, number>()
  for (const session of sessions) {
    totals.set(session.date, (totals.get(session.date) ?? 0) + session.seconds)
  }
  const today = new Date(now)
  const buckets: DayBucket[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    const key = localDateKey(date)
    buckets.push({
      date: key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      seconds: totals.get(key) ?? 0,
    })
  }
  return buckets
}

export function secondsSince(sessions: ReadingSession[], days: number, now = Date.now()): number {
  const threshold = new Date(now)
  threshold.setDate(threshold.getDate() - (days - 1))
  const from = localDateKey(threshold)
  return sessions
    .filter((session) => session.date >= from)
    .reduce((sum, session) => sum + session.seconds, 0)
}

export function readingStreak(sessions: ReadingSession[], now = Date.now()): number {
  const dates = new Set(sessions.filter((session) => session.seconds > 0).map((session) => session.date))
  const cursor = new Date(now)
  if (!dates.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!dates.has(localDateKey(cursor))) return 0
  }
  let streak = 0
  while (dates.has(localDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function formatBreakdown(sessions: ReadingSession[]): { format: BookFormat; seconds: number }[] {
  const map = new Map<BookFormat, number>()
  for (const session of sessions) {
    map.set(session.format, (map.get(session.format) ?? 0) + session.seconds)
  }
  return [...map.entries()]
    .map(([format, seconds]) => ({ format, seconds }))
    .sort((a, b) => b.seconds - a.seconds)
}

export function topBooks(
  sessions: ReadingSession[],
  limit = 5,
): { bookId: string; title: string; format: BookFormat; seconds: number }[] {
  const map = new Map<string, { bookId: string; title: string; format: BookFormat; seconds: number }>()
  for (const session of sessions) {
    const current = map.get(session.bookId)
    if (current) {
      current.seconds += session.seconds
    } else {
      map.set(session.bookId, {
        bookId: session.bookId,
        title: session.title,
        format: session.format,
        seconds: session.seconds,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.seconds - a.seconds).slice(0, limit)
}

export function formatDurationShort(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  if (total === 0) return '0 分'
  if (total < 60) return '不到 1 分'
  const minutes = Math.round(total / 60)
  if (minutes < 60) return `${minutes} 分`
  const hours = minutes / 60
  return `${hours.toFixed(1).replace(/\.0$/, '')} 小时`
}
