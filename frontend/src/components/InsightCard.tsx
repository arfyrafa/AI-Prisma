import type { Insight } from '../types'
import { formatDateTime } from '../utils/format'

interface Props {
  insight: Insight
  compact?: boolean
}

export function InsightCard({ insight, compact = false }: Props) {
  return (
    <article className="rounded border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <p className="eyebrow text-brand">Insight AI</p>
        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <span>Sumber: {insight.source}</span>
          <time dateTime={insight.timestamp}>{formatDateTime(insight.timestamp)}</time>
        </div>
      </header>

      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-ink">{insight.summary}</p>
        {!compact && insight.details && (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
            {insight.details}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {insight.related_parameters?.map((parameter) => (
            <span
              key={parameter}
              className="rounded border border-line bg-canvas px-2 py-0.5 font-mono text-[11px] text-ink-muted"
            >
              {parameter}
            </span>
          ))}
          {/* Confidence appears only when the model actually reports one. */}
          {insight.confidence !== null && insight.confidence !== undefined && (
            <span className="rounded border border-brand/30 bg-brand-wash px-2 py-0.5 text-[11px] font-medium text-brand">
              Confidence {(insight.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
