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

 // Coordinates strictly inside 70x24 box
 const path = isDeviation
 ? isPositive
 ? 'M 4,18 Q 20,20 38,12 T 66,6'
 : 'M 4,6 Q 20,4 38,12 T 66,18'
 : 'M 4,12 Q 20,10 38,14 T 66,12'

 return (
 <div className="relative h-6 w-16 overflow-hidden">
 <svg className="h-full w-full" viewBox="0 0 70 24">
 <path
 d={path}
 fill="none"
 stroke={color}
 strokeWidth="2.5"
 strokeLinecap="round"
 />
 <circle
 cx="65"
 cy={isDeviation ? (isPositive ? 6 : 18) : 12}
 r="3"
 fill={color}
 />
 </svg>
 </div>
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
 ? 'border-rose-300 shadow-[0_0_20px_rgba(239,68,68,0.08)]'
 : snapshot.status === 'warning'
 ? 'border-amber-300'
 : 'border-slate-200'

 return (
 <article
 className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-panel transition-all duration-300 hover:shadow-raised hover:-translate-y-0.5 ${borderAccent} ${
 emphasis ? 'lg:col-span-2 bg-gradient-to-br from-white to-sky-50/30' : ''
 }`}
 >
 {/* Top Header: Parameter Name & Status */}
 <div>
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0 pr-2">
 <h3 className="truncate text-xs font-bold uppercase tracking-wider text-slate-700">
 {snapshot.display_name}
 </h3>
 </div>
 <StatusPill status={snapshot.status} label={snapshot.status_label} />
 </div>

 {/* Current Reading & Mini Trend */}
 <div className="mt-3.5 flex items-baseline justify-between gap-2">
 <div className="flex items-baseline gap-1.5 min-w-0">
 <span
 className={`tabular font-mono font-bold tracking-tight ${style.text} ${
 emphasis ? 'text-4xl' : 'text-3xl'
 }`}
 >
 {formatNumber(snapshot.current_value, digits)}
 </span>
 {snapshot.unit && (
 <span className="text-xs font-semibold text-slate-400">
 {snapshot.unit}
 </span>
 )}
 </div>

 {/* Clean Sparkline */}
 <div className="flex flex-col items-end shrink-0">
 {renderSparkline(snapshot)}
 <div className="flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-400">
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
 </div>

 {/* Structured Stats Box (Target, Rentang, Deviasi) */}
 <div className="mt-4 space-y-3">
 <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-100">
 <div className="min-w-0">
 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target</p>
 <p className="tabular mt-0.5 truncate font-mono font-bold text-slate-800">
 {formatNumber(snapshot.target_value, digits)}
 </p>
 </div>
 <div className="min-w-0">
 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rentang</p>
 <p className="tabular mt-0.5 truncate font-mono font-bold text-slate-800" title={`${formatNumber(snapshot.minimum_value, digits)} – ${formatNumber(snapshot.maximum_value, digits)}`}>
 {formatNumber(snapshot.minimum_value, digits)}–{formatNumber(snapshot.maximum_value, digits)}
 </p>
 </div>
 <div className="min-w-0 text-right">
 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deviasi</p>
 <p
 className={`tabular mt-0.5 truncate font-mono font-bold ${
 snapshot.status === 'normal' ? 'text-slate-800' : style.text
 }`}
 >
 {formatSigned(snapshot.deviation, digits)}
 </p>
 </div>
 </div>

 {/* Operating Range Bar */}
 {position !== null && (
 <div aria-hidden="true" className="space-y-1">
 <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-100">
 <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-slate-200/80" />
 <div
 className={`absolute -top-0.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full shadow-sm ring-2 ring-white ${style.dot} transition-all duration-500`}
 style={{ left: `${position}%` }}
 />
 </div>
 <div className="flex justify-between font-mono text-[9px] font-medium text-slate-400">
 <span>Min: {formatNumber(snapshot.minimum_value, digits)}</span>
 <span>Maks: {formatNumber(snapshot.maximum_value, digits)}</span>
 </div>
 </div>
 )}
 </div>
 </article>
 )
}
