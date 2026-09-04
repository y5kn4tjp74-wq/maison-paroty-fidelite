import { useEffect, useState } from 'react'
import { fetchStatsSeries } from '../lib/googleSheets'
import { sumSeries } from '../lib/mockData'
import { STORES } from '../lib/stores'

const REFRESH_MS = 60_000

export default function StatsLive() {
  const [state, setState] = useState({ series: null, source: null, lastUpdated: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const result = await fetchStatsSeries()
      if (!cancelled) {
        setState(result)
        setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const totals = STORES.reduce(
    (acc, store) => {
      const points = state.series?.[store.id] || []
      acc.scans += sumSeries(points, 'scans')
      acc.signups += sumSeries(points, 'signups')
      return acc
    },
    { scans: 0, signups: 0 }
  )

  return (
    <div className="rounded-2xl border border-paroty-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl text-paroty-900">Statistiques en direct</h2>
        <SourceBadge loading={loading} source={state.source} lastUpdated={state.lastUpdated} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile label="Scans totaux (30 jours)" value={totals.scans} loading={loading} />
        <StatTile label="Inscriptions totales (30 jours)" value={totals.signups} loading={loading} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STORES.map((store) => {
          const points = state.series?.[store.id] || []
          const scans = sumSeries(points, 'scans')
          const signups = sumSeries(points, 'signups')
          return (
            <div key={store.id} className="rounded-xl bg-paroty-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: store.color }}>
                {store.short}
              </p>
              <p className="mt-1 text-sm text-paroty-700">{loading ? '—' : `${scans} scans`}</p>
              <p className="text-sm text-paroty-500">{loading ? '—' : `${signups} inscriptions`}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatTile({ label, value, loading }) {
  return (
    <div className="rounded-xl border border-paroty-100 bg-paroty-50/60 p-5">
      <p className="text-3xl font-display text-paroty-900">{loading ? '…' : value.toLocaleString('fr-FR')}</p>
      <p className="mt-1 text-sm text-paroty-600">{label}</p>
    </div>
  )
}

function SourceBadge({ loading, source, lastUpdated }) {
  if (loading) {
    return <span className="text-xs text-paroty-400">Chargement…</span>
  }
  const isLive = source === 'sheet'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
          isLive ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-green-500' : 'bg-amber-500'}`} />
        {isLive ? 'Données Google Sheets' : 'Données de démonstration'}
      </span>
      {lastUpdated && (
        <span className="text-paroty-400">
          maj {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}
