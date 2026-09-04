import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStatsSeries } from '../lib/googleSheets'
import { STORES } from '../lib/stores'
import { logout } from '../lib/auth'
import StoreOverviewCard from '../components/dashboard/StoreOverviewCard'
import AlertBanner from '../components/dashboard/AlertBanner'
import ProgressChart from '../components/dashboard/ProgressChart'
import ExportPdfButton from '../components/dashboard/ExportPdfButton'

export default function Dashboard() {
  const [state, setState] = useState({ series: null, source: null, lastUpdated: null })
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [metric, setMetric] = useState('scans')
  const navigate = useNavigate()
  const exportRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    fetchStatsSeries().then((result) => {
      if (!cancelled) {
        setState(result)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  function handleLogout() {
    logout()
    navigate('/dashboard/login', { replace: true })
  }

  if (loading || !state.series) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paroty-50">
        <p className="text-paroty-500">Chargement du tableau de bord…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paroty-50">
      <div className="border-b border-paroty-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl text-paroty-900">Tableau de bord — Maison Paroty</p>
            <p className="text-xs text-paroty-500">
              {state.source === 'sheet' ? 'Source : Google Sheets' : 'Source : données de démonstration'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportPdfButton targetRef={exportRef} />
            <button
              onClick={handleLogout}
              className="rounded-full border border-paroty-300 px-4 py-2 text-sm font-medium text-paroty-700 hover:border-paroty-500 hover:text-paroty-900"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <main ref={exportRef} className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
        <AlertBanner stores={STORES} series={state.series} />

        <section>
          <h2 className="font-display text-xl text-paroty-900 mb-4">Vue d'ensemble des 3 magasins</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STORES.map((store) => (
              <StoreOverviewCard key={store.id} store={store} points={state.series[store.id] || []} />
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl text-paroty-900">Progression</h2>
            <div className="flex flex-wrap gap-2">
              <ToggleGroup
                value={metric}
                onChange={setMetric}
                options={[
                  { value: 'scans', label: 'Scans' },
                  { value: 'signups', label: 'Inscriptions' },
                ]}
              />
              <ToggleGroup
                value={days}
                onChange={setDays}
                options={[
                  { value: 7, label: '7 jours' },
                  { value: 30, label: '30 jours' },
                ]}
              />
            </div>
          </div>
          <ProgressChart series={state.series} days={days} metric={metric} />
        </section>
      </main>
    </div>
  )
}

function ToggleGroup({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-full border border-paroty-200 bg-white p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value ? 'bg-paroty-800 text-paroty-50' : 'text-paroty-600 hover:text-paroty-900'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
