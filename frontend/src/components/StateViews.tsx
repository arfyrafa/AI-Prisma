import type { ReactNode } from 'react'

interface MessageProps {
  title: string
  description?: string
  action?: ReactNode
}

export function LoadingState({ label = 'Memuat data proses…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-8 text-sm text-ink-muted">
      <span className="h-2 w-2 animate-pulse rounded-full bg-brand-bright" aria-hidden="true" />
      {label}
    </div>
  )
}

export function EmptyState({ title, description, action }: MessageProps) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorState({ title, description, action }: MessageProps) {
  return (
    <div className="rounded border border-state-critical/30 bg-state-criticalWash px-4 py-5">
      <p className="text-sm font-semibold text-state-critical">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function AgentUnavailableState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded border border-line bg-canvas px-4 py-5">
      <p className="text-sm font-semibold text-ink">AI Agent sedang tidak tersedia</p>
      <p className="mt-1 text-sm text-ink-muted">
        Pemantauan proses, deteksi penyimpangan, dan alert tetap berjalan normal.
      </p>
      {onRetry && (
        <button type="button" className="btn-secondary mt-3" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  )
}
