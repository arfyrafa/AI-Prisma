import type { Alert } from '../types'
import {
  ALERT_STATUS_LABELS,
  SEVERITY_LABELS,
  SEVERITY_TO_STATUS,
  decimalsFor,
  formatDateTime,
  formatNumber,
  formatRelative,
} from '../utils/format'
import { StatusPill } from './StatusPill'

interface Props {
  alert: Alert
  onAcknowledge?: (alert: Alert) => void
  busy?: boolean
}

export function AlertItem({ alert, onAcknowledge, busy = false }: Props) {
  const status = SEVERITY_TO_STATUS[alert.severity]
  const digits = decimalsFor(alert.parameter_name)

  return (
    <li className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusPill status={status} label={SEVERITY_LABELS[alert.severity]} />
          <span className="text-micro font-semibold uppercase tracking-[0.1em] text-ink-faint">
            {ALERT_STATUS_LABELS[alert.status] ?? alert.status}
          </span>
        </div>
        <time className="text-xs text-ink-muted" dateTime={alert.created_at}>
          {formatRelative(alert.created_at)}
        </time>
      </div>

      <p className="mt-2 text-sm text-ink">{alert.message}</p>

      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-muted">
        <div className="flex gap-1">
          <dt>Aktual:</dt>
          <dd className="tabular font-mono text-ink">{formatNumber(alert.current_value, digits)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Batas:</dt>
          <dd className="tabular font-mono text-ink">
            {formatNumber(alert.expected_min, digits)}–{formatNumber(alert.expected_max, digits)}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>Dibuat:</dt>
          <dd>{formatDateTime(alert.created_at)}</dd>
        </div>
      </dl>

      {alert.acknowledged_by ? (
        <p className="mt-3 border-t border-line pt-2 text-xs text-ink-muted">
          Diakui oleh <span className="font-medium text-ink">{alert.acknowledged_by}</span> ·{' '}
          {formatDateTime(alert.acknowledged_at)}
        </p>
      ) : (
        onAcknowledge && (
          <button
            type="button"
            className="btn-secondary mt-3"
            disabled={busy}
            onClick={() => onAcknowledge(alert)}
          >
            {busy ? 'Menyimpan…' : 'Akui alert'}
          </button>
        )
      )}
    </li>
  )
}
