import { Bot, Check, Save, Sliders, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Panel } from '../components/Panel'
import { StatusPill } from '../components/StatusPill'
import { useProcessContext } from '../hooks/useProcessContext'
import { api } from '../services/api'
import type { ParameterSnapshot } from '../types'
import { decimalsFor, formatNumber } from '../utils/format'

// AI Agent Suggested Setpoints map for intelligent optimization
const AI_SUGGESTIONS: Record<string, { target: number; min: number; max: number; reason: string }> = {
  clo2_concentration: { target: 8.5, min: 5.0, max: 9.0, reason: 'Mempertahankan stabilitas yield pemutihan pulp.' },
  temperature: { target: 15.0, min: 12.0, max: 18.0, reason: 'Menjaga kinetika reaksi eksotermik aman.' },
  pressure: { target: 9.5, min: 8.5, max: 10.5, reason: 'Menghindari kavitasi pompa dan lonjakan tekanan.' },
  ph: { target: 4.5, min: 4.0, max: 5.0, reason: 'Mengoptimalkan selektivitas pembentukan ClO₂.' },
  flow_rate: { target: 28.0, min: 25.0, max: 30.0, reason: 'Menyeimbangkan waktu tinggal dalam reaktor.' },
  so2_dosage: { target: 0.41, min: 0.35, max: 0.55, reason: 'Meminimalkan sisa SO₂ dan menghemat agen reduksi.' },
  orp: { target: 180, min: 150, max: 220, reason: 'Indikasi keseimbangan konsentrasi larutan.' },
  turbidity: { target: 0.8, min: 0.0, max: 1.5, reason: 'Menjaga kejernihan hasil reaksi tanpa endapan.' },
  production_capacity: { target: 52.0, min: 40.0, max: 60.0, reason: 'Memaksimalkan throughput pabrik per hari.' },
  reaction_efficiency: { target: 96.5, min: 90.0, max: 99.0, reason: 'Efisiensi konversi bahan baku maksimum.' },
}

export function ParameterConfigPage() {
  const { processId, snapshot, refresh } = useProcessContext()
  const parameters = snapshot?.parameters ?? []

  // Local state for editing thresholds per parameter ID
  const [edits, setEdits] = useState<
    Record<
      number,
      {
        target_value: string
        minimum_value: string
        maximum_value: string
        saving: boolean
        success: boolean
        error: string | null
      }
    >
  >({})

  // Get edit state for a parameter
  const getEditState = (p: ParameterSnapshot & { id?: number }, id: number) => {
    return (
      edits[id] ?? {
        target_value: p.target_value !== null ? String(p.target_value) : '',
        minimum_value: p.minimum_value !== null ? String(p.minimum_value) : '',
        maximum_value: p.maximum_value !== null ? String(p.maximum_value) : '',
        saving: false,
        success: false,
        error: null,
      }
    )
  }

  const handleInputChange = (id: number, field: 'target_value' | 'minimum_value' | 'maximum_value', val: string) => {
    setEdits((prev) => {
      const current = prev[id] ?? {
        target_value: '',
        minimum_value: '',
        maximum_value: '',
        saving: false,
        success: false,
        error: null,
      }
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: val,
          success: false,
          error: null,
        },
      }
    })
  }

  const handleApplyAISuggestion = (id: number, paramKey: string) => {
    const suggestion = AI_SUGGESTIONS[paramKey]
    if (!suggestion) return
    setEdits((prev) => ({
      ...prev,
      [id]: {
        target_value: String(suggestion.target),
        minimum_value: String(suggestion.min),
        maximum_value: String(suggestion.max),
        saving: false,
        success: false,
        error: null,
      },
    }))
  }

  const handleSave = async (id: number, p: ParameterSnapshot) => {
    const edit = getEditState(p, id)
    const target = edit.target_value !== '' ? Number(edit.target_value) : null
    const min = edit.minimum_value !== '' ? Number(edit.minimum_value) : null
    const max = edit.maximum_value !== '' ? Number(edit.maximum_value) : null

    if (min !== null && max !== null && min > max) {
      setEdits((prev) => ({
        ...prev,
        [id]: { ...edit, error: 'Nilai minimum tidak boleh lebih besar dari maksimum.' },
      }))
      return
    }

    setEdits((prev) => ({
      ...prev,
      [id]: { ...edit, saving: true, error: null, success: false },
    }))

    try {
      await api.updateParameter(processId, id, {
        target_value: target,
        minimum_value: min,
        maximum_value: max,
      })
      await refresh()
      setEdits((prev) => ({
        ...prev,
        [id]: { ...edit, saving: false, success: true, error: null },
      }))
      setTimeout(() => {
        setEdits((prev) => {
          const item = prev[id]
          return item ? { ...prev, [id]: { ...item, success: false } } : prev
        })
      }, 3000)
    } catch {
      setEdits((prev) => ({
        ...prev,
        [id]: { ...edit, saving: false, error: 'Gagal menyimpan perubahan ke server.' },
      }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900 shadow-xs">
                <Sliders className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Konfigurasi Batas Operasi Parameter</h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 ml-11">
              Pengaturan 8 elemen kontrol proses industri produksi ClO₂. Perubahan rentang mempengaruhi batas evaluasi alert telemetri DCS.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900 px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
              8 Parameter Terpantau
            </span>
          </div>
        </div>
      </div>

      {/* AI Agent Recommendation Banner */}
      <div className="rounded-2xl border border-sky-200/80 dark:border-sky-900/60 bg-gradient-to-r from-sky-50/90 via-indigo-50/50 to-blue-50/40 dark:from-sky-950/50 dark:via-indigo-950/30 dark:to-slate-900/50 p-5 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
            <Bot className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Saran AI Agent — Optimasi Setpoint Operasi</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-white tracking-wider shadow-xs">
                <Sparkles className="h-3 w-3" />
                AI Active
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              AI Agent menganalisis pola telemetri 24 jam terakhir dan merekomendasikan batas target presisi untuk memaksimalkan yield ClO₂ sebesar <span className="font-bold text-sky-700 dark:text-sky-400">+3.2%</span> tanpa melewati ambang batas keamanan.
            </p>
          </div>
        </div>
      </div>

      {/* 10 Control Parameters Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {parameters.map((param, index) => {
          const paramId = (param as { id?: number }).id ?? index + 1
          const digits = decimalsFor(param.parameter_name)
          const edit = getEditState(param, paramId)
          const suggestion = AI_SUGGESTIONS[param.parameter_name]

          return (
            <Panel
              key={param.parameter_name}
              eyebrow={`Elemen Kontrol #${index + 1}`}
              title={param.display_name}
              action={<StatusPill status={param.status} label={param.status_label} />}
            >
              <div className="space-y-4">
                {/* Current Telemetry Reading */}
                <div className="flex items-baseline justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pembacaan DCS</p>
                    <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {formatNumber(param.current_value, digits)}{' '}
                      <span className="text-xs font-normal text-slate-500">{param.unit}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Deviasi Target</p>
                    <p className={`text-sm font-mono font-bold mt-0.5 ${param.status === 'normal' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {formatNumber(param.deviation, digits)} {param.unit}
                    </p>
                  </div>
                </div>

                {/* Edit Form Inputs */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Min ({param.unit})</label>
                    <input
                      type="number"
                      step="any"
                      value={edit.minimum_value}
                      onChange={(e) => handleInputChange(paramId, 'minimum_value', e.target.value)}
                      className="field text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Target ({param.unit})</label>
                    <input
                      type="number"
                      step="any"
                      value={edit.target_value}
                      onChange={(e) => handleInputChange(paramId, 'target_value', e.target.value)}
                      className="field text-xs font-mono font-bold text-sky-700 dark:text-sky-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Maks ({param.unit})</label>
                    <input
                      type="number"
                      step="any"
                      value={edit.maximum_value}
                      onChange={(e) => handleInputChange(paramId, 'maximum_value', e.target.value)}
                      className="field text-xs font-mono"
                    />
                  </div>
                </div>

                {/* AI Agent Suggestion Box */}
                {suggestion && (
                  <div className="rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/40 p-3.5 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300 font-bold">
                        <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                        Saran AI Target: <strong className="font-mono text-sky-900 dark:text-sky-200">{suggestion.target} {param.unit}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyAISuggestion(paramId, param.parameter_name)}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-sky-500 transition-all shadow-xs"
                      >
                        <Sparkles className="h-3 w-3" />
                        Terapkan Saran AI
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{suggestion.reason}</p>
                  </div>
                )}

                {/* Status alerts */}
                {edit.error && (
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-2.5 rounded-xl">
                    {edit.error}
                  </p>
                )}
                {edit.success && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-2.5 rounded-xl w-full">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Batas parameter berhasil diperbarui.
                  </p>
                )}

                {/* Save action button */}
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    disabled={edit.saving}
                    onClick={() => handleSave(paramId, param)}
                    className="inline-flex items-center gap-1.5 btn-primary py-2 px-4 text-xs font-bold shadow-sm"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {edit.saving ? 'Menyimpan…' : 'Simpan Batas Parameter'}
                  </button>
                </div>
              </div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
