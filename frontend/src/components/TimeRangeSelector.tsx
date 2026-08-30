import type { TimeRange } from '../types'

const RANGES: { value: TimeRange; label: string; shortLabel?: string }[] = [
  { value: '1h', label: '1 jam', shortLabel: '1j' },
  { value: '6h', label: '6 jam', shortLabel: '6j' },
  { value: '24h', label: '24 jam', shortLabel: '24j' },
  { value: '7d', label: '7 hari', shortLabel: '7h' },
  { value: '30d', label: '1 bulan', shortLabel: '1 bln' },
  { value: '3m', label: '3 bulan', shortLabel: '3 bln' },
  { value: 'all', label: 'Semua Data', shortLabel: 'Semua' },
]

interface Props {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

export function TimeRangeSelector({ value, onChange }: Props) {
  return (
    <div className="flex max-w-full items-center overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-inner scrollbar-none" role="group">
      <div className="flex items-center gap-1 shrink-0">
        {RANGES.map((range) => {
          const isActive = value === range.value
          return (
            <button
              key={range.value}
              type="button"
              onClick={() => onChange(range.value)}
              aria-pressed={isActive}
              className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-150 ${
                isActive
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              <span className="hidden sm:inline">{range.label}</span>
              <span className="sm:hidden">{range.shortLabel || range.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
