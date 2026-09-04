import { QRCodeSVG } from 'qrcode.react'

export default function QRCodeCard({ store }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-paroty-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="rounded-xl bg-paroty-50 p-4">
        <QRCodeSVG
          value={store.scanUrl}
          size={168}
          fgColor="#2e1d13"
          bgColor="transparent"
          level="M"
          includeMargin={false}
        />
      </div>
      <div className="text-center">
        <p className="font-display text-lg text-paroty-900">{store.name}</p>
        <p className="mt-1 text-xs text-paroty-500 break-all">{store.scanUrl}</p>
      </div>
      <span
        className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
        style={{ backgroundColor: store.color }}
      >
        {store.short}
      </span>
    </div>
  )
}
