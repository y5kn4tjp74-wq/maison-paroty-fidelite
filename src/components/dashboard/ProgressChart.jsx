import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { STORES } from '../../lib/stores'
import { lastNDays } from '../../lib/mockData'

function mergeSeriesByDate(series, days, metric) {
  const points = lastNDays(series[STORES[0].id] || [], days)
  return points.map((point, i) => {
    const row = { date: formatDate(point.date) }
    STORES.forEach((store) => {
      const storePoints = lastNDays(series[store.id] || [], days)
      row[store.id] = storePoints[i]?.[metric] ?? 0
    })
    return row
  })
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function ProgressChart({ series, days, metric }) {
  const data = mergeSeriesByDate(series, days, metric)

  return (
    <div className="rounded-2xl border border-paroty-200 bg-white p-5 shadow-sm">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6d0ae" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#96602a' }} />
          <YAxis tick={{ fontSize: 12, fill: '#96602a' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, borderColor: '#e6d0ae', fontSize: 13 }}
            labelStyle={{ color: '#2e1d13', fontWeight: 600 }}
          />
          <Legend
            formatter={(value) => STORES.find((s) => s.id === value)?.short || value}
            wrapperStyle={{ fontSize: 12 }}
          />
          {STORES.map((store) => (
            <Line
              key={store.id}
              type="monotone"
              dataKey={store.id}
              name={store.id}
              stroke={store.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
