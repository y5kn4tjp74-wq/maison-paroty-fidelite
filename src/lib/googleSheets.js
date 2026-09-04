import { STORES } from './stores'
import { generateMockSeries } from './mockData'

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID
const SHEET_GID = import.meta.env.VITE_GOOGLE_SHEET_GID || '0'

const STORE_IDS = new Set(STORES.map((s) => s.id))

/**
 * Reads a public Google Sheet via the "gviz" JSON endpoint — no API key
 * needed, works for any sheet shared as "Anyone with the link can view".
 *
 * Expected columns (header row): date | store | scans | signups
 * - date: YYYY-MM-DD
 * - store: sud | theatre | centre
 * - scans: number
 * - signups: number
 */
async function fetchGvizRows() {
  if (!SHEET_ID) return null

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${SHEET_GID}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Google Sheets request failed: ${res.status}`)

  const text = await res.text()
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)\s*;?\s*$/)
  if (!match) throw new Error('Unexpected Google Sheets response format')

  const json = JSON.parse(match[1])
  const cols = json.table.cols.map((c) => (c.label || c.id || '').trim().toLowerCase())
  const dateIdx = cols.indexOf('date')
  const storeIdx = cols.indexOf('store')
  const scansIdx = cols.indexOf('scans')
  const signupsIdx = cols.indexOf('signups')

  if (dateIdx === -1 || storeIdx === -1 || scansIdx === -1 || signupsIdx === -1) {
    throw new Error('Sheet must have columns: date, store, scans, signups')
  }

  return json.table.rows
    .map((row) => {
      const cells = row.c
      const rawDate = cells[dateIdx]?.f || cells[dateIdx]?.v
      const store = String(cells[storeIdx]?.v || '').toLowerCase().trim()
      const scans = Number(cells[scansIdx]?.v) || 0
      const signups = Number(cells[signupsIdx]?.v) || 0
      return { date: normalizeDate(rawDate), store, scans, signups }
    })
    .filter((r) => r.date && STORE_IDS.has(r.store))
}

function normalizeDate(value) {
  if (!value) return null
  // gviz sometimes returns "Date(2026,8,3)" for date-typed cells.
  const dateCtor = /^Date\((\d+),(\d+),(\d+)\)$/.exec(value)
  if (dateCtor) {
    const [, y, m, d] = dateCtor
    return `${y}-${String(Number(m) + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function rowsToSeries(rows) {
  const series = {}
  STORES.forEach((s) => (series[s.id] = []))
  rows.forEach((r) => {
    series[r.store].push({ date: r.date, scans: r.scans, signups: r.signups })
  })
  Object.values(series).forEach((points) => points.sort((a, b) => a.date.localeCompare(b.date)))
  return series
}

/**
 * Returns { series, source, lastUpdated } where source is "sheet" when
 * live data was fetched successfully, or "mock" when falling back to
 * demo data (no sheet configured, or the request failed).
 */
export async function fetchStatsSeries() {
  try {
    const rows = await fetchGvizRows()
    if (rows && rows.length > 0) {
      return { series: rowsToSeries(rows), source: 'sheet', lastUpdated: new Date() }
    }
  } catch (err) {
    console.warn('[googleSheets] Falling back to mock data:', err.message)
  }
  return { series: generateMockSeries(30), source: 'mock', lastUpdated: new Date() }
}

export function isSheetConfigured() {
  return Boolean(SHEET_ID)
}
