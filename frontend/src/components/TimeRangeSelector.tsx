import type { TimeRange } from '../types'

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1 jam' },
  { value: '6h', label: '6 jam' },
  { value: '24h', label: '24 jam' },
  { value: '7d', label: '7 hari' },
  { value: '30d', label: '1 bulan' },
]

interface Props {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

export function TimeRangeSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded border border-line bg-canvas p-0.5" role="group">
      {RANGES.map((range) => (
        <button
          key={range.value}
          type="button"
          onClick={() => onChange(range.value)}
          aria-pressed={value === range.value}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            value === range.value
              ? 'bg-surface text-ink shadow-panel'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
