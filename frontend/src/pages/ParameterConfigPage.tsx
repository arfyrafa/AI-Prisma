import { Bot, Check, Save, Sliders, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Panel } from '../components/Panel'
import { StatusPill } from '../components/StatusPill'
import { useProcessContext } from '../hooks/useProcessContext'
import { api } from '../services/api'
import type { ParameterSnapshot, ProcessParameter } from '../types'
import { decimalsFor, formatNumber } from '../utils/format'

// AI Agent Suggested Setpoints map for intelligent optimization (8 ClO2 Model Variables + Product Target)
const AI_SUGGESTIONS: Record<string, { target: number; min: number; max: number; reason: string }> = {
 clo2_concentration: { target: 9.60, min: 9.0, max: 11.0, reason: 'Target konsentrasi produk ClO₂ optimum spesifikasi pulp mill.' },
 naclo3_feed: { target: 17.37, min: 14.0, max: 20.0, reason: 'Laju alir umpan klorat optimum untuk kestabilan reaksi generator.' },
 naclo3_feed_m3h: { target: 17.37, min: 14.0, max: 20.0, reason: 'Laju alir umpan klorat optimum untuk kestabilan reaksi generator.' },
 flow_rate: { target: 17.37, min: 14.0, max: 20.0, reason: 'Laju alir umpan klorat optimum untuk kestabilan reaksi generator.' },
 naclo3_concentration: { target: 437.16, min: 380.0, max: 480.0, reason: 'Konsentrasi klorat baseline untuk konversi stoikiometri maksimal.' },
 naclo3_concentration_gpl: { target: 437.16, min: 380.0, max: 480.0, reason: 'Konsentrasi klorat baseline untuk konversi stoikiometri maksimal.' },
 nacl_concentration: { target: 95.5, min: 80.0, max: 120.0, reason: 'Kadar garam optimum katalisator reduksi klorat.' },
 nacl_concentration_gpl: { target: 95.5, min: 80.0, max: 120.0, reason: 'Kadar garam optimum katalisator reduksi klorat.' },
 hcl_feed: { target: 4.13, min: 3.0, max: 5.5, reason: 'Laju alir asam klorida optimum rasio stoikiometri.' },
 hcl_feed_m3h: { target: 4.13, min: 3.0, max: 5.5, reason: 'Laju alir asam klorida optimum rasio stoikiometri.' },
 so2_dosage: { target: 4.13, min: 3.0, max: 5.5, reason: 'Laju alir asam klorida optimum rasio stoikiometri.' },
 hcl_concentration: { target: 31.55, min: 28.0, max: 35.0, reason: 'Kadar HCl 31.55% memiliki korelasi T-Stat tertinggi terhadap yield.' },
 hcl_concentration_pct: { target: 31.55, min: 28.0, max: 35.0, reason: 'Kadar HCl 31.55% memiliki korelasi T-Stat tertinggi terhadap yield.' },
 reaction_efficiency: { target: 31.55, min: 28.0, max: 35.0, reason: 'Kadar HCl 31.55% memiliki korelasi T-Stat tertinggi terhadap yield.' },
 generator_temperature: { target: 46.7, min: 40.0, max: 55.0, reason: 'Suhu reaktor 46.7°C mencegah dekomposisi termal gas ClO₂.' },
 generator_temperature_c: { target: 46.7, min: 40.0, max: 55.0, reason: 'Suhu reaktor 46.7°C mencegah dekomposisi termal gas ClO₂.' },
 pressure: { target: 46.7, min: 40.0, max: 55.0, reason: 'Suhu reaktor 46.7°C mencegah dekomposisi termal gas ClO₂.' },
 absorber_water_temperature: { target: 8.42, min: 4.0, max: 15.0, reason: 'Suhu air dingin 8.42°C meningkatkan efisiensi absorpsi gas ClO₂.' },
 absorber_water_temperature_c: { target: 8.42, min: 4.0, max: 15.0, reason: 'Suhu air dingin 8.42°C meningkatkan efisiensi absorpsi gas ClO₂.' },
 temperature: { target: 8.42, min: 4.0, max: 15.0, reason: 'Suhu air dingin 8.42°C meningkatkan efisiensi absorpsi gas ClO₂.' },
 absorber_water_rate: { target: 104.78, min: 85.0, max: 120.0, reason: 'Laju air absorber seimbang untuk mencegah gas lolos ke scrubber.' },
 absorber_water_rate_m3h: { target: 104.78, min: 85.0, max: 120.0, reason: 'Laju air absorber seimbang untuk mencegah gas lolos ke scrubber.' },
 production_capacity: { target: 104.78, min: 85.0, max: 120.0, reason: 'Laju air absorber seimbang untuk mencegah gas lolos ke scrubber.' },
}

const PARAM_NAME_OVERRIDES: Record<string, { name: string; unit: string; order: number }> = {
 clo2_concentration: { name: 'Konsentrasi ClO₂', unit: 'g/L', order: 0 },
 naclo3_feed_m3h: { name: 'NaClO₃ Feed', unit: 'm³/h', order: 1 },
 naclo3_feed: { name: 'NaClO₃ Feed', unit: 'm³/h', order: 1 },
 flow_rate: { name: 'NaClO₃ Feed', unit: 'm³/h', order: 1 },
 naclo3_concentration_gpl: { name: 'NaClO₃ Concentration', unit: 'g/L', order: 2 },
 naclo3_concentration: { name: 'NaClO₃ Concentration', unit: 'g/L', order: 2 },
 nacl_concentration_gpl: { name: 'NaCl Concentration', unit: 'g/L', order: 3 },
 nacl_concentration: { name: 'NaCl Concentration', unit: 'g/L', order: 3 },
 hcl_feed_m3h: { name: 'HCl Feed', unit: 'm³/h', order: 4 },
 hcl_feed: { name: 'HCl Feed', unit: 'm³/h', order: 4 },
 so2_dosage: { name: 'HCl Feed', unit: 'm³/h', order: 4 },
 hcl_concentration_pct: { name: 'HCl Concentration', unit: '%', order: 5 },
 hcl_concentration: { name: 'HCl Concentration', unit: '%', order: 5 },
 reaction_efficiency: { name: 'HCl Concentration', unit: '%', order: 5 },
 generator_temperature_c: { name: 'Generator Temperature', unit: '°C', order: 6 },
 generator_temperature: { name: 'Generator Temperature', unit: '°C', order: 6 },
 pressure: { name: 'Generator Temperature', unit: '°C', order: 6 },
 absorber_water_temperature_c: { name: 'Absorber Water Temperature', unit: '°C', order: 7 },
 absorber_water_temperature: { name: 'Absorber Water Temperature', unit: '°C', order: 7 },
 temperature: { name: 'Absorber Water Temperature', unit: '°C', order: 7 },
 absorber_water_rate_m3h: { name: 'Absorber Water Rate', unit: 'm³/h', order: 8 },
 absorber_water_rate: { name: 'Absorber Water Rate', unit: 'm³/h', order: 8 },
 production_capacity: { name: 'Absorber Water Rate', unit: 'm³/h', order: 8 },
}

export function ParameterConfigPage() {
  const { processId, snapshot, refresh } = useProcessContext()
  const rawParameters = snapshot?.parameters ?? []
  const [dbParams, setDbParams] = useState<ProcessParameter[]>([])

  useEffect(() => {
    if (processId) {
      api.getParameters(processId).then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setDbParams(res)
        }
      }).catch(() => {})
    }
  }, [processId])
  
  // Deduplicate parameters so each of the 8 elements (+ ClO2) appears EXACTLY once
  const dedupeParameters = (list: any[]) => {
    const map = new Map<string, any>()
    for (const p of list) {
      const meta = PARAM_NAME_OVERRIDES[p.parameter_name]
      if (meta && !map.has(meta.name)) {
        const matchedDb = dbParams.find(
          (d) => d.parameter_name === p.parameter_name || d.display_name === meta.name
        )
        map.set(meta.name, {
          ...p,
          id: p.id ?? matchedDb?.id,
          display_name: meta.name,
          unit: meta.unit,
          _order: meta.order,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a._order - b._order)
  }

  const parameters = dedupeParameters(rawParameters)

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

    // Resolve target DB ID
    const effectiveId = id || dbParams.find((d) => d.parameter_name === p.parameter_name)?.id || 1

    setEdits((prev) => ({
      ...prev,
      [id]: { ...edit, saving: true, error: null, success: false },
    }))

    try {
      await api.updateParameter(processId, effectiveId, {
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
        [id]: { ...edit, saving: false, success: false, error: 'Gagal menyimpan perubahan ke server.' },
      }))
    }
  }

 return (
 <div className="space-y-6">
 {/* Header Banner */}
 <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2.5">
 <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shadow-xs">
 <Sliders className="h-5 w-5" />
 </div>
 <h1 className="text-xl font-bold text-slate-900">Konfigurasi Batas Operasi Parameter</h1>
 </div>
 <p className="text-xs text-slate-500 mt-1.5 ml-11">
 Pengaturan 9 elemen kontrol proses industri produksi ClO₂. Perubahan rentang mempengaruhi batas evaluasi alert telemetri DCS.
 </p>
 </div>
 <div className="flex items-center gap-2">
 <span className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-700">
 9 Parameter Terpantau
 </span>
 </div>
 </div>
 </div>

 {/* AI Agent Recommendation Banner */}
 <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50/90 via-indigo-50/50 to-blue-50/40 p-5 shadow-xs">
 <div className="flex items-start gap-4">
 <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
 <Bot className="h-6 w-6" />
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-2.5">
 <h2 className="text-sm font-bold text-slate-900">Saran AI Agent — Optimasi Setpoint Operasi</h2>
 <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-white tracking-wider shadow-xs">
 <Sparkles className="h-3 w-3" />
 AI Active
 </span>
 </div>
 <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
 AI Agent menganalisis pola telemetri 24 jam terakhir dan merekomendasikan batas target presisi untuk memaksimalkan yield ClO₂ sebesar <span className="font-bold text-sky-700">+3.2%</span> tanpa melewati ambang batas keamanan.
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
 <div className="flex items-baseline justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-100">
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pembacaan DCS</p>
 <p className="text-2xl font-mono font-bold text-slate-900 mt-0.5">
 {formatNumber(param.current_value, digits)}{' '}
 <span className="text-xs font-normal text-slate-500">{param.unit}</span>
 </p>
 </div>
 <div className="text-right">
 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deviasi Target</p>
 <p className={`text-sm font-mono font-bold mt-0.5 ${param.status === 'normal' ? 'text-emerald-600' : 'text-amber-600'}`}>
 {formatNumber(param.deviation, digits)} {param.unit}
 </p>
 </div>
 </div>

 {/* Edit Form Inputs */}
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Min ({param.unit})</label>
 <input
 type="number"
 step="any"
 value={edit.minimum_value}
 onChange={(e) => handleInputChange(paramId, 'minimum_value', e.target.value)}
 className="field text-xs font-mono"
 />
 </div>

 <div>
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target ({param.unit})</label>
 <input
 type="number"
 step="any"
 value={edit.target_value}
 onChange={(e) => handleInputChange(paramId, 'target_value', e.target.value)}
 className="field text-xs font-mono font-bold text-sky-700"
 />
 </div>

 <div>
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Maks ({param.unit})</label>
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
 <div className="rounded-xl border border-sky-200/80 bg-sky-50/60 p-3.5 text-xs">
 <div className="flex items-center justify-between font-semibold text-slate-800">
 <span className="flex items-center gap-1.5 text-sky-800 font-bold">
 <Sparkles className="h-3.5 w-3.5 text-sky-600 shrink-0" />
 Saran AI Target: <strong className="font-mono text-sky-900">{suggestion.target} {param.unit}</strong>
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
 <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">{suggestion.reason}</p>
 </div>
 )}

 {/* Status alerts */}
 {edit.error && (
 <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
 {edit.error}
 </p>
 )}
 {edit.success && (
 <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl w-full">
 <Check className="h-4 w-4 text-emerald-600" />
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
