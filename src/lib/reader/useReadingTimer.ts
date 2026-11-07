import { useEffect } from 'react'
import { db } from '../db'
import { localDateKey } from '../reading-stats'
import type { Book } from '../types'
import { uuid } from '../utils'

/**
 * Counts only time while the page is visible. The current session is written
 * every 20 seconds and on unmount / page hide, so background tabs and closed
 * app windows don't inflate reading time.
 */
export function useReadingTimer(book?: Book) {
  useEffect(() => {
    if (!book) return

    const sessionId = uuid()
    const startedAt = Date.now()
    const date = localDateKey(new Date(startedAt))
    let seconds = 0
    let segmentStart: number | null =
      document.visibilityState === 'visible' ? performance.now() : null

    const takeSegment = () => {
      if (segmentStart === null) return
      seconds += (performance.now() - segmentStart) / 1000
      segmentStart = null
    }

    const startSegment = () => {
      if (segmentStart === null && document.visibilityState === 'visible') {
        segmentStart = performance.now()
      }
    }

    const save = () => {
      const total = Math.round(seconds)
      if (total < 5) return
      void db.readingSessions.put({
        id: sessionId,
        bookId: book.id,
        mediaId: book.mediaId,
        title: book.title,
        format: book.format,
        date,
        seconds: total,
        startedAt,
        endedAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    const flush = () => {
      takeSegment()
      save()
      startSegment()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        takeSegment()
        save()
      } else {
        startSegment()
      }
    }

    const onPageHide = () => {
      takeSegment()
      save()
    }

    const interval = window.setInterval(flush, 20_000)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      takeSegment()
      save()
    }
  }, [book?.id])
}
