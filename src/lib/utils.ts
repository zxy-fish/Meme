import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** i
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function normalizeUrl(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

export function formatDate(ts?: number): string {
  if (!ts) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(ts)
}

export function relativeTime(ts?: number): string {
  if (!ts) return '从未'
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  return formatDate(ts)
}

const COVER_GRADIENTS = [
  ['#1d2433', '#5b6f96'],
  ['#2a1518', '#7d3d42'],
  ['#1a241d', '#5c765c'],
  ['#241a12', '#8a6236'],
  ['#171a2a', '#535f9c'],
  ['#2b1a24', '#8c5570'],
  ['#122226', '#3f7472'],
  ['#241a10', '#9a6a2f'],
]

export function gradientFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  const pair = COVER_GRADIENTS[hash % COVER_GRADIENTS.length]
  return `linear-gradient(150deg, ${pair[0]}, ${pair[1]})`
}

export function initials(title: string): string {
  return title.trim().slice(0, 2) || '·'
}

export function percentOf(current: number, total?: number): number {
  if (!total || total <= 0) return 0
  return clamp(Math.round((current / total) * 100), 0, 100)
}

export function groupTags(tags: string[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const tag of tags) {
    const clean = tag.trim()
    if (!clean) continue
    counts.set(clean, (counts.get(clean) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'))
}

export function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,，、\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ]
}

export function debounce<T extends (...args: never[]) => void>(fn: T, wait = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}
