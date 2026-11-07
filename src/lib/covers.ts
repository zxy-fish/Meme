import { useEffect, useState } from 'react'
import { db } from './db'

const inflight = new Map<string, Promise<Blob | undefined>>()
const REMOTE = /^https?:\/\//i
const MAX_COVER_BYTES = 8 * 1024 * 1024

async function fetchCover(url: string): Promise<Blob | undefined> {
  const existing = inflight.get(url)
  if (existing) return existing
  const promise = fetch(url, { mode: 'cors', credentials: 'omit' })
    .then((response) => (response.ok ? response.blob() : undefined))
    .then((blob) => (blob && blob.size > 0 && blob.size <= MAX_COVER_BYTES ? blob : undefined))
    .catch(() => undefined)
    .finally(() => inflight.delete(url))
  inflight.set(url, promise)
  return promise
}

export function useCachedCover(src?: string): string | undefined {
  const [resolved, setResolved] = useState(src)

  useEffect(() => {
    setResolved(src)
    if (!src || !REMOTE.test(src)) return
    let cancelled = false
    let objectUrl: string | undefined

    void (async () => {
      try {
        const cached = await db.covers.get(src)
        let blob = cached?.blob
        if (!blob) {
          blob = await fetchCover(src)
          if (blob) await db.covers.put({ url: src, blob, updatedAt: Date.now() })
        }
        if (cancelled || !blob) return
        objectUrl = URL.createObjectURL(blob)
        setResolved(objectUrl)
      } catch {
        // CORS / offline / quota: keep the original URL as a fallback.
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  return resolved
}
