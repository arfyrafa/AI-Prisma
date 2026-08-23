import type { Deviation } from '../types'
import { SEVERITY_TO_STATUS, decimalsFor, formatNumber, formatRelative } from '../utils/format'
import { StatusPill } from './StatusPill'

interface Props {
  deviations: Deviation[]
}

export function DeviationPanel({ deviations }: Props) {
  if (deviations.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-sm" aria-hidden="true">
          ✓
        </span>
        <p className="text-sm font-medium text-slate-700">
          Tidak ada penyimpangan. Seluruh parameter berada dalam rentang operasi.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {deviations.map((deviation) => {
        const status = SEVERITY_TO_STATUS[deviation.severity]
        const digits = decimalsFor(deviation.parameter_name)
        const unit = deviation.unit ? ` ${deviation.unit}` : ''
        return (
          <li
            key={deviation.parameter_name}
            className={`rounded-xl border px-4 py-3.5 transition-all duration-200 ${
              status === 'critical'
                ? 'border-rose-200 bg-rose-50/50 hover:border-rose-300'
                : 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <StatusPill status={status} />
                <span className="text-sm font-bold text-slate-800">{deviation.display_name}</span>
              </div>
              <span className="text-xs font-medium text-slate-500">{formatRelative(deviation.detected_at)}</span>
            </div>
            <p className="mt-2.5 text-sm text-slate-700 leading-relaxed">{deviation.message}</p>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
              <div className="flex gap-1.5">
                <dt className="font-semibold text-slate-400">Aktual:</dt>
                <dd className="tabular font-mono font-semibold text-slate-700">
                  {formatNumber(deviation.current_value, digits)}
                  {unit}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="font-semibold text-slate-400">Rentang:</dt>
                <dd className="tabular font-mono font-semibold text-slate-700">
                  {formatNumber(deviation.expected_min, digits)}–
                  {formatNumber(deviation.expected_max, digits)}
                  {unit}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="font-semibold text-slate-400">Selisih:</dt>
                <dd className="tabular font-mono font-semibold text-slate-700">
                  {formatNumber(deviation.deviation, digits)}
                  {unit}
                </dd>
              </div>
            </dl>
          </li>
        )
      })}
    </ul>
  )
}
