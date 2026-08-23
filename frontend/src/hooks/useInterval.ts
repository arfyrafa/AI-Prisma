import { useEffect, useRef } from 'react'

/** setInterval that always calls the latest callback. Pass null to pause. */
export function useInterval(callback: () => void, delay: number | null) {
  const saved = useRef(callback)
  saved.current = callback

  useEffect(() => {
    if (delay === null) return
    const id = window.setInterval(() => saved.current(), delay)
    return () => window.clearInterval(id)
  }, [delay])
}
