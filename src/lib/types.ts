export type MediaType = 'anime' | 'tv' | 'movie' | 'novel' | 'manga'

export type MediaStatus = 'wish' | 'doing' | 'done' | 'onhold' | 'dropped'

export type ProgressUnit = 'ep' | 'chapter' | 'page' | 'volume'

export interface ExternalIds {
  bangumi?: number
  anilist?: number
  tmdb?: number
  douban?: string
  mal?: number
}

export interface Character {
  name: string
  role: 'main' | 'supporting'
  cv?: string
  avatar?: string
}

export interface Person {
  name: string
  role?: string
  character?: string
  avatar?: string
}

export interface MediaItem {
  id: string
  type: MediaType
  title: string
  originalTitle?: string
  cover?: string
  year?: number
  /** ISO 3166-1 alpha-2, e.g. JP / CN / US. */
  country?: string
  status: MediaStatus
  rating?: number
  favorite?: boolean
  progressCurrent: number
  progressTotal?: number
  progressUnit: ProgressUnit
  startDate?: string
  endDate?: string
  tags: string[]
  genres: string[]
  studios: string[]
  cast: Person[]
  characters: Character[]
  synopsis?: string
  sourceUrl?: string
  externalIds?: ExternalIds
  notes?: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
}

export interface Bookmark {
  id: string
  url: string
  title: string
  description?: string
  favicon?: string
  tags: string[]
  createdAt: number
  updatedAt: number
  deletedAt?: number
}

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  pinned?: boolean
  createdAt: number
  updatedAt: number
  deletedAt?: number
}

export type BookFormat = 'txt' | 'epub' | 'pdf' | 'comic'

export interface ReadingMark {
  id: string
  chapter: number
  page: number
  percent: number
  label?: string
  createdAt: number
}

export interface Book {
  id: string
  title: string
  author?: string
  format: BookFormat
  mediaId?: string
  pageCount?: number
  comicDirection?: 'rtl' | 'ltr'
  fileName: string
  fileSize: number
  encoding?: string
  chapterCount: number
  cover?: string
  lastChapter?: number
  lastPage?: number
  lastOffset?: number
  percent?: number
  lastReadAt?: number
  marks?: ReadingMark[]
  tags: string[]
  createdAt: number
  updatedAt: number
  deletedAt?: number
}

export interface Chapter {
  title: string
  start: number
  end: number
}

export interface BookContent {
  id: string
  text: string
  chapters: Chapter[]
  blob?: Blob
  mime?: string
}

export interface ComicPage {
  id: string
  bookId: string
  index: number
  blob: Blob
  mime: string
}

export interface LibraryBackup {
  version: 1
  app: 'meme'
  exportedAt: number
  media: MediaItem[]
  bookmarks: Bookmark[]
  books: Book[]
  notes: Note[]
}

export interface SyncConfig {
  enabled: boolean
  owner: string
  repo: string
  branch: string
  path: string
  token: string
}

export type SyncPhase = 'idle' | 'pulling' | 'merging' | 'pushing' | 'done' | 'error'

export interface SyncStatus {
  phase: SyncPhase
  message?: string
  lastSyncAt?: number
}

export interface ReaderPrefs {
  theme: 'sepia' | 'dark' | 'white' | 'green'
  font: 'song' | 'hei' | 'kai'
  size: number
  leading: number
  margin: number
  pageMode: 'page' | 'scroll'
}

export const MEDIA_TYPES: { value: MediaType; label: string; plural: string }[] = [
  { value: 'anime', label: '番剧', plural: '番剧' },
  { value: 'tv', label: '电视剧', plural: '电视剧' },
  { value: 'movie', label: '电影', plural: '电影' },
  { value: 'novel', label: '小说', plural: '小说' },
  { value: 'manga', label: '漫画', plural: '漫画' },
]

export const STATUS_LABELS: Record<MediaStatus, string> = {
  wish: '想看',
  doing: '在看',
  done: '看过',
  onhold: '搁置',
  dropped: '弃坑',
}

export const STATUS_ORDER: MediaStatus[] = ['doing', 'wish', 'done', 'onhold', 'dropped']

export const TYPE_LABELS: Record<MediaType, string> = {
  anime: '番剧',
  tv: '电视剧',
  movie: '电影',
  novel: '小说',
  manga: '漫画',
}

export const UNIT_LABELS: Record<ProgressUnit, string> = {
  ep: '集',
  chapter: '话',
  page: '页',
  volume: '卷',
}

export function emptyMedia(type: MediaType = 'anime'): Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type,
    title: '',
    status: 'wish',
    progressCurrent: 0,
    progressUnit: type === 'novel' ? 'chapter' : type === 'movie' ? 'page' : 'ep',
    tags: [],
    genres: [],
    studios: [],
    cast: [],
    characters: [],
  }
}
