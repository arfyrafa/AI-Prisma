import { useState } from 'react'

import { Panel } from '../components/Panel'
import { RecommendationCard } from '../components/RecommendationCard'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews'
import { useAsync } from '../hooks/useAsync'
import { useProcessContext } from '../hooks/useProcessContext'
import { api } from '../services/api'
import type { Recommendation } from '../types'

const FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'pending', label: 'Menunggu verifikasi' },
  { value: 'verified', label: 'Diterima' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'needs_analysis', label: 'Perlu analisis lanjutan' },
]

export function RecommendationsPage() {
  const { processId } = useProcessContext()
  const [filter, setFilter] = useState('')

  const recommendations = useAsync(
    () => api.listRecommendations(processId, filter || undefined, 50),
    [processId, filter],
  )

  const verify = async (
    recommendation: Recommendation,
    payload: { decision: string; notes: string; reviewed: boolean },
  ) => {
    await api.verifyRecommendation(recommendation.id, {
      decision: payload.decision,
      notes: payload.notes,
      verified_by: 'engineer',
      reviewed: payload.reviewed,
    })
    await recommendations.reload(true)
  }

  return (
    <div className="space-y-5">
      <Panel
        eyebrow="Decision support"
        title="Rekomendasi AI"
        action={
          <div className="inline-flex flex-wrap gap-1.5">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={`rounded border px-2.5 py-1 text-xs font-medium ${
                  filter === option.value
                    ? 'border-brand bg-brand-wash text-brand'
                    : 'border-line bg-surface text-ink-muted hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      >
        <p className="text-sm text-ink-muted">
          Setiap rekomendasi bersifat advisory. Sistem mencatat keputusan engineer, dan tidak pernah
          mengubah parameter proses maupun mengendalikan peralatan.
        </p>
      </Panel>

      {recommendations.loading && !recommendations.data ? (
        <LoadingState label="Memuat rekomendasi…" />
      ) : recommendations.error ? (
        <ErrorState title="Rekomendasi tidak dapat dimuat" description={recommendations.error} />
      ) : (recommendations.data?.length ?? 0) === 0 ? (
        <Panel>
          <EmptyState
            title="Belum ada rekomendasi"
            description="Rekomendasi muncul setelah analisis AI dijalankan pada kondisi proses yang menyimpang."
          />
        </Panel>
      ) : (
        <div className="space-y-4">
          {recommendations.data!.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onVerify={verify}
            />
          ))}
        </div>
      )}
    </div>
  )
}
