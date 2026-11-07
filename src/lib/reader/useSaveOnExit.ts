import { useEffect, useRef } from 'react'

/**
 * Flush the latest reading position when the reader is unmounted, the tab is
 * hidden, or the page is being closed. The callback is kept in a ref so the
 * listeners always see the current page / percent.
 */
export function useSaveOnExit(save: () => void) {
  const saveRef = useRef(save)
  saveRef.current = save

  useEffect(() => {
    const flush = () => saveRef.current()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])
}
