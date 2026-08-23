import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { ParameterSnapshot } from '../types'
import { STATUS_STYLES, decimalsFor, formatNumber, formatSigned } from '../utils/format'
import { StatusPill } from './StatusPill'

interface Props {
  snapshot: ParameterSnapshot
  emphasis?: boolean
}

/** Position of the current value inside the configured operating range (0–100%). */
function rangePosition(snapshot: ParameterSnapshot): number | null {
  const { current_value: current, minimum_value: min, maximum_value: max } = snapshot
  if (current === null || min === null || max === null || max <= min) return null
  return Math.min(100, Math.max(0, ((current - min) / (max - min)) * 100))
}

/** Generate a subtle animated SVG mini sparkline path based on deviation */
function renderSparkline(snapshot: ParameterSnapshot) {
  const isDeviation = snapshot.deviation !== null && Math.abs(snapshot.deviation) > 0.001
  const isPositive = (snapshot.deviation ?? 0) > 0
  const color =
    snapshot.status === 'critical'
      ? '#ef4444'
      : snapshot.status === 'warning'
        ? '#f59e0b'
        : '#10b981'

  // Generate gentle stylized wave coords
  const path = isDeviation
    ? isPositive
      ? 'M 0,22 Q 20,24 40,16 T 80,8'
      : 'M 0,8 Q 20,6 40,14 T 80,22'
    : 'M 0,15 Q 20,13 40,16 T 80,15'

  return (
    <svg className="h-7 w-20 overflow-visible opacity-80 transition-opacity group-hover:opacity-100" viewBox="0 0 80 30">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle
        cx="80"
        cy={isDeviation ? (isPositive ? 8 : 22) : 15}
        r="3.5"
        fill={color}
        className="animate-pulse"
      />
    </svg>
  )
}

export function KpiCard({ snapshot, emphasis = false }: Props) {
  const style = STATUS_STYLES[snapshot.status]
  const digits = decimalsFor(snapshot.parameter_name)
  const position = rangePosition(snapshot)
  const isUp = (snapshot.deviation ?? 0) > 0.001
  const isDown = (snapshot.deviation ?? 0) < -0.001

  const borderAccent =
    snapshot.status === 'critical'
      ? 'border-rose-300/80 dark:border-rose-900/60 shadow-[0_0_20px_rgba(239,68,68,0.08)]'
      : snapshot.status === 'warning'
        ? 'border-amber-200/80 dark:border-amber-900/50'
        : 'border-slate-200/80 dark:border-slate-800'

  return (
    <article
      className={`group rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-panel transition-all duration-300 hover:shadow-raised hover:-translate-y-0.5 ${borderAccent} ${
        emphasis ? 'lg:col-span-2' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            {snapshot.display_name}
          </p>
          {snapshot.unit && (
            <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">{snapshot.unit}</p>
          )}
        </div>
        <StatusPill status={snapshot.status} label={snapshot.status_label} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span
            className={`tabular font-mono font-bold tracking-tight ${style.text} ${
              emphasis ? 'text-4xl' : 'text-3xl'
            }`}
          >
            {formatNumber(snapshot.current_value, digits)}
          </span>
          {snapshot.unit && (
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">{snapshot.unit}</span>
          )}
        </div>

        {/* Mini Sparkline Visualization */}
        <div className="flex flex-col items-end">
          {renderSparkline(snapshot)}
          <div className="mt-0.5 flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500">
            {isUp ? (
              <TrendingUp className="h-3 w-3 text-amber-500" />
            ) : isDown ? (
              <TrendingDown className="h-3 w-3 text-sky-500" />
            ) : (
              <Minus className="h-3 w-3 text-emerald-500" />
            )}
            <span>Trend</span>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 px-3 py-2.5 text-xs border border-slate-100 dark:border-slate-800">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Target</dt>
          <dd className="tabular mt-0.5 font-mono font-semibold text-slate-700 dark:text-slate-200">
            {formatNumber(snapshot.target_value, digits)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Rentang</dt>
          <dd className="tabular mt-0.5 font-mono font-semibold text-slate-700 dark:text-slate-200">
            {formatNumber(snapshot.minimum_value, digits)}–{formatNumber(snapshot.maximum_value, digits)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Deviasi</dt>
          <dd
            className={`tabular mt-0.5 font-mono font-semibold ${
              snapshot.status === 'normal' ? 'text-slate-700 dark:text-slate-200' : style.text
            }`}
          >
            {formatSigned(snapshot.deviation, digits)}
          </dd>
        </div>
      </dl>

      {position !== null && (
        <div className="mt-4" aria-hidden="true">
          <div className="relative h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-slate-200/70 dark:bg-slate-700/50" />
            <div
              className={`absolute -top-0.5 h-3 w-3 -translate-x-1/2 rounded-full shadow-md ring-2 ring-white dark:ring-slate-900 ${style.dot} transition-all duration-500`}
              style={{ left: `${position}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>min ({formatNumber(snapshot.minimum_value, digits)})</span>
            <span>maks ({formatNumber(snapshot.maximum_value, digits)})</span>
          </div>
        </div>
      )}
    </article>
  )
}
