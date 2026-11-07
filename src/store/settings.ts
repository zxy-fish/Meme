import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReaderPrefs, SyncConfig } from '@/lib/types'

export type Theme = 'dark' | 'light' | 'system'

interface SettingsState {
  theme: Theme
  reader: ReaderPrefs
  tmdbKey: string
  sync: SyncConfig
  setTheme: (theme: Theme) => void
  setReader: (patch: Partial<ReaderPrefs>) => void
  setTmdbKey: (key: string) => void
  setSync: (patch: Partial<SyncConfig>) => void
}

export const DEFAULT_SYNC: SyncConfig = {
  enabled: false,
  owner: 'zxy-fish',
  repo: 'meme-data',
  branch: 'main',
  path: 'data/library.json',
  token: '',
}

export const DEFAULT_READER: ReaderPrefs = {
  theme: 'sepia',
  font: 'song',
  size: 19,
  leading: 1.9,
  margin: 56,
  pageMode: 'page',
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      reader: DEFAULT_READER,
      tmdbKey: '',
      sync: DEFAULT_SYNC,
      setTheme: (theme) => set({ theme }),
      setReader: (patch) => set((state) => ({ reader: { ...state.reader, ...patch } })),
      setTmdbKey: (tmdbKey) => set({ tmdbKey }),
      setSync: (patch) => set((state) => ({ sync: { ...state.sync, ...patch } })),
    }),
    {
      name: 'meme-settings',
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        reader: state.reader,
        tmdbKey: state.tmdbKey,
        sync: state.sync,
      }),
    },
  ),
)
