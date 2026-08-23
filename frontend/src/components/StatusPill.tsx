import type { ParameterStatus } from '../types'
import { STATUS_STYLES } from '../utils/format'

interface Props {
  status: ParameterStatus
  label?: string
  size?: 'sm' | 'md'
}

/** Status is never carried by colour alone: every pill has a marker and text. */
export function StatusPill({ status, label, size = 'sm' }: Props) {
  const style = STATUS_STYLES[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${style.border} ${style.bg} ${style.text} ${
        size === 'sm' ? 'px-2.5 py-0.5 text-micro' : 'px-3 py-1 text-xs'
      } font-bold uppercase tracking-[0.08em] transition-colors`}
    >
      <span aria-hidden="true">{style.marker}</span>
      {label ?? style.label}
    </span>
  )
}
