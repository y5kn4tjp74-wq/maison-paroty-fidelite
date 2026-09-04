import { STORES } from './stores'

// Deterministic pseudo-random so charts stay stable across re-renders.
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return hash
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Generates 30 days of daily scans/signups per store, ending today.
 * The "sud" store is given a deliberate downward trend in the last
 * 7 days so the low-attendance alert has something to catch in the demo.
 */
export function generateMockSeries(days = 30) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const series = {}

  STORES.forEach((store, storeIndex) => {
    const baseScans = 28 + storeIndex * 6
    const baseSignupRate = 0.22 + storeIndex * 0.03
    const points = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today.getTime() - i * DAY_MS)
      const seed = hashString(`${store.id}-${date.toISOString().slice(0, 10)}`)
      const noise = seededRandom(seed)
      const weekday = date.getDay()
      const weekendBoost = weekday === 0 || weekday === 6 ? 1.25 : 1

      let trendFactor = 1
      if (store.id === 'sud' && i < 7) {
        // Simulate a declining trend over the last week.
        trendFactor = 1 - (7 - i) * 0.06
      }

      const scans = Math.max(
        0,
        Math.round(baseScans * weekendBoost * trendFactor * (0.75 + noise * 0.5))
      )
      const signups = Math.max(
        0,
        Math.round(scans * (baseSignupRate + (noise - 0.5) * 0.08))
      )

      points.push({
        date: date.toISOString().slice(0, 10),
        scans,
        signups,
      })
    }

    series[store.id] = points
  })

  return series
}

export function sumSeries(points, key) {
  return points.reduce((total, p) => total + p[key], 0)
}

export function lastNDays(points, n) {
  return points.slice(-n)
}

/**
 * Compares the average of the last `window` days against the
 * `window` days before that. Returns the % change (negative = decline).
 */
export function trendChangePercent(points, window = 7) {
  if (points.length < window * 2) return 0
  const recent = points.slice(-window)
  const previous = points.slice(-window * 2, -window)
  const recentAvg = sumSeries(recent, 'scans') / window
  const previousAvg = sumSeries(previous, 'scans') / window
  if (previousAvg === 0) return 0
  return ((recentAvg - previousAvg) / previousAvg) * 100
}
