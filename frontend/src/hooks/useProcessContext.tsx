import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api } from '../services/api'
import type { Alert, HealthResponse, LatestSnapshot } from '../types'
import { useInterval } from './useInterval'
import { useLiveProcess, type ConnectionMode } from './useLiveProcess'

interface ProcessContextValue {
  processId: number
  snapshot: LatestSnapshot | null
  health: HealthResponse | null
  loading: boolean
  error: string | null
  mode: ConnectionMode
  lastEventAt: Date | null
  recentAlerts: Alert[]
  refresh: () => Promise<void>
}

const ProcessContext = createContext<ProcessContextValue | null>(null)

const HEALTH_INTERVAL_MS = 30000

/** One live connection for the whole app, shared through context. */
export function ProcessProvider({ processId = 1, children }: { processId?: number; children: ReactNode }) {
  const live = useLiveProcess(processId)
  const [health, setHealth] = useState<HealthResponse | null>(null)

  const loadHealth = () => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth(null))
  }

  useEffect(loadHealth, [])
  useInterval(loadHealth, HEALTH_INTERVAL_MS)

  const value = useMemo<ProcessContextValue>(
    () => ({ processId, health, ...live }),
    [processId, health, live],
  )

  return <ProcessContext.Provider value={value}>{children}</ProcessContext.Provider>
}

export function useProcessContext(): ProcessContextValue {
  const context = useContext(ProcessContext)
  if (!context) {
    throw new Error('useProcessContext harus dipakai di dalam ProcessProvider.')
  }
  return context
}
