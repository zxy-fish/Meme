import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ensureSeedData } from '@/lib/repo'
import { syncNow } from '@/lib/sync/github'
import { LibraryPage } from '@/pages/LibraryPage'
import { MediaDetailPage } from '@/pages/MediaDetailPage'
import { BookmarksPage } from '@/pages/BookmarksPage'
import { BooksPage } from '@/pages/BooksPage'
import { ReaderPage } from '@/pages/ReaderPage'
import { StatsPage } from '@/pages/StatsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useSettings } from '@/store/settings'

function useTheme() {
  const theme = useSettings((state) => state.theme)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme
      document.documentElement.dataset.theme = resolved
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', resolved === 'light' ? '#f5f2ea' : '#0b0c0f')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}

function useAutoSync(ready: boolean) {
  const sync = useSettings((state) => state.sync)

  useEffect(() => {
    if (!ready || !sync.enabled || !sync.token.trim()) return
    let active = true
    let running = false

    const run = async () => {
      if (!active || running || document.visibilityState === 'hidden') return
      running = true
      try {
        await syncNow(sync)
        window.dispatchEvent(new Event('meme:synced'))
      } catch (error) {
        console.warn('[meme] auto sync failed', error)
      } finally {
        running = false
      }
    }

    const first = window.setTimeout(run, 2500)
    const interval = window.setInterval(run, 5 * 60 * 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      active = false
      window.clearTimeout(first)
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ready, sync])
}

export default function App() {
  const [ready, setReady] = useState(false)
  useTheme()
  useAutoSync(ready)

  useEffect(() => {
    let mounted = true
    ensureSeedData()
      .catch((error) => console.warn('[meme] seed failed', error))
      .finally(() => {
        if (mounted) setReady(true)
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <Routes>
      <Route path="/read/:bookId" element={<ReaderPage />} />
      <Route element={<AppShell />}>
        <Route index element={<LibraryPage />} />
        <Route path="/item/:id" element={<MediaDetailPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<LibraryPage />} />
      </Route>
    </Routes>
  )
}
