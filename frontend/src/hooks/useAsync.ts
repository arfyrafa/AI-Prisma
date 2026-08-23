import { useCallback, useEffect, useRef, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/** Runs an async loader on mount and exposes a manual reload. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })
  const mounted = useRef(true)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback(async (silent = false) => {
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await loaderRef.current()
      if (mounted.current) setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan.'
      if (mounted.current) setState((prev) => ({ data: prev.data, loading: false, error: message }))
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, reload: run, setData: (data: T) => setState({ data, loading: false, error: null }) }
}
