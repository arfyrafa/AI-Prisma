import { AlertTriangle, Bell, CheckCircle2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useProcessContext } from '../hooks/useProcessContext'
import { formatNumber, formatRelative } from '../utils/format'
import { StatusPill } from './StatusPill'

export function NotificationPopover() {
  const { snapshot } = useProcessContext()
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Use deviations from snapshot context if available
  const parameters = snapshot?.parameters ?? []
  const activeDeviations = parameters.filter((p) => p.status === 'warning' || p.status === 'critical')
  const count = activeDeviations.length

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell / Alert button trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
          count > 0
            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100/80 shadow-sm'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
        }`}
        aria-expanded={open}
        aria-label="Notifikasi Alert"
      >
        <Bell className={`h-3.5 w-3.5 ${count > 0 ? 'text-rose-600' : 'text-slate-500'}`} />
        <span className="hidden sm:inline">Alert</span>
        {count > 0 ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white animate-pulse">
            {count}
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-mono">0</span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <Bell className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Notifikasi &amp; Alert</h3>
              {count > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                  {count} Aktif
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {activeDeviations.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">Tidak ada alert aktif</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Seluruh parameter berada dalam rentang aman.</p>
            </div>
          ) : (
            <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
              {activeDeviations.map((param) => {
                const isCritical = param.status === 'critical'
                return (
                  <div
                    key={param.parameter_name}
                    className={`rounded-xl border p-3 text-xs transition-all ${
                      isCritical
                        ? 'border-rose-200 bg-rose-50/60 text-rose-900'
                        : 'border-amber-200 bg-amber-50/60 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <div className="flex items-center gap-2">
                        <StatusPill status={param.status} />
                        <span className="text-slate-800">{param.display_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatRelative(snapshot?.reading?.timestamp)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                      Nilai saat ini ({formatNumber(param.current_value)} {param.unit}) berada di luar rentang normal ({formatNumber(param.minimum_value)} - {formatNumber(param.maximum_value)} {param.unit}).
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1.5 border-t border-slate-200/50">
                      <span>Deviasi: {formatNumber(param.deviation)} {param.unit}</span>
                      <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-slate-700">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Perlu Penanganan
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Real-time DCS Telemetry</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-semibold text-sky-600 hover:underline"
            >
              Tutup Notifikasi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
