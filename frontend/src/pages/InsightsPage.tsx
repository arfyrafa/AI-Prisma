import { useState } from 'react'

import { InsightCard } from '../components/InsightCard'
import { Panel } from '../components/Panel'
import { AgentUnavailableState, EmptyState, ErrorState, LoadingState } from '../components/StateViews'
import { useAsync } from '../hooks/useAsync'
import { useProcessContext } from '../hooks/useProcessContext'
import { api, isAgentUnavailable } from '../services/api'

export function InsightsPage() {
  const { processId, health } = useProcessContext()
  const [running, setRunning] = useState(false)
  const [agentDown, setAgentDown] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const insights = useAsync(() => api.listInsights(processId, 30), [processId])

  const run = async () => {
    setRunning(true)
    setAgentDown(false)
    setRunError(null)
    try {
      await api.analyze(processId)
      await insights.reload(true)
    } catch (err) {
      if (isAgentUnavailable(err)) setAgentDown(true)
      else setRunError(err instanceof Error ? err.message : 'Analisis gagal dijalankan.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-5">
      <Panel
        eyebrow="AI Agent"
        title="Analisis kondisi proses"
        action={
          <button type="button" className="btn-primary" onClick={() => void run()} disabled={running}>
            {running ? 'Menganalisis…' : 'Jalankan analisis AI'}
          </button>
        }
      >
        <p className="text-sm text-ink-muted">
          Analisis dijalankan atas permintaan engineer. Agent membaca kondisi terkini, rentang
          operasi, tren terakhir, dan dokumen Knowledge Base terkait, lalu menyusun penjelasan
          beserta rekomendasi yang tetap memerlukan verifikasi engineer.
        </p>
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-xs">
          <div>
            <dt className="text-ink-faint">Provider agent</dt>
            <dd className="font-mono text-ink">{health?.agent_provider ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Status agent</dt>
            <dd className="font-medium text-ink">
              {health?.agent_available ? 'Tersedia' : 'Tidak tersedia'}
            </dd>
          </div>
        </dl>

        {agentDown && (
          <div className="mt-4">
            <AgentUnavailableState onRetry={() => void run()} />
          </div>
        )}
        {runError && (
          <div className="mt-4">
            <ErrorState title="Analisis gagal" description={runError} />
          </div>
        )}
      </Panel>

      <Panel eyebrow="Riwayat" title="Insight yang tersimpan" bodyClassName="space-y-4 p-4">
        {insights.loading && !insights.data ? (
          <LoadingState label="Memuat insight…" />
        ) : insights.error ? (
          <ErrorState title="Insight tidak dapat dimuat" description={insights.error} />
        ) : (insights.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="Belum ada insight"
            description="Jalankan analisis AI untuk menghasilkan penjelasan kondisi proses."
          />
        ) : (
          insights.data!.map((insight) => <InsightCard key={insight.id} insight={insight} />)
        )}
      </Panel>
    </div>
  )
}
