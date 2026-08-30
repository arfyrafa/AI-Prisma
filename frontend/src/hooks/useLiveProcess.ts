import { useCallback, useEffect, useRef, useState } from 'react'

import { api, websocketUrl } from '../services/api'
import type { Alert, LatestSnapshot, ReadingEventPayload } from '../types'

export type ConnectionMode = 'websocket' | 'polling' | 'offline'

interface LiveProcessState {
  snapshot: LatestSnapshot | null
  loading: boolean
  error: string | null
  mode: ConnectionMode
  lastEventAt: Date | null
  recentAlerts: Alert[]
  refresh: () => Promise<void>
}

const POLL_INTERVAL_MS = 15000
const RECONNECT_DELAY_MS = 10000
const MAX_RECONNECT_ATTEMPTS = 5

/**
 * Keeps one process snapshot current.
 *
 * Preferred path is the WebSocket stream. If the socket cannot be opened (or
 * drops), the hook silently falls back to polling so the dashboard keeps
 * working — the UI shows which mode is active.
 */
export function useLiveProcess(processId: number): LiveProcessState {
  const [snapshot, setSnapshot] = useState<LatestSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<ConnectionMode>('polling')
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null)
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])

  const socketRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<number | null>(null)
  const pollRef = useRef<number | null>(null)
  const activeRef = useRef(true)
  const reconnectAttemptsRef = useRef(0)

  const refresh = useCallback(async () => {
    try {
      const data = await api.getLatest(processId)
      if (!activeRef.current) return
      setSnapshot(data)
      setError(null)
      setLastEventAt(new Date())
    } catch (err) {
      if (!activeRef.current) return
      setError(err instanceof Error ? err.message : 'Tidak dapat mengambil data proses.')
      setMode('offline')
    } finally {
      if (activeRef.current) setLoading(false)
    }
  }, [processId])

  // Polling loop — active whenever the socket is not connected.
  useEffect(() => {
    const shouldPoll = mode !== 'websocket'
    if (!shouldPoll) {
      if (pollRef.current) window.clearInterval(pollRef.current)
      pollRef.current = null
      return
    }
    pollRef.current = window.setInterval(() => void refresh(), POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [mode, refresh])

  useEffect(() => {
    activeRef.current = true
    void refresh()

    const connect = () => {
      if (!activeRef.current) return
      let socket: WebSocket
      try {
        socket = new WebSocket(websocketUrl())
      } catch {
        setMode('polling')
        return
      }
      socketRef.current = socket

      socket.onopen = () => {
        if (!activeRef.current) return
        setMode('websocket')
        reconnectAttemptsRef.current = 0
        socket.send('ping')
      }

      socket.onmessage = (event) => {
        if (!activeRef.current) return
        try {
          const message = JSON.parse(event.data) as { event: string; payload: unknown }
          if (message.event === 'reading') {
            const payload = message.payload as ReadingEventPayload
            setLastEventAt(new Date())
            // The snapshot carries evaluated status for every parameter, so we
            // re-read it from the API rather than recomputing status here.
            void refresh()
            if (payload.alerts?.length) {
              setRecentAlerts((prev) => [...payload.alerts, ...prev].slice(0, 20))
            }
          } else if (message.event === 'alert') {
            setRecentAlerts((prev) => [message.payload as Alert, ...prev].slice(0, 20))
          }
        } catch {
          /* ignore malformed frames */
        }
      }

      socket.onclose = () => {
        socketRef.current = null
        if (!activeRef.current) return
        setMode('polling')
        reconnectAttemptsRef.current += 1
        if (reconnectAttemptsRef.current <= MAX_RECONNECT_ATTEMPTS) {
          reconnectRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }

      socket.onerror = () => socket.close()
    }

    connect()

    return () => {
      activeRef.current = false
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current)
      const socket = socketRef.current
      socketRef.current = null
      if (socket) {
        socket.onclose = null
        socket.close()
      }
    }
  }, [processId, refresh])

  return { snapshot, loading, error, mode, lastEventAt, recentAlerts, refresh }
}
