import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  PlusCircle,
  RefreshCw,
  X,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useProcessContext } from '../hooks/useProcessContext'
import { api } from '../services/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface ParameterFieldDef {
  key: string
  label: string
  unit: string
  min: number
  max: number
  step: string
  icon: string
  placeholder: string
  description: string
}

const PARAMETER_FIELDS_META: ParameterFieldDef[] = [
  {
    key: 'clo2_concentration',
    label: 'Konsentrasi ClO₂',
    unit: 'g/L',
    min: 9.0,
    max: 11.0,
    step: '0.01',
    icon: '⚗️',
    placeholder: 'Contoh: 9.60',
    description: 'Target Kualitas Produk ClO₂',
  },
  {
    key: 'naclo3_feed_m3h',
    label: 'NaClO₃ Feed',
    unit: 'm³/h',
    min: 14.0,
    max: 20.0,
    step: '0.01',
    icon: '🧪',
    placeholder: 'Contoh: 17.37',
    description: 'Laju Umpan Sodium Klorat',
  },
  {
    key: 'naclo3_concentration_gpl',
    label: 'NaClO₃ Concentration',
    unit: 'g/L',
    min: 380.0,
    max: 480.0,
    step: '0.01',
    icon: '🧪',
    placeholder: 'Contoh: 437.16',
    description: 'Kadar Larutan Klorat Umpan',
  },
  {
    key: 'nacl_concentration_gpl',
    label: 'NaCl Concentration',
    unit: 'g/L',
    min: 80.0,
    max: 120.0,
    step: '0.01',
    icon: '🧂',
    placeholder: 'Contoh: 95.50',
    description: 'Kadar Garam NaCl Sisa',
  },
  {
    key: 'hcl_feed_m3h',
    label: 'HCl Feed',
    unit: 'm³/h',
    min: 3.0,
    max: 5.5,
    step: '0.01',
    icon: '🧪',
    placeholder: 'Contoh: 4.13',
    description: 'Laju Umpan Asam Klorida',
  },
  {
    key: 'hcl_concentration_pct',
    label: 'HCl Concentration',
    unit: '%',
    min: 28.0,
    max: 35.0,
    step: '0.01',
    icon: '🧪',
    placeholder: 'Contoh: 31.55',
    description: 'Konsentrasi Asam Klorida',
  },
  {
    key: 'generator_temperature_c',
    label: 'Generator Temperature',
    unit: '°C',
    min: 40.0,
    max: 55.0,
    step: '0.1',
    icon: '🌡️',
    placeholder: 'Contoh: 46.70',
    description: 'Suhu Ruang Reaksi Generator',
  },
  {
    key: 'absorber_water_temperature_c',
    label: 'Absorber Water Temperature',
    unit: '°C',
    min: 4.0,
    max: 15.0,
    step: '0.1',
    icon: '❄️',
    placeholder: 'Contoh: 8.42',
    description: 'Temperatur Air Dingin Absorber',
  },
  {
    key: 'absorber_water_rate_m3h',
    label: 'Absorber Water Rate',
    unit: 'm³/h',
    min: 85.0,
    max: 120.0,
    step: '0.1',
    icon: '💧',
    placeholder: 'Contoh: 104.78',
    description: 'Laju Alir Air Pendingin Absorber',
  },
]

function getLocalIsoString(date: Date = new Date()): string {
  const tzOffset = date.getTimezoneOffset() * 60000
  const localTime = new Date(date.getTime() - tzOffset)
  return localTime.toISOString().slice(0, 16)
}

export function ManualShiftEntryModal({ isOpen, onClose, onSuccess }: Props) {
  const { processId, snapshot, refresh } = useProcessContext()

  // Timestamp
  const [timestamp, setTimestamp] = useState<string>(() => getLocalIsoString())

  // Dynamic parameter definition synced directly with DB operating ranges
  const dynamicFields = useMemo(() => {
    const snapMap = new Map(
      (snapshot?.parameters ?? []).map((p) => [p.parameter_name, p])
    )
    return PARAMETER_FIELDS_META.map((meta) => {
      const dbParam = snapMap.get(meta.key)
      return {
        ...meta,
        label: dbParam?.display_name || meta.label,
        unit: dbParam?.unit || meta.unit,
        min: dbParam?.minimum_value !== null && dbParam?.minimum_value !== undefined ? dbParam.minimum_value : meta.min,
        max: dbParam?.maximum_value !== null && dbParam?.maximum_value !== undefined ? dbParam.maximum_value : meta.max,
        target: dbParam?.target_value !== null && dbParam?.target_value !== undefined ? dbParam.target_value : null,
      }
    })
  }, [snapshot?.parameters])

  // 9 Parameters values
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    PARAMETER_FIELDS_META.forEach((p) => {
      const currentVal = snapshot?.reading?.[p.key as keyof typeof snapshot.reading]
      initial[p.key] = currentVal !== null && currentVal !== undefined ? String(currentVal) : ''
    })
    return initial
  })

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleInputChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }))
    setErrorMsg(null)
  }

  const handleCopyLatest = () => {
    if (!snapshot?.reading) return
    const copied: Record<string, string> = {}
    dynamicFields.forEach((p) => {
      const val = snapshot.reading?.[p.key as keyof typeof snapshot.reading]
      copied[p.key] = val !== null && val !== undefined ? String(val) : ''
    })
    setValues(copied)
  }

  const handleSetShiftTime = (hours: number, minutes = 0) => {
    const now = new Date()
    now.setHours(hours, minutes, 0, 0)
    setTimestamp(getLocalIsoString(now))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const numericParams: Record<string, number | null> = {}
      let filledCount = 0

      dynamicFields.forEach((p) => {
        const raw = values[p.key]
        if (raw !== undefined && raw.trim() !== '') {
          const num = parseFloat(raw.replace(',', '.'))
          if (!isNaN(num)) {
            numericParams[p.key] = num
            filledCount += 1
          }
        }
      })

      if (filledCount === 0) {
        setErrorMsg('Harap masukkan setidaknya satu parameter operasional.')
        setSaving(false)
        return
      }

      // Submit single sensor reading
      const isoTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
      const res = await api.ingestSensor(processId || 1, numericParams, isoTimestamp, 'manual_shift_entry')

      const alertCount = res.alerts_created?.length ?? 0
      setSuccessMsg(
        `✓ Data shift berhasil disimpan! ${
          alertCount > 0 ? `(${alertCount} deviasi terdeteksi & alert dibuat)` : '(Seluruh parameter stabil)'
        }`
      )

      await refresh()
      onSuccess?.()

      setTimeout(() => {
        setSuccessMsg(null)
        onClose()
      }, 1300)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan data shift ke server.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Input Data Shift Logsheet</h3>
              <p className="text-xs text-slate-500">
                Pencatatan 9 parameter produksi ClO₂ langsung ke database
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 pr-1 space-y-4 pt-4">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>✕ {errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Time & Shift Bar */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-sky-600" />
                Waktu Pembacaan Shift
              </label>
              <button
                type="button"
                onClick={handleCopyLatest}
                className="text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-white border border-sky-200 hover:border-sky-300 rounded-lg px-2.5 py-1 inline-flex items-center gap-1 shadow-2xs transition-all"
              >
                <Copy className="h-3 w-3" /> Salin Angka Terakhir
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
              <input
                type="datetime-local"
                required
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="field text-xs font-mono font-medium"
              />

              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSetShiftTime(7, 0)}
                  className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-all"
                >
                  Shift 1 (07:00)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetShiftTime(15, 0)}
                  className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-all"
                >
                  Shift 2 (15:00)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetShiftTime(23, 0)}
                  className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-all"
                >
                  Shift 3 (23:00)
                </button>
                <button
                  type="button"
                  onClick={() => setTimestamp(getLocalIsoString())}
                  className="rounded-lg bg-sky-100 text-sky-800 border border-sky-200 px-2 py-1 text-[10px] font-extrabold hover:bg-sky-200 transition-all"
                >
                  Sekarang
                </button>
              </div>
            </div>
          </div>

          {/* 9 Parameter Grid Inputs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Activity className="h-3 w-3" /> 9 Parameter Operasional (1 ClO₂ + 8 Proses)
              </span>
              <span className="text-[10px] text-slate-400">
                Nilai normal otomatis ditandai hijau
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dynamicFields.map((param) => {
                const rawVal = values[param.key] ?? ''
                const numVal = parseFloat(rawVal.replace(',', '.'))
                const isFilled = rawVal.trim() !== '' && !isNaN(numVal)
                const isNormal = isFilled && numVal >= param.min && numVal <= param.max

                return (
                  <div
                    key={param.key}
                    className={`rounded-xl border p-3 transition-all ${
                      isFilled
                        ? isNormal
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-amber-200 bg-amber-50/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label
                        htmlFor={`input-${param.key}`}
                        className="text-xs font-bold text-slate-800 flex items-center gap-1.5"
                      >
                        <span>{param.icon}</span>
                        <span>{param.label}</span>
                      </label>
                      <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {param.min}–{param.max} {param.unit}
                      </span>
                    </div>

                    <div className="relative mt-1.5">
                      <input
                        id={`input-${param.key}`}
                        type="number"
                        step={param.step}
                        value={rawVal}
                        onChange={(e) => handleInputChange(param.key, e.target.value)}
                        placeholder={param.target !== null ? `Target: ${param.target}` : param.placeholder}
                        className={`field text-xs font-mono font-bold pr-14 ${
                          isFilled
                            ? isNormal
                              ? 'border-emerald-300 text-emerald-950 focus:border-emerald-500'
                              : 'border-amber-300 text-amber-950 focus:border-amber-500'
                            : ''
                        }`}
                      />
                      <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400 pointer-events-none">
                        {param.unit}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">{param.description}</span>
                      {isFilled && (
                        <span
                          className={`font-bold ${
                            isNormal ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {isNormal ? '● Normal' : '▲ Deviasi'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-secondary text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs inline-flex items-center gap-1.5 shadow-sm"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan Data…
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Simpan Data Shift
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
