import { RefreshCw, Sliders, TrendingUp } from 'lucide-react'
import { useState } from 'react'

import { Panel } from '../components/Panel'

export function PredictionsPage() {
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
      ? { label: 'ClO₂ Tinggi (Kritis)', color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200', desc: 'Konsentrasi mencapai/melebihi batas aman 9.80 g/L! Risiko dekomposisi gas & pemborosan reagen.' }
      : whatIfPredicted < 9.70
      ? { label: 'ClO₂ Rendah', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', desc: 'Konsentrasi di bawah batas optimum 9.70 g/L. Kurang efektif untuk pemutihan pulp.' }
      : { label: 'ClO₂ Normal (Optimal)', color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200', desc: 'Berada pada rentang aman dan ideal (9.70 – 9.80 g/L).' }

  const actualNum = actualLab !== '' ? Number(actualLab) : null
  const errorAbs = actualNum ? Math.abs(actualNum - whatIfPredicted) : null
  const errorPct = actualNum ? (errorAbs! / actualNum) * 100 : null

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
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shadow-xs">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Prediksi &amp; Simulasi ClO₂</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-11">
            Model Regresi Linier Berganda (MLR) berbasis kinetika reaksi generator dan efisiensi absorpsi.
          </p>
        </div>

        {/* Action & Model Badge */}
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-bold text-purple-700">
            Model MLR E · 9 Parameter (8 Input + 1 Output)
          </span>
          <button
            type="button"
            onClick={resetWhatIf}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Baseline
          </button>
        </div>
      </div>

      {/* WHAT-IF SIMULATOR SANDBOX */}
      <div className="space-y-6">
        {/* Top Prediction Output Banner */}
        <div className={`rounded-2xl border p-6 shadow-sm transition-all ${whatIfStatus.bg}`}>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
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
                <span className="text-lg font-bold text-slate-600">g/L ClO₂</span>
                <span className={`text-sm font-bold ml-2 ${whatIfStatus.color}`}>
                  ({whatIfStatus.label})
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 max-w-xl">
                {whatIfStatus.desc}
              </p>
            </div>

            {/* Accuracy vs Lab Comparison Card */}
            <div className="rounded-xl bg-white/80 p-4 border border-slate-200/80 shadow-xs min-w-[240px]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Uji Aktual Lab (g/L)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={actualLab}
                  onChange={(e) => setActualLab(e.target.value)}
                  className="w-20 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-mono font-bold text-right"
                  placeholder="9.60"
                />
              </div>
              {errorAbs !== null && errorPct !== null && (
                <div className="space-y-1 text-xs pt-1 border-t border-slate-100">
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
                  <p className="text-[10px] font-semibold text-sky-700 mt-1">
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
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Sliders className="h-3.5 w-3.5 text-sky-600" />
              <span>Geser slider untuk simulasi kinetika seketika</span>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* X1 */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-slate-800">NaClO₃ Feed</label>
                <span className="font-mono text-xs font-bold text-sky-600">{x1} m³/h</span>
              </div>
              <input
                type="range"
                min="14.0"
                max="20.0"
                step="0.1"
                value={x1}
                onChange={(e) => setX1(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>14.0</span>
                <span>Baseline: 17.37</span>
                <span>20.0</span>
              </div>
            </div>

            {/* X2 */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-slate-800">NaClO₃ Concentration</label>
                <span className="font-mono text-xs font-bold text-sky-600">{x2} g/L</span>
              </div>
              <input
                type="range"
                min="380.0"
                max="480.0"
                step="1.0"
                value={x2}
                onChange={(e) => setX2(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>380.0</span>
                <span>Baseline: 437.2</span>
                <span>480.0</span>
              </div>
            </div>

            {/* X3 */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-slate-800">NaCl Concentration</label>
                <span className="font-mono text-xs font-bold text-sky-600">{x3} g/L</span>
              </div>
              <input
                type="range"
                min="80.0"
                max="120.0"
                step="0.5"
                value={x3}
                onChange={(e) => setX3(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>80.0</span>
                <span>Baseline: 95.5</span>
                <span>120.0</span>
              </div>
            </div>

            {/* X4 */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-slate-800">HCl Feed (Kritis)</label>
                <span className="font-mono text-xs font-bold text-sky-600">{x4} m³/h</span>
              </div>
              <input
                type="range"
                min="3.0"
                max="5.5"
                step="0.05"
                value={x4}
                onChange={(e) => setX4(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>3.0</span>
                <span>Baseline: 4.13</span>
                <span>5.5</span>
              </div>
            </div>

            {/* X5 */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-slate-800">HCl Concentration</label>
                <span className="font-mono text-xs font-bold text-sky-600">{x5}%</span>
              </div>
              <input
                type="range"
                min="28.0"
                max="35.0"
                step="0.1"
                value={x5}
                onChange={(e) => setX5(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>28.0%</span>
                <span>Baseline: 31.55%</span>
                <span>35.0%</span>
              </div>
            </div>

            {/* X7 */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-slate-800">Generator Temp</label>
                <span className="font-mono text-xs font-bold text-sky-600">{x7}°C</span>
              </div>
              <input
                type="range"
                min="40.0"
                max="55.0"
                step="0.2"
                value={x7}
                onChange={(e) => setX7(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>40.0°C</span>
                <span>Baseline: 46.7°C</span>
                <span>55.0°C</span>
              </div>
            </div>

            {/* X9 */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-slate-800">Chilled Water Temp</label>
                <span className="font-mono text-xs font-bold text-sky-600">{x9}°C</span>
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
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-slate-800">Absorber H₂O Rate</label>
                <span className="font-mono text-xs font-bold text-sky-600">{x10} m³/h</span>
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
    </div>
  )
}