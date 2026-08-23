import type { ParameterSnapshot } from '../types'
import { decimalsFor, formatClock, formatNumber, formatSigned } from '../utils/format'
import { StatusPill } from './StatusPill'

interface Props {
  parameters: ParameterSnapshot[]
  onSelect?: (parameterName: string) => void
  selected?: string
}

export function ParameterTable({ parameters, onSelect, selected }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="table-head px-4 py-2.5">Parameter</th>
            <th className="table-head px-4 py-2.5 text-right">Aktual</th>
            <th className="table-head px-4 py-2.5 text-right">Target</th>
            <th className="table-head px-4 py-2.5 text-right">Minimum</th>
            <th className="table-head px-4 py-2.5 text-right">Maksimum</th>
            <th className="table-head px-4 py-2.5 text-right">Deviasi</th>
            <th className="table-head px-4 py-2.5">Status</th>
            <th className="table-head px-4 py-2.5">Diperbarui</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((parameter) => {
            const digits = decimalsFor(parameter.parameter_name)
            const isSelected = selected === parameter.parameter_name
            return (
              <tr
                key={parameter.parameter_name}
                onClick={() => onSelect?.(parameter.parameter_name)}
                className={`border-b border-line/70 last:border-0 ${
                  onSelect ? 'cursor-pointer hover:bg-canvas' : ''
                } ${isSelected ? 'bg-brand-wash' : ''}`}
              >
                <td className="px-4 py-2.5">
                  <span className="font-medium text-ink">{parameter.display_name}</span>
                  {parameter.unit && (
                    <span className="ml-1.5 text-xs text-ink-faint">({parameter.unit})</span>
                  )}
                </td>
                <td className="tabular px-4 py-2.5 text-right font-mono font-semibold text-ink">
                  {formatNumber(parameter.current_value, digits)}
                </td>
                <td className="tabular px-4 py-2.5 text-right font-mono text-ink-muted">
                  {formatNumber(parameter.target_value, digits)}
                </td>
                <td className="tabular px-4 py-2.5 text-right font-mono text-ink-muted">
                  {formatNumber(parameter.minimum_value, digits)}
                </td>
                <td className="tabular px-4 py-2.5 text-right font-mono text-ink-muted">
                  {formatNumber(parameter.maximum_value, digits)}
                </td>
                <td className="tabular px-4 py-2.5 text-right font-mono text-ink">
                  {formatSigned(parameter.deviation, digits)}
                </td>
                <td className="px-4 py-2.5">
                  <StatusPill status={parameter.status} label={parameter.status_label} />
                </td>
                <td className="px-4 py-2.5 text-xs text-ink-muted">
                  {formatClock(parameter.last_updated)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
