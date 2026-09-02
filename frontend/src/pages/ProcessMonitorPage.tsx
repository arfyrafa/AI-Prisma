import { Check, Download, FileSpreadsheet, PlusCircle, UploadCloud, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ManualShiftEntryModal } from '../components/ManualShiftEntryModal'
import { Panel } from '../components/Panel'
import { ParameterTable } from '../components/ParameterTable'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews'
import { TimeRangeSelector } from '../components/TimeRangeSelector'
import { TrendChart, type TrendSeries } from '../components/TrendChart'
import { useAsync } from '../hooks/useAsync'
import { useProcessContext } from '../hooks/useProcessContext'
import { api } from '../services/api'
import type { TimeRange } from '../types'
import { parseSpreadsheetFile, type ParsedRow } from '../utils/spreadsheetParser'

const SERIES_COLORS = ['#1B4F91', '#0E7C5A', '#B45309', '#7B4FBF', '#2E6FD0', '#C2261D', '#059669', '#D97706']

export function ProcessMonitorPage() {
 const { processId, snapshot, loading, error, refresh } = useProcessContext()
 const [range, setRange] = useState<TimeRange>('7d')
 const [selected, setSelected] = useState<string[]>(['clo2_concentration'])


 const [manualEntryOpen, setManualEntryOpen] = useState(false)


 const [uploadModalOpen, setUploadModalOpen] = useState(false)
 const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null)
 const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
 const [uploading, setUploading] = useState(false)
 const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
 const [uploadError, setUploadError] = useState<string | null>(null)

 const parameters = useAsync(() => api.getParameters(processId), [processId])
 const history = useAsync(
 () => api.getHistory(processId, range, selected),
 [processId, range, selected.join(',')],
 )

 useEffect(() => {
   const handleUpdate = () => {
     void history.reload(true)
     void parameters.reload(true)
   }
   window.addEventListener('prisma:reading-updated', handleUpdate)
   return () => window.removeEventListener('prisma:reading-updated', handleUpdate)
 }, [history, parameters])

 const toggle = (parameterName: string) => {
 setSelected((prev) => {
 if (prev.includes(parameterName)) {
 return prev.length === 1 ? prev : prev.filter((name) => name !== parameterName)
 }
 return prev.length >= 4 ? [...prev.slice(1), parameterName] : [...prev, parameterName]
 })
 }

 const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (!file) return
 setSpreadsheetFile(file)
 setUploadError(null)
 setUploadSuccess(null)

 try {
 const rows = await parseSpreadsheetFile(file)
 setParsedRows(rows)
 } catch (err) {
 setUploadError(err instanceof Error ? err.message : 'Gagal memproses file Excel / CSV.')
 setParsedRows([])
 }
 }

 const handleUploadSubmit = async () => {
 if (!parsedRows.length) return
 setUploading(true)
 setUploadError(null)
 setUploadSuccess(null)

 try {
 const res = await api.ingestBatch(processId, parsedRows as Array<Record<string, unknown>>)
 setUploadSuccess(`Berhasil mengimpor ${res.processed_count} baris data telemetri!`)
 await Promise.all([history.reload(true), refresh()])
 setTimeout(() => {
 setUploadModalOpen(false)
 setParsedRows([])
 setSpreadsheetFile(null)
 setUploadSuccess(null)
 }, 2000)
 } catch (err) {
 setUploadError(err instanceof Error ? err.message : 'Gagal mengunggah data ke server.')
 } finally {
 setUploading(false)
 }
 }

 const downloadCsvTemplate = () => {
 const header =
 'timestamp,naclo3_feed_m3h,naclo3_concentration_gpl,nacl_concentration_gpl,hcl_feed_m3h,hcl_concentration_pct,generator_temperature_c,absorber_water_temperature_c,absorber_water_rate_m3h,actual_clo2_gpl,production_rate_mt_day,operator_notes\n'
 const sample =
 '2026-08-23 10:40,17.42,437.17,95.51,4.18,31.55,46.80,8.43,104.60,9.72,25.18,Contoh logsheet\n'
 const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url
 a.download = 'PRISMA_AI_Process_Data_Template.csv'
 a.click()
 URL.revokeObjectURL(url)
 }

 // 8 Process Elements + Target Product Configuration
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

 // Deduplicate parameters so each of the 8 elements (+ ClO2) appears EXACTLY once
 const dedupeParameters = (list: any[]) => {
 const map = new Map<string, any>()
 for (const p of list) {
 const meta = PARAM_NAME_OVERRIDES[p.parameter_name]
 if (meta && !map.has(meta.name)) {
 map.set(meta.name, {
 ...p,
 display_name: meta.name,
 unit: meta.unit,
 _order: meta.order,
 })
 }
 }
 return Array.from(map.values()).sort((a, b) => a._order - b._order)
 }

 const modelParametersList = dedupeParameters(parameters.data ?? [])
 const filteredSnapshotParameters = dedupeParameters(snapshot?.parameters ?? [])

 const series: TrendSeries[] = selected.map((name, index) => {
 const meta = PARAM_NAME_OVERRIDES[name]
 const pObj = modelParametersList.find((p) => p.parameter_name === name)
 return {
 parameter: name,
 label: meta?.name ?? pObj?.display_name ?? name,
 color: SERIES_COLORS[index % SERIES_COLORS.length],
 }
 })

 const reference =
 selected.length === 1
 ? (modelParametersList.find((p) => p.parameter_name === selected[0]) ?? null)
 : null

 if (loading && !snapshot) return <LoadingState />
 if (error && !snapshot) return <ErrorState title="Tidak dapat mengambil data proses" description={error} />

 return (
 <div className="space-y-6">
      {/* Header Bar with Quick Entry & Upload Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pemantauan Telemetri DCS</h1>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi time-series 8 parameter proses kimia dan evaluasi deviasi proses real-time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setManualEntryOpen(true)}
            className="btn-primary font-bold text-xs inline-flex items-center gap-2 shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            + Input Data Shift
          </button>
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="btn-secondary font-bold text-xs inline-flex items-center gap-2 shadow-2xs"
          >
            <UploadCloud className="h-4 w-4 text-sky-600" />
            Import Excel / CSV
          </button>
        </div>
      </div>

      {/* MANUAL SHIFT ENTRY MODAL */}
      <ManualShiftEntryModal
        isOpen={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        onSuccess={() => {
          void history.reload(true)
          void parameters.reload(true)
        }}
      />

 <Panel
 eyebrow="Tren proses"
 title={
 selected.length === 1
 ? (reference?.display_name ?? 'Tren parameter')
 : `${selected.length} parameter dibandingkan`
 }
 action={<TimeRangeSelector value={range} onChange={setRange} />}
 bodyClassName="p-2"
 >
 <div className="flex flex-wrap gap-2 px-2 pb-2 pt-1">
 {modelParametersList.map((parameter) => {
 const active = selected.includes(parameter.parameter_name)
 return (
 <button
 key={parameter.id}
 type="button"
 onClick={() => toggle(parameter.parameter_name)}
 aria-pressed={active}
 className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
 active
 ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-xs'
 : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50:bg-slate-800'
 }`}
 >
 {parameter.display_name}
 </button>
 )
 })}
 </div>

 {history.loading && !history.data ? (
 <LoadingState label="Memuat riwayat proses…" />
 ) : history.error ? (
 <ErrorState title="Riwayat tidak dapat dimuat" description={history.error} />
 ) : (history.data?.points.length ?? 0) === 0 ? (
 <EmptyState
 title="Belum ada data pada rentang ini"
 description="Pilih rentang waktu lain atau impor dataset riwayat."
 />
 ) : (
 <TrendChart points={history.data!.points} series={series} reference={reference} />
 )}
 </Panel>

 <Panel eyebrow="Batas operasi" title="Status seluruh parameter">
 <ParameterTable parameters={filteredSnapshotParameters} />
 </Panel>

 {/* EXCEL / CSV IMPORT MODAL DIALOG */}
 {uploadModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
 <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <div className="flex items-center gap-2.5">
 <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
 <FileSpreadsheet className="h-5 w-5" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-slate-900">
 Import Dataset Spreadsheet (Excel .xlsx / CSV)
 </h3>
 <p className="text-[11px] text-slate-400">
 Mendukung template resmi PRISMA AI &amp; logsheet DCS
 </p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setUploadModalOpen(false)}
 className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100:bg-slate-800"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 {/* Template Download Bar */}
 <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs">
 <div className="text-slate-600">
 <span className="font-bold">Template Logsheet:</span> Format input data shift standar (.xlsx / .csv)
 </div>
 <button
 type="button"
 onClick={downloadCsvTemplate}
 className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-500 inline-flex items-center gap-1.5 shadow-xs"
 >
 <Download className="h-3.5 w-3.5" /> Unduh Template CSV
 </button>
 </div>

 {/* Drop Zone for .xlsx and .csv */}
 <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
 <input
 type="file"
 accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
 onChange={handleFileChange}
 className="hidden"
 id="spreadsheet-upload-input"
 />
 <label
 htmlFor="spreadsheet-upload-input"
 className="cursor-pointer flex flex-col items-center gap-2"
 >
 <UploadCloud className="h-9 w-9 text-emerald-600 animate-bounce" />
 <span className="text-xs font-bold text-slate-800">
 {spreadsheetFile ? spreadsheetFile.name : 'Pilih File Excel (.xlsx) / CSV atau Drag & Drop'}
 </span>
 <span className="text-[10px] text-slate-400">
 Header otomatis dikenali: naclo3_feed_m3h, generator_temperature_c, actual_clo2_gpl, dll.
 </span>
 </label>
 </div>

 {/* Parsed Rows Preview */}
 {parsedRows.length > 0 && (
 <div className="space-y-2">
 <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
 <span>Pratinjau Data: {parsedRows.length} baris siap diimpor</span>
 <span className="text-emerald-600 font-mono">Format valid</span>
 </div>
 <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-[10px]">
 <pre className="whitespace-pre-wrap">{JSON.stringify(parsedRows.slice(0, 3), null, 2)}</pre>
 {parsedRows.length > 3 && (
 <p className="text-slate-400 mt-1 text-center font-sans">
 ... dan {parsedRows.length - 3} baris lainnya
 </p>
 )}
 </div>
 </div>
 )}

 {/* Alert Status */}
 {uploadError && (
 <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
 {uploadError}
 </p>
 )}
 {uploadSuccess && (
 <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-200 inline-flex items-center gap-1.5 w-full">
 <Check className="h-4 w-4 text-emerald-600" />
 {uploadSuccess}
 </p>
 )}

 {/* Modal Actions */}
 <div className="flex justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setUploadModalOpen(false)}
 className="btn-secondary text-xs"
 >
 Batal
 </button>
 <button
 type="button"
 disabled={!parsedRows.length || uploading}
 onClick={handleUploadSubmit}
 className="btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs"
 >
 {uploading ? 'Mengimpor Data…' : `Impor ${parsedRows.length} Baris Data`}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
