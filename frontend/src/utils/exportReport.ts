import type { ParameterSnapshot } from '../types'
import { formatDateTime, formatNumber } from './format'

export function exportParametersToCSV(
  parameters: ParameterSnapshot[],
  processName = 'Proses Produksi ClO2',
  timestamp?: string | null,
) {
  const headers = [
    'No',
    'Nama Parameter',
    'Identifier',
    'Nilai Terkini',
    'Satuan',
    'Target Operasi',
    'Batas Min',
    'Batas Maks',
    'Deviasi',
    'Status',
  ]

  const rows = parameters.map((p, idx) => [
    idx + 1,
    `"${p.display_name}"`,
    p.parameter_name,
    p.current_value !== null ? p.current_value : '',
    `"${p.unit}"`,
    p.target_value !== null ? p.target_value : '',
    p.minimum_value !== null ? p.minimum_value : '',
    p.maximum_value !== null ? p.maximum_value : '',
    p.deviation !== null ? p.deviation : '',
    p.status_label || p.status,
  ])

  const metaHeader = [
    [`# Laporan Telemetri Parameter - PRISMA AI`],
    [`# Proses: ${processName}`],
    [`# Waktu Ekstraksi: ${formatDateTime(timestamp || new Date().toISOString())}`],
    [`# Total Parameter: ${parameters.length}`],
    [],
  ]
    .map((line) => line.join(','))
    .join('\n')

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    metaHeader +
    '\n' +
    headers.join(',') +
    '\n' +
    rows.map((r) => r.join(',')).join('\n')

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `PRISMA_AI_Report_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function printProcessReport(
  processName = 'Proses Produksi ClO2',
  timestamp?: string | null,
  parameters: ParameterSnapshot[] = [],
  overallStatus = 'normal',
) {
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) {
    window.print()
    return
  }

  const rowsHtml = parameters
    .map(
      (p, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
      <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
      <td style="padding: 6px 8px; font-weight: 600;">${p.display_name}</td>
      <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; text-align: right;">${formatNumber(p.current_value)} ${p.unit}</td>
      <td style="padding: 6px 8px; font-family: monospace; text-align: center;">${p.target_value ?? '-'} ${p.unit}</td>
      <td style="padding: 6px 8px; font-family: monospace; text-align: center;">${p.minimum_value ?? '-'} - ${p.maximum_value ?? '-'}</td>
      <td style="padding: 6px 8px; font-family: monospace; text-align: right; color: ${p.status === 'normal' ? '#059669' : '#d97706'};">${formatNumber(p.deviation)}</td>
      <td style="padding: 6px 8px; text-align: center;">
        <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; background: ${
          p.status === 'normal' ? '#ecfdf5; color: #065f46;' : '#fffbeb; color: #92400e;'
        }">${p.status_label || p.status}</span>
      </td>
    </tr>
  `,
    )
    .join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Laporan Operasional PRISMA AI - ${processName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 24px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 11px; color: #64748b; margin: 2px 0 0 0; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; padding: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; padding-top: 16px; border-top: 1px solid #e2e8f0; }
          .sign-box { text-align: center; width: 180px; }
          .sign-line { margin-top: 50px; border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: bold; color: #0f172a; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">PRISMA AI · LAPORAN OPERASIONAL PROSES</h1>
            <p class="subtitle">Industrial AI Monitoring & Decision Support System</p>
          </div>
          <div style="text-align: right; font-size: 11px;">
            <div style="font-weight: bold; color: #0284c7;">STATUS: ${overallStatus.toUpperCase()}</div>
            <div style="color: #64748b;">${formatDateTime(timestamp || new Date().toISOString())}</div>
          </div>
        </div>

        <div class="meta-box">
          <div><strong>Proses:</strong> ${processName}</div>
          <div><strong>Sumber Data:</strong> Telemetri DCS Industri</div>
          <div><strong>Waktu Cetak:</strong> ${formatDateTime(new Date().toISOString())}</div>
          <div><strong>Total Parameter:</strong> ${parameters.length} Elemen Kontrol</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: center;">No</th>
              <th>Parameter Kontrol</th>
              <th style="text-align: right;">Nilai DCS</th>
              <th style="text-align: center;">Target Setpoint</th>
              <th style="text-align: center;">Rentang Aman (Min - Maks)</th>
              <th style="text-align: right;">Deviasi</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>
            <p><strong>Catatan Keamanan Operasi:</strong></p>
            <p>Laporan ini dihasilkan otomatis oleh PRISMA AI Decision Support System.</p>
            <p>Tindakan penyesuaian setpoint kimia wajib diverifikasi oleh engineer bertugas.</p>
          </div>
          <div class="sign-box">
            <div>Disetujui Oleh,</div>
            <div class="sign-line">Senior Process Engineer</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
