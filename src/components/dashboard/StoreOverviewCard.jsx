import { lastNDays, sumSeries, trendChangePercent } from '../../lib/mockData'

export default function StoreOverviewCard({ store, points }) {
  const last7 = lastNDays(points, 7)
  const scans7 = sumSeries(last7, 'scans')
  const signups7 = sumSeries(last7, 'signups')
  const trend = trendChangePercent(points, 7)
  const isDown = trend < -10

  return (
    <div className="rounded-2xl border border-paroty-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg text-paroty-900">{store.name}</p>
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: store.color }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-2xl font-display text-paroty-900">{scans7}</p>
          <p className="text-xs text-paroty-500">Scans (7j)</p>
        </div>
        <div>
          <p className="text-2xl font-display text-paroty-900">{signups7}</p>
          <p className="text-xs text-paroty-500">Inscriptions (7j)</p>
        </div>
      </div>

      <div
        className={`mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
          isDown ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}
      >
        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs semaine précédente
      </div>
    </div>
  )
}
