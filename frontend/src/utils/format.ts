import type { ParameterStatus, Severity } from '../types'

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatSigned(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const formatted = formatNumber(Math.abs(value), digits)
  if (value > 0) return `+${formatted}`
  if (value < 0) return `−${formatted}`
  return formatted
}

export function formatClock(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return 'belum ada data'
  const date = typeof value === 'string' ? new Date(value) : value
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (seconds < 10) return 'baru saja'
  if (seconds < 60) return `${seconds} detik lalu`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  return `${Math.round(hours / 24)} hari lalu`
}

interface StatusStyle {
  label: string
  text: string
  bg: string
  border: string
  dot: string
  /** Text/character marker so status never depends on colour alone. */
  marker: string
}

export const STATUS_STYLES: Record<ParameterStatus, StatusStyle> = {
  normal: {
    label: 'Normal',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    marker: '✓',
  },
  warning: {
    label: 'Peringatan',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    marker: '▲',
  },
  critical: {
    label: 'Kritis',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    marker: '■',
  },
  no_data: {
    label: 'Tidak ada data',
    text: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    marker: '–',
  },
}

export const SEVERITY_TO_STATUS: Record<Severity, ParameterStatus> = {
  INFO: 'normal',
  WARNING: 'warning',
  CRITICAL: 'critical',
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  INFO: 'Informasi',
  WARNING: 'Peringatan',
  CRITICAL: 'Kritis',
}

export const ALERT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  acknowledged: 'Diakui',
  resolved: 'Selesai',
}

export const RECOMMENDATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu verifikasi',
  verified: 'Diterima engineer',
  rejected: 'Ditolak engineer',
  needs_analysis: 'Perlu analisis lanjutan',
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  alert_created: 'Alert dibuat',
  alert_resolved: 'Alert selesai',
  alert_acknowledged: 'Alert diakui',
  ai_analysis_requested: 'Analisis AI diminta',
  ai_insight_generated: 'Insight AI dihasilkan',
  ai_chat_message: 'Pertanyaan ke AI Assistant',
  recommendation_generated: 'Rekomendasi dihasilkan',
  engineer_verification: 'Verifikasi engineer',
  prediction_generated: 'Prediksi dihasilkan',
  configuration_changed: 'Konfigurasi diubah',
}

export const PARAMETER_UNIT_HINT: Record<string, string> = {
  clo2_concentration: 'g/L',
  naclo3_feed_m3h: 'm³/h',
  naclo3_feed: 'm³/h',
  naclo3_concentration_gpl: 'g/L',
  naclo3_concentration: 'g/L',
  nacl_concentration_gpl: 'g/L',
  nacl_concentration: 'g/L',
  hcl_feed_m3h: 'm³/h',
  hcl_feed: 'm³/h',
  hcl_concentration_pct: '%',
  hcl_concentration: '%',
  generator_temperature_c: '°C',
  generator_temperature: '°C',
  absorber_water_temperature_c: '°C',
  absorber_water_temperature: '°C',
  absorber_water_rate_m3h: 'm³/h',
  absorber_water_rate: 'm³/h',
  temperature: '°C',
  pressure: 'kPa',
  flow_rate: 'm³/h',
}

export function decimalsFor(parameter: string): number {
  if (parameter === 'orp') return 0
  if (parameter === 'so2_dosage') return 3
  if (parameter === 'production_capacity' || parameter === 'reaction_efficiency') return 1
  return 2
}
