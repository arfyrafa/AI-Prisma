import * as XLSX from 'xlsx'

export interface ParsedRow {
  timestamp?: string
  clo2_concentration?: number
  temperature?: number
  pressure?: number
  ph?: number
  flow_rate?: number
  so2_dosage?: number
  orp?: number
  turbidity?: number
  production_capacity?: number
  reaction_efficiency?: number
  [key: string]: unknown
}

// Map spreadsheet headers accurately to unique database column aliases:
// X1 NaClO3 Feed -> flow_rate
// X2 NaClO3 Conc -> reaction_efficiency
// X3 NaCl Conc -> orp
// X4 HCl Feed -> so2_dosage
// X5 HCl Conc -> ph
// X7 Generator Temp -> pressure
// X9 Absorber Water Temp -> temperature
// X10 Absorber Water Rate -> production_capacity
// Y ClO2 Concentration -> clo2_concentration
const COLUMN_ALIASES: Record<string, string> = {
  // 1. ClO2 Product Concentration (Y)
  actual_clo2_gpl: 'clo2_concentration',
  actual_clo2: 'clo2_concentration',
  clo2_concentration: 'clo2_concentration',
  clo2_concentration_gpl: 'clo2_concentration',
  clo2_concentration_mg_l: 'clo2_concentration',
  konsentrasi_clo2: 'clo2_concentration',
  clo2: 'clo2_concentration',
  y: 'clo2_concentration',

  // 2. NaClO3 Feed Rate (X1)
  naclo3_feed_m3h: 'flow_rate',
  naclo3_feed: 'flow_rate',
  umpan_naclo3: 'flow_rate',
  x1: 'flow_rate',
  flow_rate: 'flow_rate',

  // 3. NaClO3 Concentration (X2)
  naclo3_concentration_gpl: 'reaction_efficiency',
  naclo3_concentration: 'reaction_efficiency',
  konsentrasi_naclo3: 'reaction_efficiency',
  x2: 'reaction_efficiency',
  reaction_efficiency: 'reaction_efficiency',

  // 4. NaCl Concentration (X3)
  nacl_concentration_gpl: 'orp',
  nacl_concentration: 'orp',
  konsentrasi_nacl: 'orp',
  x3: 'orp',
  orp: 'orp',

  // 5. HCl Feed Rate (X4)
  hcl_feed_m3h: 'so2_dosage',
  hcl_feed: 'so2_dosage',
  umpan_hcl: 'so2_dosage',
  x4: 'so2_dosage',
  so2_dosage: 'so2_dosage',

  // 6. HCl Concentration % (X5)
  hcl_concentration_pct: 'ph',
  hcl_concentration: 'ph',
  konsentrasi_hcl: 'ph',
  x5: 'ph',
  ph: 'ph',

  // 7. Generator ClO2 Output Temp °C (X7)
  generator_temperature_c: 'pressure',
  generator_temperature: 'pressure',
  generator_temp: 'pressure',
  suhu_generator: 'pressure',
  x7: 'pressure',
  pressure: 'pressure',

  // 8. Absorber Chilled Water Temp °C (X9)
  absorber_water_temperature_c: 'temperature',
  absorber_water_temperature: 'temperature',
  absorber_temp: 'temperature',
  suhu_absorber: 'temperature',
  chilled_water_temp: 'temperature',
  x9: 'temperature',
  temperature: 'temperature',

  // 9. Absorber Water Rate m3/h (X10) & Production Capacity
  absorber_water_rate_m3h: 'production_capacity',
  absorber_water_rate: 'production_capacity',
  laju_air_absorber: 'production_capacity',
  x10: 'production_capacity',
  production_capacity: 'production_capacity',
  production_rate_mt_day: 'production_capacity',
  production_rate_tpd: 'production_capacity',
}

function cleanNumeric(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return isNaN(val) ? null : val

  const s = String(val).trim()
  if (s.toLowerCase().includes('contoh') || s.toLowerCase().includes('sample')) {
    return null
  }

  // Handle Indonesian comma decimals (e.g. "17,42" -> 17.42, "9,72" -> 9.72)
  let normalized = s.replace(/["']/g, '').trim()
  if (normalized.includes(',') && !normalized.includes('.')) {
    normalized = normalized.replace(',', '.')
  } else if (normalized.includes('.') && normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  }

  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

function parseTimestamp(cellVal: unknown): string {
  if (cellVal === null || cellVal === undefined || cellVal === '') {
    return new Date().toISOString()
  }

  // If Excel date serial number (e.g. 45533.7916666667)
  if (typeof cellVal === 'number' && cellVal > 30000) {
    const dateObj = new Date(Math.round((cellVal - 25569) * 86400 * 1000))
    return dateObj.toISOString()
  }

  const s = String(cellVal).trim()

  // Try parsing ISO or standard dates
  const parsed = Date.parse(s)
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString()
  }

  // Handle formats like "8/29/2026 19:00" or "29/08/2026 19:00" or "2026-08-29 19:00"
  const parts = s.split(/[\s,T]+/)
  if (parts.length >= 2) {
    const datePart = parts[0]
    const timePart = parts[1]
    const dateSegments = datePart.split(/[-/.]/)
    const timeSegments = timePart.split(':')

    if (dateSegments.length === 3) {
      let year = parseInt(dateSegments[0], 10)
      let month = parseInt(dateSegments[1], 10)
      let day = parseInt(dateSegments[2], 10)

      if (dateSegments[2].length === 4) {
        year = parseInt(dateSegments[2], 10)
        if (parseInt(dateSegments[0], 10) > 12) {
          // DD/MM/YYYY
          day = parseInt(dateSegments[0], 10)
          month = parseInt(dateSegments[1], 10)
        } else {
          // MM/DD/YYYY
          month = parseInt(dateSegments[0], 10)
          day = parseInt(dateSegments[1], 10)
        }
      }

      const hours = parseInt(timeSegments[0] || '0', 10)
      const minutes = parseInt(timeSegments[1] || '0', 10)
      const seconds = parseInt(timeSegments[2] || '0', 10)

      const dt = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))
      if (!isNaN(dt.getTime())) {
        return dt.toISOString()
      }
    }
  }

  // If only time given (e.g. "19:00")
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const now = new Date()
    const [h, m, sec] = s.split(':').map((v) => parseInt(v, 10))
    now.setHours(h || 0, m || 0, sec || 0, 0)
    return now.toISOString()
  }

  return new Date().toISOString()
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedRow[]> {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

  let rawData: unknown[][] = []

  if (isExcel) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' })
  } else {
    const text = await file.text()
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    rawData = lines.map((line) => {
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
      if (matches) {
        return matches.map((m) => m.replace(/^"|"$/g, '').trim())
      }
      return line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    })
  }

  if (rawData.length < 2) {
    throw new Error('File tidak memiliki data yang cukup (minimal 1 baris header dan 1 baris data).')
  }

  // Find header row (skips metadata/title rows)
  let headerIndex = -1
  for (let i = 0; i < Math.min(rawData.length, 15); i++) {
    const row = rawData[i].map((cell) => String(cell).toLowerCase().trim())
    if (
      row.includes('timestamp') ||
      row.includes('waktu') ||
      row.includes('time') ||
      row.some((h) => Object.keys(COLUMN_ALIASES).includes(h))
    ) {
      headerIndex = i
      break
    }
  }

  if (headerIndex === -1) {
    throw new Error(
      'Header kolom tidak terdeteksi. Pastikan file memiliki baris header seperti "timestamp", "naclo3_feed_m3h", "generator_temperature_c", dll.',
    )
  }

  const rawHeaders = rawData[headerIndex].map((cell) => String(cell).toLowerCase().trim())
  const rows: ParsedRow[] = []

  for (let i = headerIndex + 1; i < rawData.length; i++) {
    const row = rawData[i]
    if (!row || row.length === 0) continue

    const rowObj: ParsedRow = {}
    let hasValue = false

    rawHeaders.forEach((h, colIdx) => {
      const cellVal = row[colIdx]
      if (cellVal === undefined || cellVal === '') return

      if (h.includes('timestamp') || h.includes('time') || h.includes('waktu')) {
        rowObj.timestamp = parseTimestamp(cellVal)
      } else if (h.includes('note') || h.includes('catatan')) {
        // optional notes
      } else {
        const targetKey = COLUMN_ALIASES[h] || h
        const cleanNum = cleanNumeric(cellVal)
        if (cleanNum !== null) {
          rowObj[targetKey] = cleanNum
          hasValue = true
        }
      }
    })

    // Skip example row if any
    const rowStr = JSON.stringify(row).toLowerCase()
    if (rowStr.includes('contoh data') || rowStr.includes('sample data')) {
      continue
    }

    if (hasValue) {
      rows.push(rowObj)
    }
  }

  // If timestamps were missing in the spreadsheet, assign sequential logical 8-hour shift timestamps up to now
  const nowMs = Date.now()
  const total = rows.length
  rows.forEach((r, idx) => {
    if (!r.timestamp) {
      const hoursAgo = (total - 1 - idx) * 8
      r.timestamp = new Date(nowMs - hoursAgo * 3600 * 1000).toISOString()
    }
  })

  if (rows.length === 0) {
    throw new Error('Tidak ada baris data valid yang berhasil diekstrak dari spreadsheet.')
  }

  return rows
}
