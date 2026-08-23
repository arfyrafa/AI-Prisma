import { useState } from 'react'

import type { Recommendation } from '../types'
import { RECOMMENDATION_STATUS_LABELS, formatDateTime } from '../utils/format'

interface Props {
  recommendation: Recommendation
  onVerify?: (
    recommendation: Recommendation,
    payload: { decision: string; notes: string; reviewed: boolean },
  ) => Promise<void>
}

const DECISIONS = [
  { value: 'accept', label: 'Terima' },
  { value: 'reject', label: 'Tolak' },
  { value: 'needs_analysis', label: 'Perlu analisis lanjutan' },
]

export function RecommendationCard({ recommendation, onVerify }: Props) {
  const [open, setOpen] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [decision, setDecision] = useState('accept')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const latestVerification = recommendation.verifications?.[recommendation.verifications.length - 1]
  const isPending = recommendation.status === 'pending'

  const submit = async () => {
    if (!onVerify) return
    setBusy(true)
    setError(null)
    try {
      await onVerify(recommendation, { decision, notes, reviewed })
      setOpen(false)
      setNotes('')
      setReviewed(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifikasi gagal disimpan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow text-brand">Rekomendasi</p>
          <h3 className="text-sm font-semibold text-ink">{recommendation.recommendation}</h3>
        </div>
        <span
          className={`text-micro font-semibold uppercase tracking-[0.1em] ${
            isPending ? 'text-state-warning' : 'text-ink-muted'
          }`}
        >
          {RECOMMENDATION_STATUS_LABELS[recommendation.status] ?? recommendation.status}
        </span>
      </header>

      <div className="space-y-3 px-4 py-3 text-sm">
        {recommendation.reason && (
          <div>
            <p className="eyebrow">Alasan</p>
            <p className="mt-1 whitespace-pre-line text-ink-muted">{recommendation.reason}</p>
          </div>
        )}
        {recommendation.suggested_action && (
          <div>
            <p className="eyebrow">Tindakan yang disarankan</p>
            <p className="mt-1 whitespace-pre-line text-ink-muted">{recommendation.suggested_action}</p>
          </div>
        )}

        <p className="flex items-center gap-2 rounded border border-state-warning/35 bg-state-warningWash px-3 py-2 text-xs text-ink">
          <span aria-hidden="true">▲</span>
          Rekomendasi bersifat saran. Verifikasi engineer diperlukan; sistem tidak mengubah
          parameter proses secara otomatis.
        </p>

        <p className="text-xs text-ink-faint">
          Sumber: {recommendation.source} · {formatDateTime(recommendation.created_at)}
        </p>

        {latestVerification && (
          <div className="rounded border border-line bg-canvas px-3 py-2 text-xs text-ink-muted">
            <p className="font-semibold text-ink">Keputusan engineer</p>
            <p className="mt-1">
              {RECOMMENDATION_STATUS_LABELS[recommendation.status] ?? latestVerification.decision} ·{' '}
              {latestVerification.verified_by} · {formatDateTime(latestVerification.verified_at)}
            </p>
            {latestVerification.notes && <p className="mt-1">Catatan: {latestVerification.notes}</p>}
          </div>
        )}

        {onVerify && isPending && (
          <div className="border-t border-line pt-3">
            {!open ? (
              <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
                Verifikasi rekomendasi
              </button>
            ) : (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(event) => setReviewed(event.target.checked)}
                    className="h-4 w-4 rounded border-line"
                  />
                  Saya sudah meninjau detail rekomendasi ini
                </label>

                <fieldset>
                  <legend className="eyebrow">Keputusan</legend>
                  <div className="mt-1.5 flex flex-wrap gap-4">
                    {DECISIONS.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 text-sm text-ink">
                        <input
                          type="radio"
                          name={`decision-${recommendation.id}`}
                          value={option.value}
                          checked={decision === option.value}
                          onChange={(event) => setDecision(event.target.value)}
                          className="h-4 w-4"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor={`notes-${recommendation.id}`} className="eyebrow">
                    Catatan
                  </label>
                  <textarea
                    id={`notes-${recommendation.id}`}
                    className="field mt-1.5 h-20 resize-y"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Contoh: dosis SO₂ sudah dicek terhadap set point pukul 10:35."
                  />
                </div>

                {error && <p className="text-sm text-state-critical">{error}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void submit()}
                    disabled={busy || !reviewed}
                  >
                    {busy ? 'Menyimpan…' : 'Simpan verifikasi'}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                    Batal
                  </button>
                </div>
                {!reviewed && (
                  <p className="text-xs text-ink-faint">
                    Tandai peninjauan terlebih dahulu untuk mengaktifkan tombol simpan.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
