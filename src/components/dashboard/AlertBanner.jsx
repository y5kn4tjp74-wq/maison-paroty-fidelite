import { trendChangePercent } from '../../lib/mockData'

const ALERT_THRESHOLD = -10

export default function AlertBanner({ stores, series }) {
  const alerts = stores
    .map((store) => ({ store, trend: trendChangePercent(series[store.id] || [], 7) }))
    .filter((a) => a.trend <= ALERT_THRESHOLD)

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        ✅ Aucune baisse de fréquentation significative détectée cette semaine.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-semibold">⚠️ Baisse de fréquentation détectée</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {alerts.map(({ store, trend }) => (
          <li key={store.id}>
            {store.name} : {trend.toFixed(1)}% sur les 7 derniers jours par rapport à la semaine précédente
          </li>
        ))}
      </ul>
    </div>
  )
}
