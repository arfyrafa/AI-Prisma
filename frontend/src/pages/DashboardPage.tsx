import {
  ChevronDown,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  PlusCircle,
  Printer,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DeviationPanel } from '../components/DeviationPanel'
import { InsightCard } from '../components/InsightCard'
import { KpiCard } from '../components/KpiCard'
import { ManualShiftEntryModal } from '../components/ManualShiftEntryModal'
import { Panel } from '../components/Panel'
import { PipelineStrip, type PipelineStage } from '../components/PipelineStrip'
import { RecommendationCard } from '../components/RecommendationCard'
import { StatusPill } from '../components/StatusPill'
import { TimeRangeSelector } from '../components/TimeRangeSelector'
import { TrendChart } from '../components/TrendChart'
import { AgentUnavailableState, EmptyState, ErrorState, LoadingState } from '../components/StateViews'
import { useAsync } from '../hooks/useAsync'
import { useProcessContext } from '../hooks/useProcessContext'
import { api, isAgentUnavailable } from '../services/api'
import type { Recommendation, TimeRange } from '../types'
import {
  exportAllShiftDataToCSV,
  exportHistoryToCSV,
  exportParametersToCSV,
  printProcessReport,
} from '../utils/exportReport'
import { formatDateTime, formatNumber, formatRelative } from '../utils/format'

const PRIMARY_PARAMETER = 'clo2_concentration'

export function DashboardPage() {
  const { processId, snapshot, loading, error, refresh } = useProcessContext()
  const [range, setRange] = useState<TimeRange>('7d')
  const [manualEntryOpen, setManualEntryOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [agentDown, setAgentDown] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const history = useAsync(() => api.getHistory(processId, range, [PRIMARY_PARAMETER]), [processId, range])
  const deviations = useAsync(() => api.getDeviations(processId), [processId, snapshot?.reading?.id])
  const parameters = useAsync(() => api.getParameters(processId), [processId])
  const insights = useAsync(() => api.listInsights(processId, 1), [processId])
  const recommendations = useAsync(() => api.listRecommendations(processId, undefined, 3), [processId])
  const prediction = useAsync(async () => {
    const rows = await api.listPredictions(processId, PRIMARY_PARAMETER, 1)
    return rows[0] ?? null
  }, [processId])

  useEffect(() => {
    const handleUpdate = () => {
      void history.reload(true)
      void deviations.reload(true)
      void parameters.reload(true)
      void insights.reload(true)
      void recommendations.reload(true)
      void prediction.reload(true)
    }
    window.addEventListener('prisma:reading-updated', handleUpdate)
    return () => window.removeEventListener('prisma:reading-updated', handleUpdate)
  }, [history, deviations, parameters, insights, recommendations, prediction])

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

  // Filter and deduplicate snapshot parameters to ONLY include the 8 elements + Target, EXACTLY once
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

  const modelParameters = dedupeParameters(snapshot?.parameters ?? [])
  const primary = modelParameters.find((p) => p.parameter_name === PRIMARY_PARAMETER)
  const others = modelParameters.filter((p) => p.parameter_name !== PRIMARY_PARAMETER)
  const reference = parameters.data?.find((p) => p.parameter_name === PRIMARY_PARAMETER) ?? null
  const latestInsight = insights.data?.[0] ?? null
  const pendingRecommendations = (recommendations.data ?? []).filter((r) => r.status === 'pending')
  const stages: PipelineStage[] = useMemo(() => {
    const hasReading = Boolean(snapshot?.reading)
    const deviationCount = deviations.data?.length ?? 0
    const verified = (recommendations.data ?? []).some((r) => r.status !== 'pending')
    return [
      {
        key: 'data',
        label: 'Data',
        detail: hasReading ? `Pembaruan ${formatRelative(snapshot?.reading?.timestamp)}` : 'Menunggu data',
        state: hasReading ? 'done' : 'idle',
      },
      {
        key: 'validasi',
        label: 'Validasi',
        detail: hasReading
          ? `${others.length || 8} parameter tervalidasi`
          : 'Belum ada pembacaan',
        state: hasReading ? 'done' : 'idle',
      },
      {
        key: 'prediksi',
        label: 'Prediksi',
        detail: prediction.data
          ? `${formatNumber(prediction.data.predicted_value, 2)} ${prediction.data.unit}`
          : 'Belum dijalankan',
        state: prediction.data ? 'done' : 'idle',
      },
      {
        key: 'insight',
        label: 'Insight',
        detail: latestInsight ? formatRelative(latestInsight.timestamp) : 'Belum ada analisis',
        state: latestInsight ? 'done' : deviationCount > 0 ? 'active' : 'idle',
      },
      {
        key: 'rekomendasi',
        label: 'Rekomendasi',
        detail: pendingRecommendations.length
          ? `${pendingRecommendations.length} menunggu verifikasi`
          : (recommendations.data?.length ?? 0) > 0
            ? 'Sudah diverifikasi'
            : 'Belum ada rekomendasi',
        state: pendingRecommendations.length ? 'active' : recommendations.data?.length ? 'done' : 'idle',
      },
      {
        key: 'keputusan',
        label: 'Keputusan Engineer',
        detail: pendingRecommendations.length
          ? 'Menunggu keputusan Anda'
          : verified
            ? 'Keputusan tercatat'
            : 'Belum diperlukan',
        state: pendingRecommendations.length ? 'active' : verified ? 'done' : 'idle',
      },
    ]
  }, [snapshot, deviations.data, prediction.data, latestInsight, recommendations.data, pendingRecommendations.length])

  const runAnalysis = async () => {
    setAnalyzing(true)
    setAgentDown(false)
    setAnalysisError(null)
    try {
      await api.analyze(processId)
      await Promise.all([insights.reload(), recommendations.reload()])
    } catch (err) {
      if (isAgentUnavailable(err)) setAgentDown(true)
      else setAnalysisError(err instanceof Error ? err.message : 'Analisis gagal dijalankan.')
    } finally {
      setAnalyzing(false)
    }
  }

  const verify = async (
    recommendation: Recommendation,
    payload: { decision: string; notes: string; reviewed: boolean },
  ) => {
    await api.verifyRecommendation(recommendation.id, {
      decision: payload.decision,
      notes: payload.notes,
      verified_by: 'engineer',
      reviewed: payload.reviewed,
    })
    await recommendations.reload()
  }

  if (loading && !snapshot) return <LoadingState />

  if (error && !snapshot) {
    return (
      <ErrorState
        title="Tidak dapat mengambil data proses"
        description={error}
        action={
          <button type="button" className="btn-secondary" onClick={() => void refresh()}>
            Coba lagi
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Hero Branding Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-5 sm:p-6 text-white shadow-xl border border-slate-800/80">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/assets/img/logo only prisma.png"
                alt="PRISMA AI Icon"
                className="h-10 sm:h-12 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(56,189,248,0.4)] transition-transform hover:scale-105"
              />
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-wider text-white">
                  PRISMA
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-sky-400 bg-sky-500/20 border border-sky-400/30 px-2 py-0.5 rounded-lg shadow-inner">
                  AI
                </span>
              </div>
            </div>
            <div className="hidden lg:block border-l border-slate-700/60 pl-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">Industrial AI Decision Support</h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">Pemantauan &amp; Prediksi Realtime Produksi ClO₂</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
            <StatusPill
              status={snapshot?.overall_status ?? 'no_data'}
              label={`Kondisi: ${snapshot?.overall_status === 'normal'
                ? 'Normal'
                : snapshot?.overall_status === 'warning'
                  ? 'Peringatan'
                  : snapshot?.overall_status === 'critical'
                    ? 'Kritis'
                    : 'Tidak ada data'
                }`}
              size="md"
            />
            <span className="text-xs font-mono text-slate-400 hidden xl:inline">
              {formatDateTime(snapshot?.reading?.timestamp)}
            </span>

            {/* Input & Export Actions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setManualEntryOpen(true)}
                title="Input Data Shift Logsheet Baru"
                className="btn bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 border border-sky-400/40 shadow-sm px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>+ Input Data Shift</span>
              </button>

              {/* EXPORT DROPDOWN MENU */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportMenuOpen((prev) => !prev)}
                  title="Opsi Download Data CSV"
                  className="btn bg-white/10 text-white hover:bg-white/20 border border-white/20 shadow-sm backdrop-blur-sm px-2.5 py-1.5 text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5 text-sky-300" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <ChevronDown className="h-3 w-3 text-slate-300 ml-0.5" />
                </button>

                {exportMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setExportMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md text-left animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-2.5 py-1.5 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Pilih Data yang Diexport
                      </div>

                      {/* Opsi 1: Snapshot Parameter Hari Ini */}
                      <button
                        type="button"
                        onClick={() => {
                          setExportMenuOpen(false)
                          exportParametersToCSV(
                            snapshot?.parameters ?? [],
                            snapshot?.process.name,
                            snapshot?.reading?.timestamp,
                          )
                        }}
                        className="w-full rounded-lg p-2 text-left hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 group"
                      >
                        <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 mt-0.5">
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">Data Hari Ini (Snapshot)</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">9 parameter proses, deviasi &amp; status operasional terkini.</div>
                        </div>
                      </button>

                      {/* Opsi 2: Semua Data Shift Pabrik (297 Baris untuk Manager) */}
                      <button
                        type="button"
                        onClick={() => {
                          setExportMenuOpen(false)
                          void exportAllShiftDataToCSV(snapshot?.process.name)
                        }}
                        className="w-full rounded-lg p-2 text-left hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 group border-t border-slate-800/60"
                      >
                        <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 mt-0.5">
                          <Database className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                            Semua Data Shift Pabrik
                            <span className="rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5">297 Shift</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Database lengkap riwayat 99 hari shift industri ClO₂ (CSV Manager).</div>
                        </div>
                      </button>

                      {/* Opsi 3: Riwayat Time-Series Sensor 7 Hari */}
                      {history.data?.points && history.data.points.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setExportMenuOpen(false)
                            exportHistoryToCSV(history.data!.points, snapshot?.process.name)
                          }}
                          className="w-full rounded-lg p-2 text-left hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 group border-t border-slate-800/60"
                        >
                          <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 mt-0.5">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-purple-300">Riwayat Telemetri Sensor</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Data time-series DCS {history.data.points.length} titik rekaman.</div>
                          </div>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  printProcessReport(
                    snapshot?.process.name,
                    snapshot?.reading?.timestamp,
                    snapshot?.parameters ?? [],
                    snapshot?.overall_status ?? 'normal',
                  )
                }
                title="Cetak Laporan Formal (PDF)"
                className="btn bg-white/10 text-white hover:bg-white/20 border border-white/20 shadow-sm backdrop-blur-sm px-2.5 py-1.5 text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Cetak Laporan</span>
              </button>
            </div>

            <button
              type="button"
              className="btn bg-sky-600/80 text-white hover:bg-sky-600 border border-sky-500/50 shadow-sm backdrop-blur-sm px-3 py-1.5 inline-flex items-center gap-1.5 font-semibold"
              onClick={() => void refresh()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Muat ulang</span>
            </button>
          </div>
        </div>
      </div>

      <PipelineStrip stages={stages} />

      {/* 2. Critical deviations first — never hidden behind navigation */}
      <Panel
        eyebrow="Deteksi penyimpangan"
        title="Penyimpangan aktif"
        action={
          <span className="text-[11px] font-semibold text-slate-400">Evaluasi Telemetri DCS</span>
        }
      >
        {deviations.loading && !deviations.data ? (
          <LoadingState label="Mengevaluasi parameter…" />
        ) : (
          <DeviationPanel deviations={deviations.data ?? []} />
        )}
      </Panel>

      {/* 3. Key values (8 Model Elements + Primary Target) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {primary && <KpiCard snapshot={primary} emphasis />}
        {others.map((parameter) => (
          <KpiCard key={parameter.parameter_name} snapshot={parameter} />
        ))}
      </div>

      {/* 4. Trend */}
      <Panel
        eyebrow="Tren proses"
        title={reference?.display_name ?? 'Konsentrasi ClO₂'}
        action={<TimeRangeSelector value={range} onChange={setRange} />}
        bodyClassName="p-2"
      >
        {history.loading && !history.data ? (
          <LoadingState label="Memuat riwayat proses…" />
        ) : history.error ? (
          <ErrorState title="Riwayat tidak dapat dimuat" description={history.error} />
        ) : (history.data?.points.length ?? 0) === 0 ? (
          <EmptyState
            title="Belum ada data pada rentang ini"
            description="Pilih rentang waktu lain atau tunggu pembacaan berikutnya."
          />
        ) : (
          <TrendChart
            points={history.data!.points}
            series={[
              { parameter: PRIMARY_PARAMETER, label: reference?.display_name ?? 'ClO₂', color: '#1B4F91' },
            ]}
            reference={reference}
          />
        )}
      </Panel>

      {/* 5. Prediction, insight, recommendation */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          eyebrow="Prediksi"
          title="Hasil model prediktif"
          action={
            <Link to="/predictions" className="text-xs font-medium text-brand hover:underline">
              Detail
            </Link>
          }
        >
          {prediction.data ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="eyebrow">Aktual</p>
                  <p className="tabular mt-1 font-mono text-2xl font-semibold text-ink">
                    {formatNumber(prediction.data.actual_value, 2)}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Prediksi</p>
                  <p className="tabular mt-1 font-mono text-2xl font-semibold text-[#7B4FBF]">
                    {formatNumber(prediction.data.predicted_value, 2)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-ink-muted">
                Horizon {prediction.data.prediction_horizon} menit · {prediction.data.model_name}
              </p>
            </div>
          ) : (
            <EmptyState
              title="Belum ada prediksi"
              description="Jalankan prediksi dari halaman Prediksi untuk melihat perkiraan nilai berikutnya."
              action={
                <Link to="/predictions" className="btn-secondary">
                  Buka halaman Prediksi
                </Link>
              }
            />
          )}
        </Panel>

        <Panel
          eyebrow="Analisis AI"
          title="Insight terbaru"
          className="xl:col-span-2"
          action={
            <button type="button" className="btn-primary inline-flex items-center gap-1.5" onClick={() => void runAnalysis()} disabled={analyzing}>
              <Sparkles className="h-3.5 w-3.5 text-sky-200" />
              <span>{analyzing ? 'Menganalisis…' : 'Jalankan analisis AI'}</span>
            </button>
          }
        >
          {agentDown ? (
            <AgentUnavailableState onRetry={() => void runAnalysis()} />
          ) : analysisError ? (
            <ErrorState title="Analisis gagal" description={analysisError} />
          ) : latestInsight ? (
            <InsightCard insight={latestInsight} />
          ) : (
            <EmptyState
              title="Belum ada insight"
              description="Jalankan analisis AI untuk menghasilkan penjelasan kondisi proses saat ini."
            />
          )}
        </Panel>
      </div>

      <Panel
        eyebrow="Decision support"
        title="Rekomendasi menunggu verifikasi"
        action={
          <Link to="/recommendations" className="text-xs font-medium text-brand hover:underline">
            Semua rekomendasi
          </Link>
        }
        bodyClassName="p-4 space-y-4"
      >
        {pendingRecommendations.length === 0 ? (
          <EmptyState
            title="Tidak ada rekomendasi yang menunggu"
            description="Rekomendasi muncul setelah analisis AI dijalankan pada kondisi yang menyimpang."
          />
        ) : (
          pendingRecommendations.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} onVerify={verify} />
          ))
        )}
      </Panel>

      {/* MANUAL SHIFT ENTRY MODAL */}
      <ManualShiftEntryModal
        isOpen={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        onSuccess={() => {
          void history.reload(true)
          void deviations.reload(true)
          void parameters.reload(true)
        }}
      />
    </div>
  )
}
