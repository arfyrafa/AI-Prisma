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

const COLUMN_ALIASES: Record<string, string> = {
  // ClO2 Product Concentration (Y)
  actual_clo2_gpl: 'clo2_concentration',
  clo2_concentration: 'clo2_concentration',
  clo2_concentration_gpl: 'clo2_concentration',
  clo2_concentration_mg_l: 'clo2_concentration',
  konsentrasi_clo2: 'clo2_concentration',
  clo2: 'clo2_concentration',
  y: 'clo2_concentration',

  // Temperatures
  generator_temperature_c: 'temperature',
  generator_temp: 'temperature',
  absorber_water_temperature_c: 'temperature',
  suhu: 'temperature',
  temperature: 'temperature',
  temp: 'temperature',
  x7: 'temperature',
  x9: 'temperature',

  // Flow & Feed Rates
  naclo3_feed_m3h: 'flow_rate',
  absorber_water_rate_m3h: 'flow_rate',
  laju_alir: 'flow_rate',
  flow_rate: 'flow_rate',
  flow: 'flow_rate',
  x1: 'flow_rate',
  x10: 'flow_rate',

  // Chemical Dosage & HCl Feed
  hcl_feed_m3h: 'so2_dosage',
  dosis_so2: 'so2_dosage',
  so2_dosage: 'so2_dosage',
  dosage: 'so2_dosage',
  x4: 'so2_dosage',

  // pH
  ph: 'ph',
  ph_reaktor: 'ph',

  // Pressure
  pressure: 'pressure',
  tekanan: 'pressure',
  generator_pressure_bar: 'pressure',

  // ORP & Turbidity
  orp: 'orp',
  turbidity: 'turbidity',
  turbiditas: 'turbidity',

  // Production Capacity
  production_rate_mt_day: 'production_capacity',
  production_capacity: 'production_capacity',
  kapasitas_produksi: 'production_capacity',

  // Reaction Efficiency & Concentrations
  hcl_concentration_pct: 'reaction_efficiency',
  reaction_efficiency: 'reaction_efficiency',
  efisiensi_reaksi: 'reaction_efficiency',
  naclo3_concentration_gpl: 'reaction_efficiency',
  nacl_concentration_gpl: 'reaction_efficiency',
}

function cleanNumeric(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return isNaN(val) ? null : val

  const s = String(val).trim()
  if (s.toLowerCase().includes('contoh') || s.toLowerCase().includes('sample')) {
    return null
  }

  // Handle Indonesian comma decimals (e.g. "17,420" -> 17.42, "9,72" -> 9.72)
  let normalized = s.replace(/["']/g, '').trim()
  if (normalized.includes(',') && !normalized.includes('.')) {
    normalized = normalized.replace(',', '.')
  } else if (normalized.includes('.') && normalized.includes(',')) {
    // Thousands separator dot, decimal comma (e.g. 1.234,56)
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  }

  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
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
      // Basic CSV parser handling quoted values with commas
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

  // Find header row (skips title & description rows like "PRISMA AI — Process Data Input Template")
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
        let tsStr = String(cellVal).trim()
        // If Excel date number, convert
        if (typeof cellVal === 'number' && cellVal > 30000) {
          const dateObj = new Date((cellVal - (25567 + 2)) * 86400 * 1000)
          tsStr = dateObj.toISOString()
        }
        rowObj.timestamp = tsStr
      } else if (h.includes('note') || h.includes('catatan')) {
        // skip or save note
      } else {
        const targetKey = COLUMN_ALIASES[h] || h
        const cleanNum = cleanNumeric(cellVal)
        if (cleanNum !== null) {
          rowObj[targetKey] = cleanNum
          hasValue = true
        }
      }
    })

    // Skip example row
    const rowStr = JSON.stringify(row).toLowerCase()
    if (rowStr.includes('contoh data') || rowStr.includes('sample data')) {
      continue
    }

    if (hasValue) {
      rows.push(rowObj)
    }
  }

  if (rows.length === 0) {
    throw new Error('Tidak ada baris data valid yang berhasil diekstrak dari spreadsheet.')
  }

  return rows
}
