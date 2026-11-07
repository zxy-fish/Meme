import type { Character, ExternalIds, MediaType, Person, ProgressUnit } from '../types'

export type ProviderId = 'bangumi' | 'anilist' | 'tmdb'

export interface MetaSearchResult {
  provider: ProviderId
  id: string
  title: string
  originalTitle?: string
  subtitle?: string
  cover?: string
  year?: number
  score?: number
  type: MediaType
}

export interface MetaDraft {
  title: string
  originalTitle?: string
  cover?: string
  year?: number
  synopsis?: string
  tags: string[]
  genres: string[]
  studios: string[]
  characters: Character[]
  cast: Person[]
  total?: number
  unit: ProgressUnit
  sourceUrl?: string
  externalIds?: ExternalIds
  score?: number
}

export interface ProviderOptions {
  tmdbKey?: string
  signal?: AbortSignal
}

export class MetadataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MetadataError'
  }
}

export function providerLabel(id: ProviderId): string {
  return id === 'bangumi' ? 'Bangumi' : id === 'anilist' ? 'AniList' : 'TMDB'
}

export function unitFor(type: MediaType): ProgressUnit {
  if (type === 'anime' || type === 'tv') return 'ep'
  if (type === 'movie') return 'page'
  if (type === 'novel') return 'volume'
  return 'chapter'
}
