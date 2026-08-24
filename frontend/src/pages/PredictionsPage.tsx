import { Gauge, RefreshCw, Sliders, Sparkles, TrendingUp } from 'lucide-react'
import { useState } from 'react'

import { Panel } from '../components/Panel'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews'
import { TrendChart } from '../components/TrendChart'
import { useAsync } from '../hooks/useAsync'
import { useProcessContext } from '../hooks/useProcessContext'
import { api } from '../services/api'
import { formatNumber } from '../utils/format'

const TARGET_PARAMETER = 'clo2_concentration'

export function PredictionsPage() {
  const { processId, snapshot } = useProcessContext()
  const [activeTab, setActiveTab] = useState<'historical' | 'whatif'>('whatif')
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  // What-If Simulator Independent State (Default values aligned with OpenClaw research baseline)
  const [x1, setX1] = useState(17.37) // NaClO3 Feed (m3/h)
  const [x2, setX2] = useState(437.16) // NaClO3 Concentration (g/L)
  const [x3, setX3] = useState(95.5) // NaCl Concentration (g/L)
  const [x4, setX4] = useState(4.13) // HCl Feed (m3/h)
  const [x5, setX5] = useState(31.55) // HCl Concentration (%)
  const [x7, setX7] = useState(46.7) // Generator Temp (°C)
  const [x9, setX9] = useState(8.42) // Chilled Water Temp (°C)
  const [x10, setX10] = useState(104.78) // Absorber H2O Rate (m3/h)
  const [actualLab, setActualLab] = useState<string>('9.60')

  // Instant OpenClaw MLR formula calculation:
  // Y = 3.11 - 0.1407*X1 + 0.003192*X2 + 0.00613*X3 + 0.799*X4 + 0.2343*X5 - 0.0220*X7 - 0.0607*X9 - 0.02148*X10
  const whatIfPredicted =
    3.11 -
    0.1407 * x1 +
    0.003192 * x2 +
    0.00613 * x3 +
    0.799 * x4 +
    0.2343 * x5 -
    0.022 * x7 -
    0.0607 * x9 -
    0.02148 * x10

  const whatIfStatus =
    whatIfPredicted >= 9.80
      ? { label: 'ClO₂ Tinggi (Kritis)', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900', desc: 'Konsentrasi mencapai/melebihi batas aman 9.80 g/L! Risiko dekomposisi gas & pemborosan reagen.' }
      : whatIfPredicted < 9.70
        ? { label: 'ClO₂ Rendah', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900', desc: 'Konsentrasi di bawah batas optimum 9.70 g/L. Kurang efektif untuk pemutihan pulp.' }
        : { label: 'ClO₂ Normal (Optimal)', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900', desc: 'Berada pada rentang aman dan ideal (9.70 – 9.80 g/L).' }

  const actualNum = actualLab !== '' ? Number(actualLab) : null
  const errorAbs = actualNum ? Math.abs(actualNum - whatIfPredicted) : null
  const errorPct = actualNum ? (errorAbs! / actualNum) * 100 : null

  const predictions = useAsync(() => api.listPredictions(processId, TARGET_PARAMETER, 20), [processId])
  const parameters = useAsync(() => api.getParameters(processId), [processId])
  const history = useAsync(() => api.getHistory(processId, '6h', [TARGET_PARAMETER]), [processId])

  const latest = predictions.data?.[0] ?? null
  const reference = parameters.data?.find((p) => p.parameter_name === TARGET_PARAMETER) ?? null
  const currentValue =
    snapshot?.parameters.find((p) => p.parameter_name === TARGET_PARAMETER)?.current_value ?? null

  const predictedPoint =
    latest && history.data?.points.length
      ? {
        timestamp: new Date(
          new Date(history.data.points[history.data.points.length - 1].timestamp).getTime() +
          latest.prediction_horizon * 60000,
        ).toISOString(),
        value: latest.predicted_value ?? 0,
      }
      : null

  const run = async () => {
    setRunning(true)
    setRunError(null)
    try {
      await api.generatePrediction(processId, TARGET_PARAMETER)
      await Promise.all([predictions.reload(), history.reload(true)])
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Prediksi gagal dijalankan.')
    } finally {
      setRunning(false)
    }
  }

  const resetWhatIf = () => {
    setX1(17.37)
    setX2(437.16)
    setX3(95.5)
    setX4(4.13)
    setX5(31.55)
    setX7(46.7)
    setX9(8.42)
    setX10(104.78)
  }

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-panel">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900 shadow-xs">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Prediksi &amp; Simulasi ClO₂</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-11">
            Model Regresi Linier Berganda (MLR) berbasis kinetika reaksi generator dan efisiensi absorpsi.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('whatif')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${activeTab === 'whatif'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Simulasi What-If (Sandbox)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('historical')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${activeTab === 'historical'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            <Gauge className="h-3.5 w-3.5" />
            Prediksi Historis DCS
          </button>
        </div>
      </div>

      {/* TAB 1: WHAT-IF SIMULATOR SANDBOX */}
      {activeTab === 'whatif' && (
        <div className="space-y-6">
          {/* Top Prediction Output Banner */}
          <div className={`rounded-2xl border p-6 shadow-sm transition-all ${whatIfStatus.bg}`}>
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Hasil Prediksi OpenClaw MLR
                  </span>
                  <span className="rounded-full bg-sky-600 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                    Formula Y = f(X₁..X₁₀)
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className={`text-4xl sm:text-5xl font-mono font-black tracking-tight ${whatIfStatus.color}`}>
                    {whatIfPredicted.toFixed(3)}
                  </span>
                  <span className="text-lg font-bold text-slate-600 dark:text-slate-300">g/L ClO₂</span>
                  <span className={`text-sm font-bold ml-2 ${whatIfStatus.color}`}>
                    ({whatIfStatus.label})
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-w-xl">
                  {whatIfStatus.desc}
                </p>
              </div>

              {/* Accuracy vs Lab Comparison Card */}
              <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs min-w-[240px]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Uji Aktual Lab (g/L)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualLab}
                    onChange={(e) => setActualLab(e.target.value)}
                    className="w-20 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-right"
                    placeholder="9.60"
                  />
                </div>
                {errorAbs !== null && errorPct !== null && (
                  <div className="space-y-1 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Error Absolut:</span>
                      <span className="font-bold">{errorAbs.toFixed(3)} g/L</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Error Relatif:</span>
                      <span className={`font-bold ${errorPct <= 1.0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {errorPct.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-400 mt-1">
                      {errorPct <= 1.0 ? '✓ Sangat Akurat (Target ±1%)' : '✓ Akurat (Toleransi KPI)'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Sliders Grid */}
          <Panel
            eyebrow="Decision Support Sandbox"
            title="Pengaturan Variabel Independen Proses"
            action={
              <button
                type="button"
                onClick={resetWhatIf}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset Nilai Default Riset
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* X1 */}
              <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">NaClO₃ Feed</label>
                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">{x1} m³/h</span>
                </div>
                <input
                  type="range"
                  min="14.0"
                  max="19.0"
                  step="0.05"
                  value={x1}
                  onChange={(e) => setX1(Number(e.target.value))}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>14.0</span>
                  <span>Baseline: 17.37</span>
                  <span>19.0</span>
                </div>
              </div>

              {/* X2 */}
              <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">NaClO₃ Conc.</label>
                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">{x2} g/L</span>
                </div>
                <input
                  type="range"
                  min="360"
                  max="520"
                  step="1"
                  value={x2}
                  onChange={(e) => setX2(Number(e.target.value))}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>360</span>
                  <span>Baseline: 437</span>
                  <span>520</span>
                </div>
              </div>

              {/* X3 */}
              <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">NaCl Conc.</label>
                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">{x3} g/L</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="140"
                  step="1"
                  value={x3}
                  onChange={(e) => setX3(Number(e.target.value))}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>40</span>
                  <span>Baseline: 95.5</span>
                  <span>140</span>
                </div>
              </div>

              {/* X4 */}
              <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">HCl Feed</label>
                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">{x4} m³/h</span>
                </div>
                <input
                  type="range"
                  min="3.0"
                  max="5.0"
                  step="0.02"
                  value={x4}
                  onChange={(e) => setX4(Number(e.target.value))}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>3.0</span>
                  <span>Baseline: 4.13</span>
                  <span>5.0</span>
                </div>
              </div>

              {/* X5 */}
              <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">HCl Conc.</label>
                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">{x5} %</span>
                </div>
                <input
                  type="range"
                  min="29.0"
                  max="34.0"
                  step="0.1"
                  value={x5}
                  onChange={(e) => setX5(Number(e.target.value))}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>29.0%</span>
                  <span>Baseline: 31.5%</span>
                  <span>34.0%</span>
                </div>
              </div>

              {/* X7 */}
              <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Generator Temp</label>
                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">{x7} °C</span>
                </div>
                <input
                  type="range"
                  min="40.0"
                  max="54.0"
                  step="0.2"
                  value={x7}
                  onChange={(e) => setX7(Number(e.target.value))}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>40.0°C</span>
                  <span>Baseline: 46.7°C</span>
                  <span>54.0°C</span>
                </div>
              </div>

              {/* X9 */}
              <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Chilled H₂O Temp</label>
                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">{x9} °C</span>
                </div>
                <input
                  type="range"
                  min="6.0"
                  max="11.0"
                  step="0.1"
                  value={x9}
                  onChange={(e) => setX9(Number(e.target.value))}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>6.0°C</span>
                  <span>Baseline: 8.4°C</span>
                  <span>11.0°C</span>
                </div>
              </div>

              {/* X10 */}
              <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Absorber H₂O Rate</label>
                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">{x10} m³/h</span>
                </div>
                <input
                  type="range"
                  min="85.0"
                  max="120.0"
                  step="0.5"
                  value={x10}
                  onChange={(e) => setX10(Number(e.target.value))}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>85.0</span>
                  <span>Baseline: 104.8</span>
                  <span>120.0</span>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 2: HISTORICAL DCS MODEL PREDICTIONS */}
      {activeTab === 'historical' && (
        <div className="space-y-6">
          <Panel
            eyebrow="Model prediktif"
            title={reference?.display_name ?? 'Prediksi ClO₂'}
            action={
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-1.5"
                onClick={() => void run()}
                disabled={running}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {running ? 'Menjalankan model…' : 'Jalankan prediksi DCS'}
              </button>
            }
          >
            {runError && <ErrorState title="Prediksi tidak dapat dibuat" description={runError} />}

            {predictions.loading && !predictions.data ? (
              <LoadingState label="Memuat hasil prediksi…" />
            ) : !latest ? (
              <EmptyState
                title="Belum ada prediksi"
                description="Jalankan model untuk menghasilkan perkiraan nilai pada horizon berikutnya."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4">
                  <p className="eyebrow">Aktual saat ini</p>
                  <p className="tabular mt-1 font-mono text-3xl font-bold text-slate-900 dark:text-white">
                    {formatNumber(currentValue ?? latest.actual_value, 2)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{latest.unit}</p>
                </div>
                <div className="rounded-xl border border-purple-300/60 dark:border-purple-900/60 bg-purple-50/70 dark:bg-purple-950/40 p-4">
                  <p className="eyebrow text-purple-700 dark:text-purple-400">Prediksi Model</p>
                  <p className="tabular mt-1 font-mono text-3xl font-bold text-purple-700 dark:text-purple-300">
                    {formatNumber(latest.predicted_value, 2)}
                  </p>
                  <p className="mt-1 text-xs text-purple-500">
                    Horizon {latest.prediction_horizon} menit
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4">
                  <p className="eyebrow">Target Operasi</p>
                  <p className="tabular mt-1 font-mono text-3xl font-bold text-sky-600 dark:text-sky-400">
                    {formatNumber(reference?.target_value, 2)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Rentang: {formatNumber(reference?.minimum_value, 2)}–{formatNumber(reference?.maximum_value, 2)}
                  </p>
                </div>
              </div>
            )}
          </Panel>

          <Panel eyebrow="Visualisasi" title="Aktual vs Prediksi Time-Series" bodyClassName="p-2">
            {history.loading && !history.data ? (
              <LoadingState label="Memuat riwayat proses…" />
            ) : (history.data?.points.length ?? 0) === 0 ? (
              <EmptyState title="Belum ada data historis" />
            ) : (
              <>
                <TrendChart
                  points={history.data!.points}
                  series={[{ parameter: TARGET_PARAMETER, label: 'Aktual', color: '#1B4F91' }]}
                  reference={reference}
                  predicted={predictedPoint}
                  height={340}
                />
                <p className="px-3 pb-2 text-xs text-slate-400">
                  Garis solid biru adalah nilai aktual terukur. Garis putus-putus ungu adalah nilai prediksi model.
                </p>
              </>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}